import { readFileSync, writeFileSync } from 'node:fs';
import { generateJSON, pool, sleep } from './lib.mjs';
import { Type } from '@google/genai';

const WORK = '.vocab-work';
const existing = JSON.parse(readFileSync(`${WORK}/existing.json`, 'utf8'));

export const CATS = [
  'Daily Use', 'Academic', 'Work', 'Business', 'Advanced', 'Idioms', 'Phrasal Verbs',
  'Travel', 'Finance', 'Economics', 'Technology', 'Science', 'Health', 'Medicine',
  'Psychology', 'Education', 'Personality', 'Emotion', 'Social', 'Literature',
  'History', 'Sports', 'Philosophy', 'Legal', 'Politics', 'Nature', 'Environment',
  'Food', 'Arts', 'Music', 'Fashion', 'Communication', 'Modern Slang', 'General',
];

const DIRECT = {
  'Tech': 'Technology', 'Logic': 'Philosophy', 'Personal': 'Personality', 'Dynamic': 'Personality',
  'Police': 'Legal', 'Art': 'Arts', 'Spiritual': 'Philosophy', 'Religion': 'Philosophy',
  'Planning': 'Work', 'Media': 'Communication', 'Professional': 'Work', 'Mindset': 'Personality',
  'Moral': 'Philosophy', 'Design': 'Arts', 'Fitness': 'Health', 'Career': 'Work',
  'Investigation': 'Legal', 'Scientific': 'Science', 'Science': 'Science', 'Law': 'Legal',
  'Space': 'Science', 'Sociology': 'Social', 'Architecture': 'Arts', 'Ethics': 'Philosophy',
  'Art/Communication': 'Arts', 'Art/Academic': 'Arts', 'Religion/Legal': 'Legal',
  'Art/Daily Use': 'Arts', 'Art/Advanced': 'Arts', 'Academic/Advanced': 'Academic',
  'Academic/Daily Use': 'Daily Use', 'Material': 'General', 'Action': 'General',
};

for (const e of existing) {
  if (!CATS.includes(e.category)) e.category = DIRECT[e.category] || 'General';
}

const mapSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      category: { type: Type.STRING },
    },
    required: ['word', 'category'],
    propertyOrdering: ['word', 'category'],
  },
};

const pending = existing.filter(e => e.category === 'General');
console.log(`deterministic remap done. semantic pool=${pending.length}`);

const BATCH = 120;
const batches = [];
for (let i = 0; i < pending.length; i += BATCH) batches.push(pending.slice(i, i + BATCH));

let mapped = 0;
await pool(batches, 4, async (batch) => {
  const words = batch.map(e => e.word);
  const prompt = `You are categorizing English vocabulary words for a learning app.
Assign each word to EXACTLY ONE category from this list:
${CATS.filter(c => c !== 'General').join(', ')}

Word list: ${words.join(', ')}

Return a JSON array with one object per word: { "word": "<exact word from list>", "category": "<category>" }.
Keep the word spelling exactly as given. Use "General" only if truly impossible to classify.`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const data = await generateJSON(prompt, { schema: mapSchema, temperature: 0.2 });
      const byWord = new Map(batch.map(e => [e.word.toLowerCase(), e]));
      for (const row of Array.isArray(data) ? data : []) {
        const target = byWord.get(String(row?.word || '').toLowerCase().trim());
        const cat = String(row?.category || '').trim();
        if (target && CATS.includes(cat) && cat !== 'General') {
          target.category = cat;
          mapped++;
        }
      }
      return;
    } catch (e) {
      console.error('map batch failed:', String(e?.message || e).slice(0, 120));
      await sleep(2000 * (attempt + 1));
    }
  }
});

console.log(`semantically mapped=${mapped}`);
const byCat = {};
for (const e of existing) byCat[e.category] = (byCat[e.category] || 0) + 1;
console.log(byCat);

writeFileSync(`${WORK}/remapped.json`, JSON.stringify(existing, null, 0));
console.log('wrote remapped.json', existing.length);
