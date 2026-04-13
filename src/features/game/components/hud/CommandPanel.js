export default function CommandPanel({
  allSelectedHoldingPosition,
  isAttackMoveMode,
  onActivateAttackMove,
  onHoldPosition,
  onStop,
  selectedUnitIds,
}) {
  return (
    <div className="flex-shrink-0 p-2 pr-3" style={{ width: "calc(100% * 3 / 12)" }}>
      <div className="grid grid-cols-3 gap-1.5 h-full content-start pt-1">
        <button
          id="cmd-attack-btn"
          onClick={onActivateAttackMove}
          className={`relative w-full aspect-square rounded-md border flex flex-col items-center justify-center cursor-pointer transition-all ${
            isAttackMoveMode
              ? "border-amber-400/80 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              : "border-slate-600/50 bg-slate-800/70 hover:border-cyan-500/50 hover:bg-slate-700/70"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={isAttackMoveMode ? "text-amber-300" : "text-slate-300"}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
          <span className="text-[8px] mt-0.5 font-bold tracking-wide text-slate-400">A</span>
        </button>

        <button
          id="cmd-stop-btn"
          onClick={onStop}
          className="relative w-full aspect-square rounded-md border border-slate-600/50 bg-slate-800/70 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-cyan-500/50 hover:bg-slate-700/70"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-300">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity="0.8" />
          </svg>
          <span className="text-[8px] mt-0.5 font-bold tracking-wide text-slate-400">S</span>
        </button>

        <button
          id="cmd-hold-btn"
          onClick={onHoldPosition}
          className={`relative w-full aspect-square rounded-md border flex flex-col items-center justify-center cursor-pointer transition-all ${
            allSelectedHoldingPosition
              ? "border-cyan-400/80 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
              : "border-slate-600/50 bg-slate-800/70 hover:border-cyan-500/50 hover:bg-slate-700/70"
          }`}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={allSelectedHoldingPosition ? "text-cyan-300" : "text-slate-300"}
          >
            <path d="M12 2v20M5 12h14" />
            <rect x="8" y="8" width="8" height="8" rx="1" />
          </svg>
          <span className="text-[8px] mt-0.5 font-bold tracking-wide text-slate-400">H</span>
        </button>

        {[...Array(6)].map((_, index) => (
          <div
            key={`empty-${index}`}
            className="w-full aspect-square rounded-md border border-slate-700/30 bg-slate-900/30"
          />
        ))}
      </div>

      {selectedUnitIds.length === 0 && (
        <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-500 text-center">
          No active commands
        </div>
      )}
    </div>
  );
}

