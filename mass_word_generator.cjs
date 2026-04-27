const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = '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';
const filePath = path.join(__dirname, 'src', 'lib', 'learnWords.ts');

async function getGroqWords(count, category, existingWords) {
    const prompt = `Generate exactly ${count} unique English vocabulary words for the category "${category}" that are NOT in this list: [${Array.from(existingWords).slice(0, 50).join(', ')}...].
For each word, provide:
1. The word
2. The Hindi meaning
3. A short example sentence in English.
Format the output as a JSON array of objects: [{"word": "...", "meaning": "...", "example": "...", "category": "${category}"}]
Return ONLY the JSON array.`;

    const data = JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        max_tokens: 4000
    });

    const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    const content = response.choices[0].message.content;
                    const jsonMatch = content.match(/\[[\s\S]*\]/);
                    if (jsonMatch) {
                        resolve(JSON.parse(jsonMatch[0]));
                    } else {
                        reject('No JSON found in response');
                    }
                } catch (e) {
                    reject('Failed to parse response: ' + body);
                }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function main() {
    let content = fs.readFileSync(filePath, 'utf8');
    const existingWords = new Set();
    const regex = /word:\s*["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        existingWords.add(match[1].toLowerCase().trim());
    }

    console.log(`Current word count: ${existingWords.size}`);

    const target = 10000;
    const categories = ['Technology', 'Finance', 'Medicine', 'Psychology', 'Science', 'Law', 'Literature', 'Daily Use', 'Idioms', 'Phrasal Verbs', 'Business', 'Art', 'Nature', 'Travel', 'Food', 'Sports', 'Education', 'History', 'Philosophy', 'Space', 'Environment', 'Sociology', 'Architecture', 'Music', 'Fashion', 'Health', 'Economics', 'Politics', 'Legal', 'Ethics', 'Modern Slang', 'Academic'];

    let totalAdded = 0;
    while (existingWords.size < target) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const batchSize = 30;
        console.log(`Fetching ${batchSize} words for ${category}...`);

        try {
            const words = await getGroqWords(batchSize, category, existingWords);
            let addedInBatch = 0;
            let batchContent = '';

            for (const w of words) {
                const wordLower = w.word.toLowerCase().trim();
                if (!existingWords.has(wordLower)) {
                    existingWords.add(wordLower);
                    batchContent += `  { word: ${JSON.stringify(w.word)}, meaning: ${JSON.stringify(w.meaning)}, example: ${JSON.stringify(w.example)}, category: ${JSON.stringify(w.category)} },\n`;
                    addedInBatch++;
                    totalAdded++;
                }
            }

            if (addedInBatch > 0) {
                const lastBracketIndex = content.lastIndexOf('];');
                content = content.slice(0, lastBracketIndex) + batchContent + '\n];\n';
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Added ${addedInBatch} words. Total: ${existingWords.size}`);
                console.log('Waiting 5s to avoid rate limits...');
                await new Promise(r => setTimeout(r, 5000));
            }
        } catch (e) {
            console.error('Error fetching batch, waiting 30s:', e);
            await new Promise(r => setTimeout(r, 30000)); // Wait before retry
        }
    }

    console.log(`Finished! Total added: ${totalAdded}. Final count: ${existingWords.size}`);
}

main();
