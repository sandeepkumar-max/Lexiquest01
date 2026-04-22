const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'lib', 'learnWords.ts');
let content = fs.readFileSync(filePath, 'utf8');

const additionalWords = [
  // Technology
  { word: "algorithm", meaning: "कलन विधि", example: "The algorithm sorts the data efficiently.", category: "Technology" },
  { word: "encryption", meaning: "कूटलेखन", example: "Data encryption ensures privacy.", category: "Technology" },
  { word: "bandwidth", meaning: "बैंडविड्थ", example: "Higher bandwidth allows faster downloads.", category: "Technology" },
  { word: "cloud computing", meaning: "क्लाउड कंप्यूटिंग", example: "Cloud computing provides scalable storage.", category: "Technology" },
  { word: "firewall", meaning: "फायरवॉल", example: "A firewall protects against hackers.", category: "Technology" },
  { word: "database", meaning: "डेटाबेस", example: "The database stores all user info.", category: "Technology" },
  { word: "firmware", meaning: "फर्मवेयर", example: "The firmware needs an update.", category: "Technology" },
  { word: "hardware", meaning: "हार्डवेयर", example: "The hardware is out of date.", category: "Technology" },
  { word: "software", meaning: "सॉफ्टवेयर", example: "The software is easy to use.", category: "Technology" },
  { word: "network", meaning: "नेटवर्क", example: "The network is down.", category: "Technology" },
  { word: "protocol", meaning: "प्रोटोकॉल", example: "The protocol defines the rules.", category: "Technology" },
  { word: "server", meaning: "सर्वर", example: "The server is unresponsive.", category: "Technology" },
  { word: "client", meaning: "क्लाइंट", example: "The client requested data.", category: "Technology" },
  { word: "bandwidth", meaning: "बैंडविड्थ", example: "We need more bandwidth.", category: "Technology" },
  { word: "browser", meaning: "ब्राउज़र", example: "Open the link in your browser.", category: "Technology" },
  { word: "cache", meaning: "कैश", example: "Clear your browser cache.", category: "Technology" },
  { word: "cookies", meaning: "कुकीज़", example: "Cookies store session info.", category: "Technology" },
  { word: "debug", meaning: "डिबग", example: "I need to debug this code.", category: "Technology" },
  { word: "deploy", meaning: "तैनात करना", example: "We will deploy the app tomorrow.", category: "Technology" },
  { word: "domain", meaning: "डोमेन", example: "The domain name is registered.", category: "Technology" },
  { word: "backend", meaning: "बैकएंड", example: "The backend is written in Node.js.", category: "Technology" },
  { word: "frontend", meaning: "फ्रंटएंड", example: "The frontend uses React.", category: "Technology" },
  { word: "fullstack", meaning: "फुलस्टैक", example: "He is a fullstack developer.", category: "Technology" },
  { word: "interface", meaning: "इंटरफेस", example: "The interface is user-friendly.", category: "Technology" },
  { word: "iteration", meaning: "पुनरावृत्ति", example: "The next iteration will include fixes.", category: "Technology" },
  { word: "latency", meaning: "विलंबता", example: "Low latency is important for gaming.", category: "Technology" },
  { word: "open source", meaning: "ओपन सोर्स", example: "Linux is open source software.", category: "Technology" },
  { word: "responsive", meaning: "प्रतिक्रियाशील", example: "The design is responsive.", category: "Technology" },
  { word: "repository", meaning: "रिपॉजिटरी", example: "Commit your code to the repository.", category: "Technology" },
  { word: "stack", meaning: "स्टैक", example: "Our tech stack includes Vite.", category: "Technology" },
  
  // Finance
  { word: "dividend", meaning: "लाभांश", example: "The company paid a dividend to its shareholders.", category: "Finance" },
  { word: "mortgage", meaning: "बंधक", example: "He took out a mortgage to buy the house.", category: "Finance" },
  { word: "inflation", meaning: "मुद्रास्फीति", example: "Inflation reduces purchasing power.", category: "Finance" },
  { word: "recession", meaning: "मंदी", example: "The country is in a recession.", category: "Finance" },
  { word: "portfolio", meaning: "पोर्टफोलियो", example: "He has a diverse investment portfolio.", category: "Finance" },
  { word: "equity", meaning: "इक्विटी", example: "She has equity in the company.", category: "Finance" },
  { word: "asset", meaning: "संपत्ति", example: "Cash is a liquid asset.", category: "Finance" },
  { word: "liability", meaning: "देयता", example: "Debt is a liability.", category: "Finance" },
  { word: "revenue", meaning: "राजस्व", example: "Company revenue increased this year.", category: "Finance" },
  { word: "profit", meaning: "लाभ", example: "The profit was higher than expected.", category: "Finance" },
  { word: "loss", meaning: "हानि", example: "The business suffered a loss.", category: "Finance" },
  { word: "capital", meaning: "पूंजी", example: "We need more capital to grow.", category: "Finance" },
  { word: "audit", meaning: "लेखापरीक्षा", example: "The IRS will audit their taxes.", category: "Finance" },
  { word: "bankruptcy", meaning: "दिवाला", example: "The firm filed for bankruptcy.", category: "Finance" },
  { word: "credit", meaning: "क्रेडिट", example: "Your credit score is good.", category: "Finance" },
  { word: "debit", meaning: "डेबिट", example: "The amount was debited from your account.", category: "Finance" },
  { word: "interest", meaning: "ब्याज", example: "The interest rate is low.", category: "Finance" },
  { word: "investment", meaning: "निवेश", example: "Real estate is a good investment.", category: "Finance" },
  { word: "liquidity", meaning: "तरलता", example: "The company has low liquidity.", category: "Finance" },
  { word: "margin", meaning: "मार्जिन", example: "The profit margin is thin.", category: "Finance" },
  { word: "net worth", meaning: "कुल संपत्ति", example: "His net worth is millions.", category: "Finance" },
  { word: "stock", meaning: "स्टॉक", example: "Buy stock in tech companies.", category: "Finance" },
  { word: "share", meaning: "शेयर", example: "He owns a share of the business.", category: "Finance" },
  { word: "tax", meaning: "कर", example: "Pay your taxes on time.", category: "Finance" },
  { word: "yield", meaning: "प्रतिफल", example: "The bond has a high yield.", category: "Finance" },
  
  // Psychology
  { word: "cognitive", meaning: "संज्ञानात्मक", example: "Cognitive therapy helps with depression.", category: "Psychology" },
  { word: "subconscious", meaning: "अवचेतन", example: "The dream revealed her subconscious fears.", category: "Psychology" },
  { word: "narcissism", meaning: "आत्ममोह", example: "He shows signs of narcissism.", category: "Psychology" },
  { word: "empathy", meaning: "सहानुभूति", example: "Empathy is key to healthy relationships.", category: "Psychology" },
  { word: "altruism", meaning: "परोपकारिता", example: "Her altruism was inspiring.", category: "Psychology" },
  { word: "behavioral", meaning: "व्यवहार संबंधी", example: "Behavioral science is fascinating.", category: "Psychology" },
  { word: "conditioning", meaning: "अनुकूलन", example: "Classical conditioning explains habits.", category: "Psychology" },
  { word: "ego", meaning: "अहं", example: "His ego was bruised by the loss.", category: "Psychology" },
  { word: "fixation", meaning: "आसक्ति", example: "He has a fixation on details.", category: "Psychology" },
  { word: "introvert", meaning: "अंतर्मुखी", example: "An introvert prefers quiet settings.", category: "Psychology" },
  { word: "extrovert", meaning: "बहिर्मुखी", example: "An extrovert enjoys being with people.", category: "Psychology" },
  { word: "neurosis", meaning: "विक्षिप्ति", example: "He suffers from mild neurosis.", category: "Psychology" },
  { word: "perception", meaning: "धारणा", example: "Perception varies from person to person.", category: "Psychology" },
  { word: "projection", meaning: "प्रक्षेपण", example: "Projection is a common defense mechanism.", category: "Psychology" },
  { word: "trauma", meaning: "आघात", example: "The accident caused deep trauma.", category: "Psychology" },
  { word: "validation", meaning: "सत्यापन / मान्यता", example: "Everyone seeks social validation.", category: "Psychology" },
  
  // Science
  { word: "photosynthesis", meaning: "प्रकाश संश्लेषण", example: "Plants use photosynthesis to make food.", category: "Science" },
  { word: "molecule", meaning: "अणु", example: "A water molecule has two hydrogen atoms.", category: "Science" },
  { word: "evolution", meaning: "विकासवाद", example: "Darwin's theory of evolution.", category: "Science" },
  { word: "gravity", meaning: "गुरुत्वाकर्षण", example: "Gravity keeps us on the ground.", category: "Science" },
  { word: "atom", meaning: "परमाणु", example: "Everything is made of atoms.", category: "Science" },
  { word: "bacterium", meaning: "जीवाणु", example: "A bacterium is a single-celled organism.", category: "Science" },
  { word: "catalyst", meaning: "उत्प्रेरक", example: "Enzymes act as catalysts.", category: "Science" },
  { word: "chromosome", meaning: "गुणसूत्र", example: "Humans have 46 chromosomes.", category: "Science" },
  { word: "dna", meaning: "डीएनए", example: "DNA carries genetic info.", category: "Science" },
  { word: "electron", meaning: "इलेक्ट्रॉन", example: "Electrons orbit the nucleus.", category: "Science" },
  { word: "energy", meaning: "ऊर्जा", example: "Energy cannot be destroyed.", category: "Science" },
  { word: "fossil", meaning: "जीवाश्म", example: "They found a dinosaur fossil.", category: "Science" },
  { word: "galaxy", meaning: "आकाशगंगा", example: "The Milky Way is our galaxy.", category: "Science" },
  { word: "hypothesis", meaning: "परिकल्पना", example: "Test your hypothesis with an experiment.", category: "Science" },
  { word: "isotope", meaning: "समस्थानिक", example: "Carbon-14 is an isotope.", category: "Science" },
  { word: "kinetic", meaning: "गतिज", example: "Kinetic energy is the energy of motion.", category: "Science" },
  { word: "nucleus", meaning: "नाभिक", example: "The nucleus is at the center of the atom.", category: "Science" },
  { word: "organism", meaning: "जीव", example: "Every organism needs water.", category: "Science" },
  { word: "proton", meaning: "प्रोटॉन", example: "Protons have a positive charge.", category: "Science" },
  { word: "quantum", meaning: "क्वांटम", example: "Quantum physics is complex.", category: "Science" },
  { word: "radiation", meaning: "विकिरण", example: "Sunlight is a form of radiation.", category: "Science" },
  { word: "species", meaning: "प्रजाति", example: "The tiger is an endangered species.", category: "Science" },
  { word: "velocity", meaning: "वेग", example: "The car reached a high velocity.", category: "Science" },
  
  // Idioms & Phrasal Verbs
  { word: "bring up", meaning: "जिक्र करना", example: "Don't bring up that topic again.", category: "Phrasal Verbs" },
  { word: "call off", meaning: "रद्द करना", example: "They called off the meeting.", category: "Phrasal Verbs" },
  { word: "carry on", meaning: "जारी रखना", example: "Please carry on with your work.", category: "Phrasal Verbs" },
  { word: "check out", meaning: "जांच करना", example: "Check out this new app.", category: "Phrasal Verbs" },
  { word: "come across", meaning: "संयोग से मिलना", example: "I came across an old friend today.", category: "Phrasal Verbs" },
  { word: "cut down", meaning: "कम करना", example: "I need to cut down on sugar.", category: "Phrasal Verbs" },
  { word: "fall apart", meaning: "टूट जाना", example: "The old chair fell apart.", category: "Phrasal Verbs" },
  { word: "get along", meaning: "तालमेल बिठाना", example: "Do you get along with your neighbors?", category: "Phrasal Verbs" },
  { word: "give up", meaning: "हार मानना", example: "Never give up on your dreams.", category: "Phrasal Verbs" },
  { word: "go on", meaning: "जारी रहना", example: "The show must go on.", category: "Phrasal Verbs" },
  { word: "hold on", meaning: "इंतज़ार करना", example: "Please hold on for a minute.", category: "Phrasal Verbs" },
  { word: "keep up", meaning: "बनाए रखना", example: "Keep up the good work.", category: "Phrasal Verbs" },
  { word: "look after", meaning: "देखभाल करना", example: "She looks after her elderly parents.", category: "Phrasal Verbs" },
  { word: "make up", meaning: "बनाना / सुलह करना", example: "They made up after the fight.", category: "Phrasal Verbs" },
  { word: "pass out", meaning: "बेहोश होना", example: "He passed out from the heat.", category: "Phrasal Verbs" },
  { word: "pick up", meaning: "उठाना / सीखना", example: "He picked up the language quickly.", category: "Phrasal Verbs" },
  { word: "put off", meaning: "टालना", example: "Don't put off till tomorrow what you can do today.", category: "Phrasal Verbs" },
  { word: "run out", meaning: "खत्म होना", example: "We ran out of milk.", category: "Phrasal Verbs" },
  { word: "set up", meaning: "स्थापित करना", example: "They set up a new business.", category: "Phrasal Verbs" },
  { word: "take off", meaning: "उड़ान भरना / उतारना", example: "The plane will take off soon.", category: "Phrasal Verbs" },
  { word: "turn down", meaning: "अस्वीकार करना", example: "He turned down the job offer.", category: "Phrasal Verbs" },
  { word: "wake up", meaning: "जागना", example: "I wake up at 6 AM.", category: "Phrasal Verbs" },
  { word: "work out", meaning: "व्यायाम करना / हल करना", example: "Things will work out in the end.", category: "Phrasal Verbs" },
  
  // General Vocabulary
  { word: "benevolent", meaning: "परोपकारी", example: "He is a benevolent ruler.", category: "Personality" },
  { word: "cacophony", meaning: "शोर", example: "The city was a cacophony of sounds.", category: "Daily Use" },
  { word: "diligent", meaning: "परिश्रमी", example: "She is a diligent student.", category: "Personality" },
  { word: "eloquent", meaning: "सुवक्ता", example: "He gave an eloquent speech.", category: "Communication" },
  { word: "frivolous", meaning: "तुच्छ", example: "Don't waste money on frivolous things.", category: "Daily Use" },
  { word: "gregarious", meaning: "मिलनसार", example: "She is a gregarious person.", category: "Personality" },
  { word: "hinder", meaning: "बाधा डालना", example: "Heavy rain hindered our progress.", category: "Action" },
  { word: "immutable", meaning: "अपरिवर्तनीय", example: "The laws of nature are immutable.", category: "Philosophy" },
  { word: "jovial", meaning: "हंसमुख", example: "He is always in a jovial mood.", category: "Personality" },
  { word: "knack", meaning: "कौशल", example: "She has a knack for painting.", category: "Skill" },
  { word: "loquacious", meaning: "बातूनी", example: "He is quite loquacious.", category: "Personality" },
  { word: "malleable", meaning: "लचीला", example: "Gold is a malleable metal.", category: "Material" },
  { word: "nefarious", meaning: "कुटिल", example: "The villain had a nefarious plan.", category: "Moral" },
  { word: "obsolete", meaning: "अप्रचलित", example: "Typewriters are now obsolete.", category: "Tech" },
  { word: "pensive", meaning: "विचारमग्न", example: "She was in a pensive mood.", category: "Emotion" },
  { word: "quaint", meaning: "विचित्र और आकर्षक", example: "It's a quaint little village.", category: "Travel" },
  { word: "resilient", meaning: "लचीला / पुनरुत्थानशील", example: "She is a resilient person.", category: "Personality" },
  { word: "stoic", meaning: "सहनशील", example: "He remained stoic in the face of loss.", category: "Personality" },
  { word: "tenacious", meaning: "दृढ़", example: "She has a tenacious spirit.", category: "Personality" },
  { word: "ubiquitous", meaning: "सर्वव्यापी", example: "Smartphones are ubiquitous nowadays.", category: "Daily Use" },
  { word: "vibrant", meaning: "जीवंत", example: "The market was vibrant and full of life.", category: "Social" },
  { word: "wary", meaning: "सावधान", example: "Be wary of strangers.", category: "Personality" },
  { word: "xenophobia", meaning: "विदेशी द्वेष", example: "Xenophobia has no place in society.", category: "Social" },
  { word: "yearn", meaning: "तड़पना", example: "I yearn for a quiet life.", category: "Emotion" },
  { word: "zeal", meaning: "उत्साह", example: "He works with great zeal.", category: "Personality" }
];

const existingWords = new Set();
const wordRegex = /word:\s*["']([^"']+)["']/g;
let m;
while ((m = wordRegex.exec(content)) !== null) {
  existingWords.add(m[1].toLowerCase().trim());
}

let addedCount = 0;
let batchContent = '';
for (const w of additionalWords) {
  if (!existingWords.has(w.word.toLowerCase().trim())) {
    batchContent += `  { word: ${JSON.stringify(w.word)}, meaning: ${JSON.stringify(w.meaning)}, example: ${JSON.stringify(w.example)}, category: ${JSON.stringify(w.category)} },\n`;
    addedCount++;
  }
}

if (addedCount > 0) {
  const lastBracketIndex = content.lastIndexOf('];');
  content = content.slice(0, lastBracketIndex) + batchContent + '\n];\n';
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Manually added ${addedCount} words.`);
} else {
  console.log('All manual words already exist.');
}
