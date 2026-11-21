import { readFileSync, writeFileSync } from 'node:fs';
import { generateJSON, pool } from './lib.mjs';
import { Type } from '@google/genai';

const WORK = '.vocab-work';
const rows = JSON.parse(readFileSync(`${WORK}/existing-all.json`, 'utf8'));
const remapped = new Map(JSON.parse(readFileSync(`${WORK}/remapped.json`, 'utf8')).map(e => [e.word.toLowerCase(), e]));
for (const row of rows) {
  const fixed = remapped.get(row.word.toLowerCase());
  if (fixed) row.category = fixed.category;
}
const devanagari = /[\u0900-\u097F]/;

const schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      meaning: { type: Type.STRING },
      example: { type: Type.STRING },
    },
    required: ['word', 'meaning', 'example'],
    propertyOrdering: ['word', 'meaning', 'example'],
  },
};

const broken = rows.filter(e => !e.example || !e.meaning);
const BATCH = 40;
const batches = [];
for (let i = 0; i < broken.length; i += BATCH) batches.push(broken.slice(i, i + BATCH));
console.log('broken', broken.length, 'batches', batches.length);

let filled = 0;
await pool(batches, 3, async (batch) => {
  const list = batch.map(e => e.meaning ? `${e.word} = ${e.meaning}` : e.word);
  const prompt = `You are a lexicographer for a Hindi-English vocabulary app.
For each item below, provide the missing data.
- If a Hindi meaning is already given after "=", keep it EXACTLY as is.
- Otherwise give a short Hindi meaning in Devanagari (1-3 words).
- Always give one natural English example sentence of 8-14 words using the word.
- The example must be different for each word.

Items:
${list.join('\n')}

Return a JSON array: { "word": "...", "meaning": "...", "example": "..." } with words exactly as given.`;
  try {
    const data = await generateJSON(prompt, { schema, temperature: 0.7 });
    const byWord = new Map(batch.map(e => [e.word.toLowerCase(), e]));
    for (const row of Array.isArray(data) ? data : []) {
      const target = byWord.get(String(row?.word || '').toLowerCase().trim());
      if (!target) continue;
      const m = String(row?.meaning || '').trim();
      const ex = String(row?.example || '').trim();
      if (!target.meaning && m && devanagari.test(m)) target.meaning = m;
      if (!target.example && ex.split(/\s+/).length >= 6) target.example = ex;
      if (target.meaning && target.example) filled++;
    }
  } catch (e) {
    console.error('batch failed:', String(e?.message || e).slice(0, 100));
  }
});

const complete = rows.filter(e => e.meaning && e.example);
console.log('filled', filled, 'complete', complete.length, 'dropped', rows.length - complete.length);
writeFileSync(`${WORK}/core-final.json`, JSON.stringify(complete, null, 0));
