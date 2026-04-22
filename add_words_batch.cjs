/**
 * LexiQuest - Bulk Word Adder v2
 * Uses Groq AI to generate unique words and adds them to learnWords.ts
 * Run: node add_words_batch.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const GROQ_API_KEY = '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';
const FILE_PATH = path.join(__dirname, 'src', 'lib', 'learnWords.ts');

function getExistingWords(content) {
  const words = new Set();
  const regex = /word:\s*["']([^"']+)["']/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    words.add(match[1].toLowerCase().trim());
  }
  return words;
}

function extractJSON(text) {
  // Try multiple extraction strategies
  // 1. Direct parse
  try { return JSON.parse(text.trim()); } catch {}
  // 2. Find [...] array
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  // 3. Extract from ```json ... ``` blocks  
  const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeMatch) { try { return JSON.parse(codeMatch[1].trim()); } catch {} }
  return null;
}

function groqRequest(messages, maxTokens = 8000) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.8,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' }
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.choices?.[0]?.message?.content || '');
        } catch (e) {
          reject(new Error('Parse error: ' + data.slice(0, 300)));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function fetchWordBatch(category, batchNum, existingWords) {
  const prompt = `Generate 70 unique English vocabulary words for the "${category}" category.
Return a JSON object with a "words" array like this:
{"words":[{"word":"example","meaning":"उदाहरण","example":"This is an example sentence.","category":"${category}"}]}

Important rules:
- Include words that are useful for Indians learning English
- Each word must have a clear Hindi meaning (in Devanagari script)
- Include a natural English example sentence
- No duplicates, no very common basic words (like "the", "is", "a")
- Generate words from various parts of the alphabet for batch ${batchNum}
- Category must be exactly: "${category}"
Return ONLY the JSON object, nothing else.`;

  try {
    const response = await groqRequest([
      { role: 'system', content: 'You are a vocabulary expert. Always respond with valid JSON only.' },
      { role: 'user', content: prompt }
    ]);
    
    const parsed = extractJSON(response);
    if (!parsed) return [];
    
    const wordList = parsed.words || parsed.data || (Array.isArray(parsed) ? parsed : []);
    return wordList.filter(w => 
      w && w.word && w.meaning && 
      typeof w.word === 'string' && 
      !existingWords.has(w.word.toLowerCase().trim())
    );
  } catch (e) {
    console.error(`  Error:`, e.message.slice(0, 100));
    return [];
  }
}

async function main() {
  console.log('🚀 LexiQuest Bulk Word Adder v2\n');
  
  let fileContent = fs.readFileSync(FILE_PATH, 'utf8');
  let existingWords = getExistingWords(fileContent);
  const startCount = existingWords.size;
  console.log(`📚 Current word count: ${startCount}`);
  console.log(`🎯 Target: 10,000+ words`);
  console.log(`📝 Need to add: ${Math.max(0, 10000 - startCount)} more words\n`);

  // Categories with multiple batches each
  const categoryBatches = [
    ['Daily Use', 15],
    ['Academic', 12],
    ['Work', 10],
    ['Advanced', 12],
    ['Travel', 8],
    ['Finance', 8],
    ['Technology', 10],
    ['Health', 8],
    ['Science', 8],
    ['Philosophy', 6],
    ['Legal', 6],
    ['Personality', 8],
    ['Social', 8],
    ['Literature', 6],
    ['History', 6],
    ['Sports', 6],
    ['Politics', 6],
    ['Psychology', 8],
    ['Business', 8],
    ['Education', 6],
    ['Nature', 6],
    ['Food', 5],
    ['Arts', 5],
    ['Medicine', 6],
    ['Economics', 6],
    ['Military', 4],
    ['Religion', 4],
    ['Music', 4],
    ['Fashion', 4],
    ['Architecture', 4],
  ];

  let totalAdded = 0;
  let batchCount = 0;
  const totalBatches = categoryBatches.reduce((sum, [, n]) => sum + n, 0);

  for (const [category, numBatches] of categoryBatches) {
    for (let b = 1; b <= numBatches; b++) {
      batchCount++;
      process.stdout.write(`[${batchCount}/${totalBatches}] ${category} batch ${b}/${numBatches}... `);
      
      // Re-read file to get latest content
      fileContent = fs.readFileSync(FILE_PATH, 'utf8');
      existingWords = getExistingWords(fileContent);
      
      if (existingWords.size >= 10000) {
        console.log(`\n🎉 10,000 words reached! Stopping.`);
        break;
      }

      const newWords = await fetchWordBatch(category, b, existingWords);
      
      if (newWords.length > 0) {
        const lastBracketIndex = fileContent.lastIndexOf('];');
        const wordLines = newWords.map(w => {
          const word = String(w.word).replace(/\\/g, '').replace(/"/g, "'");
          const meaning = String(w.meaning || '').replace(/\\/g, '').replace(/"/g, "'");
          const example = String(w.example || `He used the word ${word} today.`).replace(/\\/g, '').replace(/"/g, "'");
          return `  { word: "${word}", meaning: "${meaning}", example: "${example}", category: "${category}" },`;
        }).join('\n');
        
        fileContent = fileContent.slice(0, lastBracketIndex) + wordLines + '\n];\n';
        fs.writeFileSync(FILE_PATH, fileContent, 'utf8');
        
        totalAdded += newWords.length;
        const currentTotal = existingWords.size + newWords.length;
        console.log(`✅ +${newWords.length} words → Total: ${currentTotal}`);
      } else {
        console.log(`⚠️  skipped`);
      }

      // Rate limiting delay
      await new Promise(r => setTimeout(r, 1200));
    }
    
    if (existingWords.size >= 10000) break;
  }

  // Final count
  fileContent = fs.readFileSync(FILE_PATH, 'utf8');
  existingWords = getExistingWords(fileContent);
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🎉 COMPLETE!`);
  console.log(`📚 Final word count: ${existingWords.size}`);
  console.log(`✨ Words added this session: ${totalAdded}`);
  
  if (existingWords.size < 10000) {
    const remaining = 10000 - existingWords.size;
    console.log(`\n⚠️  Still need ${remaining} more words. Run script again!`);
  } else {
    console.log(`\n✅ 10,000+ words TARGET ACHIEVED!`);
  }
}

main().catch(console.error);
