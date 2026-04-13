export default function ColorChooserModal({ onJoin, teamSelections }) {
  const blueTaken = teamSelections.blue?.socketId && teamSelections.blue?.isOnline;
  const redTaken = teamSelections.red?.socketId && teamSelections.red?.isOnline;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl">
      <div className="relative max-w-2xl w-full p-8 rounded-2xl border border-white/10 bg-[#0f1722]/90 shadow-2xl overflow-hidden">
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center mb-10">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-400 font-bold mb-2">
            Initialize Session
          </p>
          <h2 className="text-4xl font-bold text-white tracking-tight">
            Deployment Authorization
          </h2>
          <p className="text-slate-400 mt-4 max-w-md mx-auto">
            Select your command frequency to assume control of battalion assets. Multiple
            commanders cannot share the same frequency.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <button
            disabled={blueTaken}
            onClick={() => onJoin("blue")}
            className={`group relative flex flex-col items-center p-8 rounded-xl border-2 transition-all duration-300 ${
              blueTaken
                ? "border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed"
                : "border-cyan-500/20 bg-cyan-500/5 hover:border-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]"
            }`}
          >
            <div
              className={`w-20 h-20 rounded-full mb-6 flex items-center justify-center border-2 transition-transform group-hover:scale-110 ${
                blueTaken
                  ? "border-slate-700 bg-slate-800 text-slate-600"
                  : "border-cyan-400 bg-cyan-500/20 text-cyan-300"
              }`}
            >
              <span className="text-3xl font-black">B</span>
            </div>
            <h3 className={`text-xl font-bold mb-2 ${blueTaken ? "text-slate-600" : "text-cyan-100"}`}>
              BLUE OPS
            </h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              {blueTaken ? "Channel Occupied" : "Signal Available"}
            </p>
            {!blueTaken && (
              <div className="absolute inset-0 rounded-xl border border-cyan-400/0 group-hover:border-cyan-400/50 transition-colors" />
            )}
          </button>

          <button
            disabled={redTaken}
            onClick={() => onJoin("red")}
            className={`group relative flex flex-col items-center p-8 rounded-xl border-2 transition-all duration-300 ${
              redTaken
                ? "border-slate-800 bg-slate-900/50 opacity-50 cursor-not-allowed"
                : "border-rose-500/20 bg-rose-500/5 hover:border-rose-400 hover:bg-rose-500/10 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)]"
            }`}
          >
            <div
              className={`w-20 h-20 rounded-full mb-6 flex items-center justify-center border-2 transition-transform group-hover:scale-110 ${
                redTaken
                  ? "border-slate-700 bg-slate-800 text-slate-600"
                  : "border-rose-400 bg-rose-500/20 text-rose-300"
              }`}
            >
              <span className="text-3xl font-black">R</span>
            </div>
            <h3 className={`text-xl font-bold mb-2 ${redTaken ? "text-slate-600" : "text-rose-100"}`}>
              RED OPS
            </h3>
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              {redTaken ? "Channel Occupied" : "Signal Available"}
            </p>
            {!redTaken && (
              <div className="absolute inset-0 rounded-xl border border-rose-400/0 group-hover:border-rose-400/50 transition-colors" />
            )}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">
            Awaiting Command Input...
          </p>
        </div>
      </div>
    </div>
  );
}

