const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `{arenaState === 'battling' && arenaWordObj && (
                <div className="animate-in fade-in slide-in-from-bottom-8">`;

const replacement = `{arenaState === 'battling' && arenaWordObj && (
                <div className="animate-in fade-in slide-in-from-bottom-8">
                  {/* Exit/Flee Header */}
                  <div className="flex justify-between items-center mb-6">
                    <button 
                      onClick={() => setArenaState('idle')}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors px-3 py-1.5 bg-slate-800 rounded-lg shadow-sm active:scale-95 border border-slate-700"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest">Flee</span>
                    </button>
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 flex items-center gap-1"><Flame className="w-3 h-3"/> Boss Battle</span>
                  </div>`;

if(content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Refactor 4 (Back button) complete.");
} else {
  console.log("Could not find the target string.");
}
