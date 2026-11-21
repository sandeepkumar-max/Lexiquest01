import { writeFileSync } from 'node:fs';
import { LEARN_WORDS } from '../../src/lib/learnWords';

const rows = (LEARN_WORDS as any[]).map(w => ({
  word: String(w?.word || '').trim(),
  meaning: String(w?.meaning || '').trim(),
  example: String(w?.example || '').trim(),
  category: String(w?.category || 'General').trim(),
})).filter(w => w.word);

writeFileSync('.vocab-work/existing-all.json', JSON.stringify(rows, null, 0));
console.log('all entries', rows.length, 'broken', rows.filter(w => !w.meaning || !w.example).length);
