import { readFileSync, writeFileSync } from 'node:fs';
import { generateJSON } from './lib.mjs';
import { Type } from '@google/genai';

const WORK = '.vocab-work';
const rows = JSON.parse(readFileSync(`${WORK}/core-final.json`, 'utf8'));
const dev = /[\u0900-\u097F]/;
const targets = rows.filter(w => !dev.test(w.meaning));

const schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      meaning: { type: Type.STRING },
    },
    required: ['word', 'meaning'],
    propertyOrdering: ['word', 'meaning'],
  },
};

const prompt = `Translate each English definition below into natural Hindi written in Devanagari script.
- Keep it short and clear (idioms: translate the explanatory meaning, not word by word).
- Do not keep any English words except unavoidable technical terms.

${targets.map(w => `${w.word} => ${w.meaning}`).join('\n')}

Return a JSON array: { "word": "...", "meaning": "<Hindi>" }.`;

const data = await generateJSON(prompt, { schema, temperature: 0.4 });
const byWord = new Map(targets.map(w => [w.word.toLowerCase(), w]));
let done = 0;
for (const row of Array.isArray(data) ? data : []) {
  const target = byWord.get(String(row?.word || '').toLowerCase().trim());
  const m = String(row?.meaning || '').trim();
  if (target && dev.test(m)) { target.meaning = m; done++; }
}
console.log('translated', done, 'of', targets.length);
const still = rows.filter(w => !dev.test(w.meaning));
console.log('still english', still.length, still.slice(0, 5).map(w => w.word));
writeFileSync(`${WORK}/core-final.json`, JSON.stringify(rows, null, 0));
