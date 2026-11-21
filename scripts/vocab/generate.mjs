import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { generateJSON, pool } from './lib.mjs';

const WORK = '.vocab-work';
mkdirSync(WORK, { recursive: true });

const EXISTING = JSON.parse(readFileSync(`${WORK}/existing.json`, 'utf8'));
const GEN_FILE = `${WORK}/generated.jsonl`;

const TARGETS = {
  'Daily Use': 300, Academic: 220, Work: 180, Business: 160, Advanced: 220,
  Idioms: 100, 'Phrasal Verbs': 120, Travel: 110, Finance: 110, Economics: 90,
  Technology: 170, Science: 130, Health: 120, Medicine: 90, Psychology: 130,
  Education: 100, Personality: 80, Emotion: 70, Social: 110, Literature: 90,
  History: 90, Sports: 90, Philosophy: 90, Legal: 90, Politics: 90,
  Nature: 110, Environment: 80, Food: 100, Arts: 80, Music: 70,
  Fashion: 60, Communication: 60, 'Modern Slang': 50,
};

const BATCH = 100;
const CONCURRENCY = 2;
const MAX_ROUNDS = 8;

const devanagari = /[\u0900-\u097F]/;
const wordRe = /^[a-z][a-z' -]{1,28}$/;

function valid(entry, category) {
  const w = String(entry?.word || '').trim();
  const m = String(entry?.meaning || '').trim();
  const ex = String(entry?.example || '').trim();
  if (!wordRe.test(w)) return false;
  if (/\s{2,}/.test(w)) return false;
  if (!devanagari.test(m)) return false;
  if (m.length > 60) return false;
  if (ex.split(/\s+/).length < 6 || ex.split(/\s+/).length > 22) return false;
  const head = w.split(' ')[0].toLowerCase();
  if (!ex.toLowerCase().includes(head.slice(0, Math.max(3, head.length - 2)))) return false;
  if (String(entry?.category) !== category) return false;
  return true;
}

const seen = new Map();
for (const e of EXISTING) seen.set(e.word.toLowerCase().trim(), e);
let generated = [];
if (existsSync(GEN_FILE)) {
  for (const line of readFileSync(GEN_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (!seen.has(e.word.toLowerCase())) {
        seen.set(e.word.toLowerCase(), e);
        generated.push(e);
      }
    } catch {}
  }
}
console.log(`start: existing=${EXISTING.length} generated=${generated.length}`);

const genByCat = {};
for (const e of generated) genByCat[e.category] = (genByCat[e.category] || 0) + 1;

function buildPrompt(category, count, avoid) {
  return `You are a lexicographer building a vocabulary app for Hindi-speaking learners of English.
Generate ${count} NEW English words in the category "${category}".

Rules:
- Each word: a single common English word (or a 2-3 word phrasal verb ONLY for "Phrasal Verbs" category). No proper nouns, no plurals of words already present unless the base word is missing.
- "meaning": ONE short dictionary-style Hindi translation in Devanagari script (1-3 words). No explanations, no parentheses.
- "example": one natural, simple English sentence of 8-14 words that clearly uses the word.
- "category": exactly "${category}".
- Words must be genuinely useful for everyday English learners, not obscure literature terms (except in Literature/Academic/Advanced categories).
- EVERY word you return MUST NOT appear in the list of words already in the app below. This is critical: returning any word from this list is a failure.

Already used words:
${avoid.join(', ')}
Return ONLY a JSON array of ${count} objects.`;
}

async function generateBatch(category, count, avoid) {
  const data = await generateJSON(buildPrompt(category, count, avoid), { temperature: 1.1 });
  if (!Array.isArray(data)) return [];
  const out = [];
  for (const raw of data) {
    const entry = {
      word: String(raw?.word || '').trim().toLowerCase().replace(/\s+/g, ' '),
      meaning: String(raw?.meaning || '').trim(),
      example: String(raw?.example || '').trim(),
      category,
    };
    if (!valid(entry, category)) continue;
    if (seen.has(entry.word)) continue;
    seen.set(entry.word, entry);
    out.push(entry);
  }
  return out;
}

const only = process.argv.find(a => a.startsWith('--only='))?.split('=')[1];

for (let round = 1; round <= MAX_ROUNDS; round++) {
  const jobs = [];
  for (const [cat, target] of Object.entries(TARGETS)) {
    if (only && cat !== only) continue;
    const have = genByCat[cat] || 0;
    const deficit = target - have;
    if (deficit <= 0) continue;
    const batches = Math.ceil(deficit / BATCH);
    for (let i = 0; i < batches; i++) {
      const existingInCat = EXISTING.filter(e => e.category === cat).map(e => e.word);
      const avoid = [...new Set([...existingInCat, ...seen.keys()])];
      jobs.push({ cat, count: Math.min(BATCH, deficit - i * BATCH), avoid });
    }
  }
  if (!jobs.length) break;
  console.log(`round ${round}: ${jobs.length} batches`);

  let done = 0;
  await pool(jobs, CONCURRENCY, async (job) => {
    try {
      const rows = await generateBatch(job.cat, job.count, job.avoid);
      if (rows.length) {
        appendFileSync(GEN_FILE, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
        generated.push(...rows);
        genByCat[job.cat] = (genByCat[job.cat] || 0) + rows.length;
      }
      done++;
      if (done % 5 === 0 || done === jobs.length) {
        console.log(`  ${done}/${jobs.length} batches, total generated=${generated.length}`);
      }
    } catch (e) {
      console.error(`  batch failed [${job.cat}]:`, String(e?.message || e).slice(0, 140));
      done++;
    }
  });
}

const finalCats = {};
for (const e of generated) finalCats[e.category] = (finalCats[e.category] || 0) + 1;
console.log('DONE generated=', generated.length);
console.log('generatedByCat=', finalCats);
const unique = new Set([...EXISTING.map(e => e.word.toLowerCase()), ...generated.map(e => e.word.toLowerCase())]);
console.log('TOTAL UNIQUE=', unique.size);
