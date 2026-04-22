const fs = require('fs');
const path = require('path');

const learnWordsPath = path.join(__dirname, 'src', 'lib', 'learnWords.ts');

function extractWords(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const words = [];
    // Regex to match { word: "...", meaning: "...", example: "...", category: "..." }
    // Handles double and single quotes, and missing category
    const regex = /\{\s*word:\s*["']([^"']+)["'],\s*meaning:\s*["']([^"']+)["'],\s*example:\s*["']([^"']*)["'](?:,\s*category:\s*["']([^"']+)["'])?\s*\}/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        words.push({
            word: match[1],
            meaning: match[2],
            example: match[3],
            category: match[4] || 'General'
        });
    }
    return words;
}

const allWords = [];

// Files to extract from
const sourceFiles = [
    path.join(__dirname, 'src', 'lib', 'learnWords.ts'),
    path.join(__dirname, 'final_expansion.cjs'),
    path.join(__dirname, 'final_expansion_batch2.cjs'),
    path.join(__dirname, 'refactor_words.cjs'),
    path.join(__dirname, 'append_words.js')
];

sourceFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`Extracting from ${file}...`);
        const extracted = extractWords(file);
        console.log(`Extracted ${extracted.length} entries.`);
        allWords.push(...extracted);
    }
});

// Deduplicate by word (case-insensitive)
// Favor entries with non-corrupted meanings (no "????")
const uniqueWords = new Map();

allWords.forEach(entry => {
    const key = entry.word.toLowerCase().trim();
    const existing = uniqueWords.get(key);
    
    const isCorrupted = entry.meaning.includes('?');
    
    if (!existing || (existing.isCorrupted && !isCorrupted)) {
        uniqueWords.set(key, { ...entry, isCorrupted });
    }
});

console.log(`Total unique words found: ${uniqueWords.size}`);

// Prepare the new file content
const wordsArray = Array.from(uniqueWords.values()).map(w => {
    return `  { word: ${JSON.stringify(w.word)}, meaning: ${JSON.stringify(w.meaning)}, example: ${JSON.stringify(w.example)}, category: ${JSON.stringify(w.category)} }`;
});

const fileHeader = `export const LEARN_WORDS = [\n`;
const fileFooter = `];\n`;
const newContent = fileHeader + wordsArray.join(',\n') + '\n' + fileFooter;

fs.writeFileSync(learnWordsPath, newContent, 'utf8');
console.log(`Successfully wrote ${uniqueWords.size} unique words to ${learnWordsPath}`);
