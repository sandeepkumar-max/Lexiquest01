const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update evaluateArenaSentence to change the word after dealing damage
const evalRegex = /if \(arenaHp - dmg <= 0\) \{\s*setTimeout\(\(\) => setArenaState\('result'\), 2000\);\s*\}/s;
const newEval = `if (arenaHp - dmg <= 0) {
        setTimeout(() => setArenaState('result'), 2000);
      } else if (dmg > 0) {
        // Change word after a successful hit
        setTimeout(() => {
          const w = LEARN_WORDS[Math.floor(Math.random() * LEARN_WORDS.length)];
          setArenaWordObj(w);
          setArenaFeedback(null);
        }, 3000);
      }`;
content = content.replace(evalRegex, newEval);

// 2. Add Lexi Hint Button inside the input wrapper
const inputRegex = /<input\s*type="text"\s*disabled=\{arenaLoading\}\s*value=\{arenaInput\}\s*onChange=\{\(e\) => setArenaInput\(e\.target\.value\)\}\s*placeholder="Type a sentence using the word\.\.\."\s*className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-4 text-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"\s*onKeyDown=\{\(e\) => e\.key === 'Enter' && evaluateArenaSentence\(\)\}\s*\/>/s;
const newInput = `<div className="relative">
                      <input
                        type="text"
                        disabled={arenaLoading}
                        value={arenaInput}
                        onChange={(e) => setArenaInput(e.target.value)}
                        placeholder="Type a sentence using the word..."
                        className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl pl-6 pr-14 py-4 text-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                        onKeyDown={(e) => e.key === 'Enter' && evaluateArenaSentence()}
                      />
                      <button
                        onClick={() => setArenaInput(arenaWordObj?.example || "This is a great word.")}
                        title="Lexi Hint"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40 hover:text-white rounded-lg flex items-center justify-center transition-all"
                      >
                        <Bot className="w-5 h-5" />
                      </button>
                    </div>`;
content = content.replace(inputRegex, newInput);

// 3. Add 2 Game Modes on the Welcome Screen
const welcomeRegex = /<button\s*onClick=\{startArenaBattle\}\s*className="px-8 py-4 bg-orange-600 text-white text-xl font-black rounded-2xl shadow-lg shadow-orange-500\/20 hover:scale-105 active:scale-95 transition-all"\s*>\s*ENTER BATTLE\s*<\/button>/s;
const newWelcome = `<div className="flex flex-col gap-4 max-w-sm mx-auto w-full">
                    <button
                      onClick={startArenaBattle}
                      className="w-full py-5 bg-orange-600 text-white text-xl font-black rounded-3xl shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-1 border-b-4 border-orange-800 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <span className="flex items-center gap-2"><Flame className="w-6 h-6" /> Boss Battle</span>
                      <span className="text-[10px] font-bold text-orange-200 uppercase tracking-widest">Sentence Striker</span>
                    </button>
                    
                    <button
                      onClick={() => alert("Speed Sprint mode coming in next update!")}
                      className="w-full py-5 bg-indigo-600 text-white text-xl font-black rounded-3xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center gap-1 border-b-4 border-indigo-800"
                    >
                      <span className="flex items-center gap-2"><Zap className="w-6 h-6" /> Speed Sprint</span>
                      <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">MCQ Survival (Coming Soon)</span>
                    </button>
                  </div>`;
content = content.replace(welcomeRegex, newWelcome);

// Ensure Zap icon is imported (we used Zap above)
if(!content.includes('Zap,') && content.includes('lucide-react')) {
  content = content.replace('Sword }', 'Sword, Zap }');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Refactor 3 complete.");
