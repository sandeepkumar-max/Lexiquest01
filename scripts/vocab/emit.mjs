import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const WORK = '.vocab-work';
const CATS = new Set([
  'Daily Use', 'Academic', 'Work', 'Business', 'Advanced', 'Idioms', 'Phrasal Verbs',
  'Travel', 'Finance', 'Economics', 'Technology', 'Science', 'Health', 'Medicine',
  'Psychology', 'Education', 'Personality', 'Emotion', 'Social', 'Literature',
  'History', 'Sports', 'Philosophy', 'Legal', 'Politics', 'Nature', 'Environment',
  'Food', 'Arts', 'Music', 'Fashion', 'Communication', 'Modern Slang', 'General',
]);

const readLines = f => existsSync(f)
  ? readFileSync(f, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l))
  : [];

const coreRaw = JSON.parse(readFileSync(`${WORK}/core-final.json`, 'utf8'));
const extraRaw = [...readLines(`${WORK}/generated.jsonl`), ...readLines(`${WORK}/extra.jsonl`)];

const MAP = {
  'Scientific': 'Science', 'Mindset': 'Personality', 'Productivity': 'Work', 'Tech': 'Technology',
  'Action': 'General', 'Language': 'Communication', 'Authority': 'Politics', 'Cultural': 'Social',
  'Moral': 'Philosophy', 'Media': 'Communication', 'Personal': 'Personality', 'Professional': 'Work',
  'Art': 'Arts', 'Art/Artistic': 'Arts', 'Time': 'General', 'Process': 'Work', 'Logic': 'Philosophy',
  'Logistics': 'Business', 'Grammar': 'Education', 'Math': 'Science', 'Goal': 'General',
  'Industry': 'Business', 'Geography': 'Science', 'Construction': 'Work', 'Physics': 'Science',
  'Religion/Tech': 'Philosophy', 'Legal/Philosophy': 'Legal', 'Material': 'General',
  'Strategic': 'Business', 'Strategy': 'Business', 'Stats': 'Science', 'Chemistry': 'Science',
  'Ethics': 'Philosophy', 'Beauty': 'Arts', 'Religion': 'Philosophy', 'Experience': 'General',
  'Agriculture': 'Nature', 'Museum': 'Arts', 'Biology': 'Science', 'Space': 'Science',
  'Sociology': 'Social', 'Environment': 'Environment', 'Law': 'Legal', 'Architecture': 'Arts',
};

const seen = new Set();
const dropped = [];
function take(list) {
  const out = [];
  for (const e of list) {
    const word = String(e?.word || '').trim().replace(/\s+/g, ' ');
    const meaning = String(e?.meaning || '').trim();
    const example = String(e?.example || '').trim();
    let category = String(e?.category || 'General').trim();
    if (MAP[category]) category = MAP[category];
    if (!CATS.has(category)) category = 'General';
    if (!word || !meaning || !example) { dropped.push(word || '(empty)'); continue; }
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ word, meaning, example, category });
  }
  return out;
}

const core = take(coreRaw);
const extra = take(extraRaw);

const total = core.length + extra.length;
const catCount = {};
for (const w of [...core, ...extra]) catCount[w.category] = (catCount[w.category] || 0) + 1;

const missingHindi = [...core, ...extra].filter(w => !/[\u0900-\u097F]/.test(w.meaning));
const badExample = extra.filter(w => !w.example.toLowerCase().includes(w.word.split(' ')[0].slice(0, 4).toLowerCase()));
const unknownCat = [...core, ...extra].filter(w => !CATS.has(w.category));

const report = {
  core: core.length, extra: extra.length, total,
  dropped: dropped.length, missingHindi: missingHindi.length,
  extraBadExample: badExample.length, unknownCat: unknownCat.length,
  categories: Object.entries(catCount).sort((a, b) => b[1] - a[1]),
};
console.log(JSON.stringify(report, null, 2));

if (process.argv.includes('--report')) process.exit(0);
if (total < 10000) { console.error(`FAIL: total ${total} < 10000`); process.exit(1); }
if (missingHindi.length) { console.error('FAIL: entries missing Hindi meaning', missingHindi.slice(0, 5)); process.exit(1); }
if (unknownCat.length) { console.error('FAIL: unknown categories'); process.exit(1); }

const esc = s => JSON.stringify(s);
const line = w => `  { word: ${esc(w.word)}, meaning: ${esc(w.meaning)}, example: ${esc(w.example)}, category: ${esc(w.category)} },`;
const file = (name, list) => `export const ${name} = [\n${list.map(line).join('\n')}\n];\n`;

mkdirSync('src/lib/words', { recursive: true });
writeFileSync('src/lib/words/types.ts', `export interface LearnWord {
  word: string;
  meaning: string;
  example: string;
  category: string;
}
`);
writeFileSync('src/lib/words/core.ts', `import type { LearnWord } from './types';\n\n` + file('CORE_WORDS', core).replace('= [', ': LearnWord[] = ['));
writeFileSync('src/lib/words/extra.ts', `import type { LearnWord } from './types';\n\n` + file('EXTRA_WORDS', extra).replace('= [', ': LearnWord[] = ['));

// backup original once
if (!existsSync(`${WORK}/learnWords.orig.ts`)) {
  writeFileSync(`${WORK}/learnWords.orig.ts`, readFileSync('src/lib/learnWords.ts'));
}

writeFileSync('src/lib/learnWords.ts', `import { CORE_WORDS } from './words/core';
import { EXTRA_WORDS } from './words/extra';

export type { LearnWord } from './words/types';

export const LEARN_WORDS = [...CORE_WORDS, ...EXTRA_WORDS];
`);

console.log(`WROTE src/lib/words/core.ts (${core.length}), words/extra.ts (${extra.length}), learnWords.ts`);
