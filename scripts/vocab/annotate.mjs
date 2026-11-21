import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { generateJSON, pool } from './lib.mjs';

const WORK = '.vocab-work';
const CATS = [
  'Daily Use', 'Academic', 'Work', 'Business', 'Advanced', 'Idioms', 'Phrasal Verbs',
  'Travel', 'Finance', 'Economics', 'Technology', 'Science', 'Health', 'Medicine',
  'Psychology', 'Education', 'Personality', 'Emotion', 'Social', 'Literature',
  'History', 'Sports', 'Philosophy', 'Legal', 'Politics', 'Nature', 'Environment',
  'Food', 'Arts', 'Music', 'Fashion', 'Communication', 'Modern Slang', 'General',
];

const STOP = new Set(`the of and to a in for is on that by this with i you it not or be are from at as your all have new more an was we can us about if my has but our one other do no they he up may what their news out use any there see only so his when contact here business who web also now help get pm view online first am been would how were me services some these click its like service than find price date back top people had list name just over state year day into email two health world next used go work last most know should data make system post city such well where info between both life under years days during number through being down off he she did get three before game another around must those big even because much too place did should these where why off who how still found game men home read hand high each same work water room mother area money story young fact month different lot right study book eye job word though side kind head house friend father power hour game line end member law car city community name five final following again keep already however both must yes however almost enough along might close something seem next hard open example paper group always music those both mark often together got until three children side feet car mile night walk white sea began grow took river four carry state once stop got without second later miss idea body under food sun thought young above keep last door between city tree cross since hard start might story saw far both paper hard near till head stand own page should country found answer school group young important father while family own problem hand hold become girl late use once leave life great where case woman over seem such ask work need feel three state against turn few course leave again few place why though during home small found thought went say great put end does another well large must big even such because turn here why ask went men read need land different home move try kind hand picture again change off play spell air away animal house point page letter mother answer found study still learn should America world level`.split(/\s+/));

const EXISTING = JSON.parse(readFileSync(`${WORK}/existing.json`, 'utf8'));
const GEN = existsSync(`${WORK}/generated.jsonl`)
  ? readFileSync(`${WORK}/generated.jsonl`, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  : [];
const OUT = `${WORK}/extra.jsonl`;
const ANNOTATED = existsSync(OUT)
  ? readFileSync(OUT, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  : [];

const seen = new Set([
  ...EXISTING.map(e => e.word.toLowerCase()),
  ...GEN.map(e => e.word.toLowerCase()),
  ...ANNOTATED.map(e => e.word.toLowerCase()),
]);

const candidates = JSON.parse(readFileSync(`${WORK}/candidates.json`, 'utf8'))
  .map(w => String(w).toLowerCase().trim())
  .filter(w => /^[a-z]{3,18}$/.test(w))
  .filter(w => !STOP.has(w))
  .filter(w => !seen.has(w));

const TARGET = 700;
const BATCH = 50;
console.log(`candidates=${candidates.length} annotated=${ANNOTATED.length} target=${TARGET}`);

const queue = candidates.slice(0, Math.ceil((TARGET * 1.35) / BATCH) * BATCH);
const batches = [];
for (let i = 0; i < queue.length; i += BATCH) batches.push(queue.slice(i, i + BATCH));

const devanagari = /[\u0900-\u097F]/;
const pool_ = [];
let added = ANNOTATED.length;

await pool(batches, 3, async (batch) => {
  if (added >= TARGET) return;
  const prompt = `You are a lexicographer for a Hindi-English vocabulary app.
For EACH English word below, give:
- "meaning": a short Hindi dictionary meaning in Devanagari script (1-3 words, no explanations).
- "example": one natural English sentence of 8-14 words that uses the word.
- "category": choose the single best fit from: ${CATS.join(', ')}.

Words:
${batch.join(', ')}

Return a JSON array with one object per word: { "word": "...", "meaning": "...", "example": "...", "category": "..." }.
Use the exact word spelling given above and return every word.`;
  try {
    const data = await generateJSON(prompt, { temperature: 0.8 });
    if (!Array.isArray(data)) return;
    const allowed = new Set(batch);
    const rows = [];
    for (const raw of data) {
      const word = String(raw?.word || '').trim().toLowerCase();
      const meaning = String(raw?.meaning || '').trim();
      const example = String(raw?.example || '').trim();
      let category = String(raw?.category || '').trim();
      if (!allowed.has(word) || seen.has(word)) continue;
      if (!devanagari.test(meaning) || meaning.length > 60) continue;
      const words = example.split(/\s+/);
      if (words.length < 6 || words.length > 22) continue;
      if (!example.toLowerCase().includes(word.slice(0, Math.max(3, word.length - 2)))) continue;
      if (!CATS.includes(category)) category = 'General';
      seen.add(word);
      rows.push({ word, meaning, example, category });
    }
    if (rows.length) {
      appendFileSync(OUT, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
      added += rows.length;
      pool_.push(...rows);
    }
  } catch (e) {
    console.error('annotate failed:', String(e?.message || e).slice(0, 120));
  }
});

console.log(`annotated added=${pool_.length} total=${added}`);
const unique = new Set([...EXISTING.map(e => e.word.toLowerCase()), ...GEN.map(e => e.word.toLowerCase()), ...ANNOTATED.map(e => e.word.toLowerCase()), ...pool_.map(e => e.word.toLowerCase())]);
console.log('TOTAL UNIQUE=', unique.size);
