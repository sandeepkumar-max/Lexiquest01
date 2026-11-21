import { readFileSync, writeFileSync } from 'node:fs';
import { generateJSON, pool } from './lib.mjs';
import { Type } from '@google/genai';

const WORK = '.vocab-work';
const rows = JSON.parse(readFileSync(`${WORK}/remapped.json`, 'utf8'));
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
console.log('entries needing repair:', broken.length);

const BATCH = 40;
const batches = [];
for (let i = 0; i < broken.length; i += BATCH) batches.push(broken.slice(i, i + BATCH));

let fixed = 0;
await pool(batches, 4, async (batch) => {
  const list = batch.map(e => e.meaning ? `${e.word} = ${e.meaning}` : e.word);
  const prompt = `You are a lexicographer for a Hindi-English vocabulary app.
For each item below, provide the missing data.
- If a Hindi meaning is already given after "=", keep it EXACTLY as is.
- Otherwise give a short Hindi meaning in Devanagari (1-3 words).
- Always give one natural English example sentence of 8-14 words that uses the word.

Items:
${list.join('\n')}

Return a JSON array of objects: { "word": "...", "meaning": "...", "example": "..." } with the word exactly as given.`;
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
      if (target.meaning && target.example) fixed++;
    }
  } catch (e) {
    console.error('repair batch failed:', String(e?.message || e).slice(0, 120));
  }
});

console.log('repaired:', fixed);
const stillBad = rows.filter(e => !e.example || !e.meaning);
console.log('still missing fields:', stillBad.length);
writeFileSync(`${WORK}/core-final.json`, JSON.stringify(rows, null, 0));
