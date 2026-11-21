import 'dotenv/config';
import { GoogleGenAI, Type } from '@google/genai';

const KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error('GEMINI key missing in .env (VITE_GEMINI_API_KEY)');
  process.exit(1);
}

export const ai = new GoogleGenAI({ apiKey: KEY });

export const MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
];

export const wordSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      word: { type: Type.STRING },
      meaning: { type: Type.STRING },
      example: { type: Type.STRING },
      category: { type: Type.STRING },
    },
    required: ['word', 'meaning', 'example', 'category'],
    propertyOrdering: ['word', 'meaning', 'example', 'category'],
  },
};

export async function generateJSON(prompt, { schema = wordSchema, temperature = 1.0 } = {}) {
  let lastErr;
  const cooldown = globalThis.__modelCooldown || (globalThis.__modelCooldown = new Map());
  for (let round = 0; round < 3; round++) {
    for (const model of MODELS) {
      if ((cooldown.get(model) || 0) > Date.now()) continue;
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature,
            maxOutputTokens: 16384,
          },
        });
        const text = res.text?.trim();
        if (!text) throw new Error('empty response');
        return JSON.parse(text);
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || e);
        if (/404|no longer available|not found/i.test(msg)) {
          cooldown.set(model, Date.now() + 24 * 3600 * 1000);
          continue;
        }
        if (/429|quota/i.test(msg)) {
          cooldown.set(model, Date.now() + 65 * 1000);
          continue;
        }
        if (/API key|PERMISSION_DENIED|INVALID_ARGUMENT/i.test(msg)) throw e;
        await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
      }
    }
    await new Promise(r => setTimeout(r, 2500));
  }
  throw lastErr;
}

export async function pool(items, size, fn) {
  const results = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
