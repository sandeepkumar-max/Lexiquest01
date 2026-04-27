export const GRAMMAR_RULES = [
  // --- ARTICLES (Advanced) ---
  {
    id: "g1",
    title: "Zero Article (Omission)",
    rule: "No article before abstract nouns, languages, or when talking about institutions (school, hospital) in general.",
    example: "Honesty is the best policy. She speaks fluent French. He is in hospital (as a patient).",
    hindi: "Abstract nouns ya languages ke pehle 'A/An/The' nahi lagta.",
    category: "Advanced Articles"
  },
  {
    id: "g2",
    title: "Articles with Geographical Names",
    rule: "Use 'The' for mountain ranges, oceans, and plural countries. No article for single mountains or lakes.",
    example: "The Himalayas, The Pacific Ocean, The Netherlands, but Mount Everest.",
    hindi: "Pahado ki range aur samudro ke liye 'The' lagta hai, par ek pahad ke liye nahi.",
    category: "Advanced Articles"
  },

  // --- TENSES (Advanced) ---
  {
    id: "g3",
    title: "Present Perfect vs Simple Past",
    rule: "Use Simple Past for finished time. Use Present Perfect for unfinished time or when the result is important now.",
    example: "I saw him yesterday. (Finished) | I have seen him three times this week. (Unfinished)",
    hindi: "Beete hue fixed time ke liye Simple Past, par jiska asar abhi hai uske liye Present Perfect.",
    category: "Advanced Tenses"
  },
  {
    id: "g4",
    title: "Future Continuous for Polite Inquiries",
    rule: "Use 'will be + V-ing' to politely ask about someone's plans without sounding demanding.",
    example: "Will you be using the car this evening? (Polite) vs Are you going to use the car? (Direct)",
    hindi: "Kisi ke plans ke baare mein tameez se poochne ke liye 'Will be + Ing' use karein.",
    category: "Advanced Tenses"
  },
  {
    id: "g5",
    title: "Past Perfect for 'Unfulfilled Hopes'",
    rule: "Use 'had + V3' to talk about things you wanted to do but didn't.",
    example: "I had hoped to see you, but I was too busy.",
    hindi: "Aisi umeed jo poori nahi hui, uske liye Past Perfect lagta hai.",
    category: "Advanced Tenses"
  },

  // --- CONDITIONALS (CRITICAL) ---
  {
    id: "g6",
    title: "First Conditional (Real Possibility)",
    rule: "If + Simple Present, Will + V1. Used for possible future events.",
    example: "If it rains, we will cancel the trip.",
    hindi: "Agar aisa hua, toh aisa hoga (Future possible).",
    category: "Conditionals"
  },
  {
    id: "g7",
    title: "Second Conditional (Imaginary)",
    rule: "If + Simple Past, Would + V1. Used for unlikely or imaginary present/future situations.",
    example: "If I won the lottery, I would buy a mansion.",
    hindi: "Agar main lottery jeet gaya (jo mushkil hai), toh mahal khareedunga.",
    category: "Conditionals"
  },
  {
    id: "g8",
    title: "Third Conditional (Regrets)",
    rule: "If + Past Perfect, Would have + V3. Talking about a past that didn't happen.",
    example: "If you had studied harder, you would have passed the exam.",
    hindi: "Agar tumne mehnat ki hoti, toh tum pass ho gaye hote (Regret).",
    category: "Conditionals"
  },

  // --- MODALS (Advanced) ---
  {
    id: "g9",
    title: "Modals of Deduction (Past)",
    rule: "Must have + V3 (Certainty), Can't have + V3 (Impossible), Might have + V3 (Possibility).",
    example: "He must have forgotten his keys. He can't have left yet.",
    hindi: "Beete hue kal ke baare mein andaza lagane ke liye.",
    category: "Advanced Modals"
  },
  {
    id: "g10",
    title: "Should have / Ought to have",
    rule: "Used to express criticism or regret about a past action.",
    example: "You should have told me the truth.",
    hindi: "Tumhe mujhe sach bata dena chahiye tha (Par tumne nahi bataya).",
    category: "Advanced Modals"
  },

  // --- STRUCTURES ---
  {
    id: "g11",
    title: "The Subjunctive Mood",
    rule: "Use 'were' instead of 'was' for all subjects in hypothetical situations.",
    example: "If I were the Prime Minister, I would change the law.",
    hindi: "Kalpana (Imagination) karne ke liye sabhi ke saath 'Were' lagta hai.",
    category: "Complex Structures"
  },
  {
    id: "g12",
    title: "Inversion for Emphasis",
    rule: "Placing the verb before the subject after negative adverbs like 'Never', 'Seldom', 'Hardly'.",
    example: "Never have I seen such a beautiful sunrise. Hardly had I arrived when it started raining.",
    hindi: "Baat par zor (emphasis) dene ke liye verb ko subject se pehle lagana.",
    category: "Complex Structures"
  },
  {
    id: "g13",
    title: "Passive Voice with Reporting Verbs",
    rule: "It is said that... / Subject + is said to + V1. Used in formal reporting.",
    example: "It is believed that the company is failing. He is said to be a genius.",
    hindi: "Formal reporting ke liye, jaise 'Aisa kaha jata hai...'",
    category: "Voice & Speech"
  },
  {
    id: "g14",
    title: "Gerund vs Infinitive (Meaning Change)",
    rule: "Some verbs change meaning with Gerund (-ing) vs Infinitive (To).",
    example: "I stopped smoking (Quit). | I stopped to smoke (Paused for a break).",
    hindi: "Kuch verbs ka matlab badal jata hai agar unke baad -ing ya To lagayein.",
    category: "Verbs & Verbals"
  },
  {
    id: "g15",
    title: "Relative Clauses (Non-Defining)",
    rule: "Extra info added using commas. Use 'which/who', but never 'that'.",
    example: "My car, which is 10 years old, still runs perfectly.",
    hindi: "Kisi cheez ke baare mein extra jankari dena commas ke beech mein.",
    category: "Complex Structures"
  },
  {
    id: "g16",
    title: "Causative Verbs (Get/Have)",
    rule: "Subject + have/get + object + V3. When someone else does the work for you.",
    example: "I had my hair cut. I got the car repaired.",
    hindi: "Jab aap khud kaam nahi karte balki kisi se karwate hain.",
    category: "Verbs & Verbals"
  },
  {
    id: "g17",
    title: "Used to vs Be used to",
    rule: "'Used to' for past habits. 'Be used to + -ing' for being accustomed to something now.",
    example: "I used to smoke. | I am used to waking up early.",
    hindi: "'Used to' purani aadat ke liye, 'Am used to' abhi ki aadat ke liye.",
    category: "Verbs & Verbals"
  },
  {
    id: "g18",
    title: "Double Comparatives",
    rule: "Used to show that two things change together. (The + comparative, the + comparative)",
    example: "The more you learn, the more you earn.",
    hindi: "Jitna zyada... utna zyada...",
    category: "Adjectives"
  }
];
