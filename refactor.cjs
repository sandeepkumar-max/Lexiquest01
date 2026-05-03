const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the Test Tab entirely with the Arena UI
const testTabStartRegex = /\{activeTab === 'test' && \(\s*<div className="flex-1.*?\{testState === 'start' && \(/s;
// We will just replace everything between `{activeTab === 'test' && (` and `{activeTab === 'profile' && (`
const blockRegex = /(\{activeTab === 'test' && \([\s\S]*?\n\s*)\{activeTab === 'profile' && \(/;

const newArenaUI = `{activeTab === 'test' && (
          <div className="flex-1 p-6 lg:p-10 overflow-y-auto bg-slate-900 text-white relative">
            <div className="max-w-2xl mx-auto text-center mt-10">
              {arenaState === 'idle' && (
                <div className="animate-in fade-in zoom-in duration-500">
                  <Flame className="w-24 h-24 text-orange-500 mx-auto mb-6 animate-pulse" />
                  <h2 className="text-4xl font-black mb-4">Welcome to the Arena</h2>
                  <p className="text-slate-400 mb-8 max-w-sm mx-auto text-lg">
                    Defeat the grammar monster by using vocabulary words correctly in a sentence.
                  </p>
                  <button
                    onClick={startArenaBattle}
                    className="px-8 py-4 bg-orange-600 text-white text-xl font-black rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    ENTER BATTLE
                  </button>
                </div>
              )}

              {arenaState === 'battling' && arenaWordObj && (
                <div className="animate-in fade-in slide-in-from-bottom-8">
                  {/* Monster UI */}
                  <div className="relative w-48 h-48 mx-auto mb-8">
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
                    <img 
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=Monster&backgroundColor=transparent" 
                      alt="Monster" 
                      className={\`w-full h-full object-contain relative z-10 transition-transform duration-300 \${arenaFeedback ? 'scale-90 opacity-80' : 'animate-bounce'}\`} 
                    />
                    
                    {/* HP Bar */}
                    <div className="absolute -bottom-6 w-full bg-slate-800 rounded-full h-4 border border-slate-700 overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-500" 
                        style={{ width: \`\${arenaHp}%\` }}
                      />
                    </div>
                    <div className="absolute -bottom-6 w-full text-center text-[10px] font-black">{arenaHp}/100 HP</div>
                  </div>

                  {/* Feedback Overlay */}
                  {arenaFeedback && (
                     <div className="mb-6 p-4 rounded-xl border animate-in slide-in-from-top-4 bg-slate-800/80 border-slate-700 backdrop-blur-sm">
                        <h4 className={\`text-2xl font-black mb-1 \${arenaFeedback.crit ? 'text-orange-500' : 'text-slate-300'}\`}>
                          -{arenaFeedback.damage} DAMAGE {arenaFeedback.crit && "CRITICAL HIT!"}
                        </h4>
                        <p className="text-slate-400 text-sm">{arenaFeedback.msg}</p>
                     </div>
                  )}

                  {/* Weapon (Word) */}
                  <div className="mb-8">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Your Weapon</p>
                    <div className="inline-block px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-2xl">
                      <span className="text-2xl font-black text-indigo-400">{arenaWordObj.word}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-2 italic">{arenaWordObj.meaning}</p>
                  </div>

                  {/* Input */}
                  <div className="flex flex-col gap-4">
                    <input
                      type="text"
                      disabled={arenaLoading}
                      value={arenaInput}
                      onChange={(e) => setArenaInput(e.target.value)}
                      placeholder="Type a sentence using the word..."
                      className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-4 text-lg text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                      onKeyDown={(e) => e.key === 'Enter' && evaluateArenaSentence()}
                    />
                    <button
                      onClick={evaluateArenaSentence}
                      disabled={arenaLoading || !arenaInput.trim()}
                      className="w-full py-4 bg-indigo-600 rounded-2xl font-black text-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {arenaLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Sword className="w-6 h-6" />}
                      {arenaLoading ? "Attacking..." : "Attack"}
                    </button>
                  </div>
                </div>
              )}

              {arenaState === 'result' && (
                <div className="animate-in zoom-in duration-500">
                  <Trophy className="w-32 h-32 text-yellow-500 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]" />
                  <h2 className="text-5xl font-black mb-4">VICTORY!</h2>
                  <p className="text-slate-400 mb-8 text-lg">You destroyed the Grammar Monster and earned 500 XP!</p>
                  <button
                    onClick={() => {
                      setArenaState('idle');
                    }}
                    className="px-8 py-4 bg-indigo-600 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'profile' && (`;

content = content.replace(blockRegex, newArenaUI);

// Add the Tour Overlay at the end before the last closing </div> of App
const tourUI = `
      {/* Feature Tour Overlay */}
      {tourStep > 0 && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 transition-all duration-300">
          <div className="bg-white max-w-sm w-full rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in-95">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xl border-4 border-white shadow-sm">
              {tourStep}
            </div>
            
            {tourStep === 1 && (
              <div className="text-center mt-4">
                <Search className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-900 mb-2">Global Dictionary</h3>
                <p className="text-slate-500 font-medium">The Dictionary is now always available! Just tap the 🔍 icon at the top right of the screen.</p>
              </div>
            )}

            {tourStep === 2 && (
              <div className="text-center mt-4">
                <Languages className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-900 mb-2">Grammar Hub</h3>
                <p className="text-slate-500 font-medium">Grammar lessons have moved inside the <b>Journey</b> tab. Look for the big purple button!</p>
              </div>
            )}

            {tourStep === 3 && (
              <div className="text-center mt-4">
                <Sword className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-slate-900 mb-2">The Arena</h3>
                <p className="text-slate-500 font-medium">Say goodbye to boring tests! Defeat monsters by building sentences in the new Arena. Tap the ⚔️ icon below.</p>
              </div>
            )}

            <button 
              onClick={nextTourStep}
              className="mt-8 w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              {tourStep === 3 ? "Let's Go!" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;`;

const appEndRegex = /<\/div>\s*?\);\s*?};\s*?export default App;/s;
content = content.replace(appEndRegex, tourUI);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Refactor complete.");
