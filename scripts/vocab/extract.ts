import { writeFileSync, mkdirSync } from 'node:fs';
import { LEARN_WORDS } from '../../src/lib/learnWords';

const outDir = '.vocab-work';
mkdirSync(outDir, { recursive: true });

const clean = LEARN_WORDS.map((w: any) => ({
  word: String(w.word || '').trim(),
  meaning: String(w.meaning || '').trim(),
  example: String(w.example || '').trim(),
  category: String(w.category || 'General').trim(),
})).filter(w => w.word && w.meaning && w.example);

writeFileSync(`${outDir}/existing.json`, JSON.stringify(clean, null, 0));

const seen = new Set<string>();
let dupes = 0;
for (const w of clean) {
  const k = w.word.toLowerCase();
  if (seen.has(k)) dupes++;
  seen.add(k);
}
const byCat: Record<string, number> = {};
for (const w of clean) byCat[w.category] = (byCat[w.category] || 0) + 1;

console.log(JSON.stringify({ total: clean.length, unique: seen.size, dupes, byCat }, null, 2));
