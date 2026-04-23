export default function BattlefieldTopOverlay({
  isConnected,
  notifications,
  onReset,
  opponentDisconnected,
  playerColor,
  isFullscreen,
  onToggleFullscreen,
  activeLayer,
  onToggleLayer,
}) {
  return (
    <>
      <div className="absolute top-4 left-4 z-50 pointer-events-auto flex flex-col gap-3 max-w-xs">
        <div className="rounded-xl border border-white/10 bg-[#0f1722]/80 backdrop-blur-md p-4 shadow-2xl">
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400 font-bold">
            Dominion Protocol
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white drop-shadow-md">
            {activeLayer === 3 ? "RTS Prototype" : "Strategic Map"}
          </h1>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0f1722]/70 backdrop-blur-sm p-3 text-xs shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Connection</span>
            <span
              className={`flex items-center gap-1.5 ${
                isConnected ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-emerald-400" : "bg-amber-400"
                } animate-pulse`}
              />
              {isConnected ? "Online" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-3 pointer-events-none">
        {playerColor && (
          <div
            className={`px-6 py-2 rounded-full border-2 bg-slate-900/90 backdrop-blur-md shadow-2xl flex items-center gap-3 transition-all duration-500 scale-in-center ${
              playerColor === "red"
                ? "border-rose-500/50 shadow-rose-500/20"
                : "border-cyan-500/50 shadow-cyan-500/20"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                playerColor === "red" ? "bg-rose-500" : "bg-cyan-500"
              }`}
            />
            <span className="text-[10px] uppercase tracking-[0.3em] font-black text-white">
              Commanding:{" "}
              <span className={playerColor === "red" ? "text-rose-400" : "text-cyan-400"}>
                {playerColor} Ops
              </span>
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`px-4 py-2 rounded border bg-slate-950/90 backdrop-blur-sm shadow-xl flex items-center gap-3 animate-notification ${
                notification.type === "red"
                  ? "border-rose-500/30"
                  : notification.type === "blue"
                    ? "border-cyan-500/30"
                    : "border-white/10"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  notification.type === "red"
                    ? "bg-rose-500"
                    : notification.type === "blue"
                      ? "bg-cyan-500"
                      : "bg-white"
                }`}
              />
              <span className="text-[10px] font-bold tracking-widest text-slate-100 uppercase">
                {notification.message}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Layer toggle button */}
          <button
            id="layer-toggle-btn"
            onClick={onToggleLayer}
            className={`px-4 py-2.5 rounded border backdrop-blur-md text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl group ${
              activeLayer === 2
                ? "border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400"
                : "border-white/10 bg-[#0f1722]/80 hover:bg-[#1a2635] text-slate-400 hover:text-cyan-400"
            }`}
            title={activeLayer === 3 ? "Switch to Hex Grid (Layer 2)" : "Switch to RTS (Layer 3)"}
          >
            {activeLayer === 2 ? (
              /* Hexagon icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            ) : (
              /* Grid/crosshair icon */
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
            )}
            <span>{activeLayer === 2 ? "Layer 2" : "Layer 3"}</span>
          </button>

          <button
            id="fullscreen-toggle-btn"
            onClick={onToggleFullscreen}
            className="p-2.5 rounded border border-white/10 bg-[#0f1722]/80 hover:bg-[#1a2635] text-cyan-400/80 hover:text-cyan-400 transition-all backdrop-blur-md flex items-center justify-center shadow-xl group"
            title={isFullscreen ? "Exit Fullscreen (f)" : "Enter Fullscreen (f)"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:scale-110 transition-transform">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>

          <button
            id="reset-player-btn"
            onClick={onReset}
            className="px-5 py-2.5 rounded border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-2 shadow-xl"
          >
            <span>☣</span> Global Reset
          </button>
        </div>

        {opponentDisconnected && playerColor && (
          <div className="px-4 py-1.5 bg-rose-600/20 border border-rose-500/50 rounded backdrop-blur-md animate-pulse">
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
              <span className="text-sm">⚠</span> Opponent Disconnected
            </p>
          </div>
        )}
      </div>
    </>
  );
}

