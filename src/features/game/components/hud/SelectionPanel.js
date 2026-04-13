import { getUnitDisplay } from "@/features/game/utils/gameHelpers";

export default function SelectionPanel({
  hoveredTooltip,
  onHoverTooltipChange,
  onSelectSingleUnit,
  selectedUnit,
  selectedUnitDisplay,
  selectedUnitIds,
  units,
}) {
  if (selectedUnit && selectedUnitDisplay) {
    const healthRatio =
      selectedUnit.maxHealth > 0 ? selectedUnit.health / selectedUnit.maxHealth : 0;

    return (
      <div
        className="flex items-center justify-center p-3 overflow-visible"
        style={{ width: "calc(100% * 7 / 12)" }}
      >
        <div className="flex items-center justify-center gap-8 w-full">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="relative">
              <div
                className={`w-[90px] h-[90px] rounded-lg border-2 ${
                  selectedUnit.owner === "red"
                    ? "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                    : "border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                } bg-gradient-to-br from-[#0d1a2a] to-[#061018] flex items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]`}
              >
                <div
                  className={`w-14 h-14 flex items-center justify-center text-xl font-black ${
                    selectedUnit.variantId === "rifleman"
                      ? "rounded-full"
                      : selectedUnit.variantId === "antiTank"
                        ? "rounded-full"
                        : selectedUnit.variantId === "armoredCar"
                          ? "rounded-md"
                          : selectedUnit.variantId === "lightTank"
                            ? "rounded-none"
                            : "rounded-sm"
                  } border-2 ${
                    selectedUnit.owner === "red"
                      ? "border-rose-300/60 bg-gradient-to-br from-rose-400 to-rose-600 shadow-[0_0_25px_rgba(244,63,94,0.6)]"
                      : "border-cyan-300/60 bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_25px_rgba(34,211,238,0.6)]"
                  } text-white`}
                >
                  {selectedUnitDisplay.shortLabel}
                </div>
              </div>
              <div
                className={`absolute -top-0.5 -left-0.5 w-2.5 h-2.5 border-t-2 border-l-2 ${
                  selectedUnit.owner === "red" ? "border-rose-400/70" : "border-cyan-400/70"
                }`}
              />
              <div
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t-2 border-r-2 ${
                  selectedUnit.owner === "red" ? "border-rose-400/70" : "border-cyan-400/70"
                }`}
              />
              <div
                className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 border-b-2 border-l-2 ${
                  selectedUnit.owner === "red" ? "border-rose-400/70" : "border-cyan-400/70"
                }`}
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-b-2 border-r-2 ${
                  selectedUnit.owner === "red" ? "border-rose-400/70" : "border-cyan-400/70"
                }`}
              />
            </div>

            <div className="mt-2 w-[90px]">
              <div className="relative w-full h-[6px] rounded-full bg-[#0a1520] border border-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${healthRatio * 100}%`,
                    background:
                      healthRatio > 0.6
                        ? "linear-gradient(90deg, #22c55e, #34d399)"
                        : healthRatio > 0.3
                          ? "linear-gradient(90deg, #eab308, #fbbf24)"
                          : "linear-gradient(90deg, #dc2626, #f43f5e)",
                    boxShadow:
                      healthRatio > 0.6
                        ? "0 0 8px rgba(34,197,94,0.5)"
                        : healthRatio > 0.3
                          ? "0 0 8px rgba(234,179,8,0.5)"
                          : "0 0 8px rgba(220,38,38,0.5)",
                  }}
                />
              </div>
              <p className="text-[10px] text-center mt-0.5 text-slate-300 font-mono tracking-wide">
                {Math.ceil(selectedUnit.health)}
                <span className="text-slate-500">/</span>
                {selectedUnit.maxHealth}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <h2 className="text-lg font-bold text-white tracking-wide uppercase drop-shadow-md">
              {selectedUnitDisplay.name}
            </h2>

            <p className="text-[11px] text-slate-400 mt-1">
              Kills: <span className="text-amber-300 font-semibold">{selectedUnit.kills}</span>
            </p>

            <div className="flex items-center justify-center gap-3 mt-2">
              <div
                className="relative group"
                onMouseEnter={() => onHoverTooltipChange("armor")}
                onMouseLeave={() => onHoverTooltipChange(null)}
              >
                <div className="w-8 h-8 rounded border border-slate-600/60 bg-slate-800/80 flex items-center justify-center cursor-help transition hover:border-cyan-500/50 hover:bg-slate-700/80">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-300"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                {hoveredTooltip === "armor" && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-4 rounded-xl bg-[#0c1829]/95 border border-cyan-500/30 shadow-[0_15px_30px_rgba(0,0,0,0.8)] text-[11px] text-slate-200 whitespace-nowrap z-[60] backdrop-blur-md min-w-[160px]">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/20">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-cyan-400"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <div className="font-bold text-cyan-300 uppercase tracking-wider text-[10px]">
                        Defense Profile
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-400">Plating Armor:</span>
                        <span className="text-white font-mono font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                          {selectedUnit.armor}
                        </span>
                      </div>
                      <div className="flex justify-between items-center gap-4">
                        <span className="text-slate-400">Move Speed:</span>
                        <span className="text-white font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          {selectedUnit.speed}
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-cyan-900/40" />
                  </div>
                )}
              </div>

              <div
                className="relative group"
                onMouseEnter={() => onHoverTooltipChange("damage")}
                onMouseLeave={() => onHoverTooltipChange(null)}
              >
                <div className="w-8 h-8 rounded border border-slate-600/60 bg-slate-800/80 flex items-center justify-center cursor-help transition hover:border-rose-500/50 hover:bg-slate-700/80">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-300"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="12" x2="12" y2="18" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                </div>
                {hoveredTooltip === "damage" && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 p-4 rounded-xl bg-[#0d090a]/95 border border-rose-500/30 shadow-[0_15px_30px_rgba(0,0,0,0.8)] text-[11px] text-slate-200 min-w-[220px] z-[60] backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-rose-500/20">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-rose-400"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <div className="font-bold text-rose-300 uppercase tracking-wider text-[10px]">
                        Weaponry: {selectedUnitDisplay.name}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Base ATK:</span>
                        <span className="text-white font-mono font-bold">
                          {selectedUnit.attackDamage}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Range:</span>
                        <span className="text-white font-mono font-bold">
                          {selectedUnit.attackRange}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">Rate:</span>
                        <span className="text-white font-mono font-bold">
                          {selectedUnit.attackCooldownTime}s
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">
                        Damage vs. Armor Classes
                      </div>
                      {Object.entries(selectedUnit.damageModifiers || {}).map(
                        ([type, modifier]) => {
                          const damageAmount =
                            Math.floor(selectedUnit.attackDamage * modifier * 10) / 10;

                          return (
                            <div
                              key={type}
                              className="flex justify-between items-center bg-white/5 px-2 py-1 rounded border border-white/5"
                            >
                              <span className="text-[10px] capitalize text-slate-300">
                                {type}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {modifier > 1 ? (
                                  <span className="text-emerald-400 text-[9px] font-bold">▲</span>
                                ) : modifier < 1 ? (
                                  <span className="text-rose-400 text-[9px] font-bold">▼</span>
                                ) : null}
                                <span
                                  className={`font-mono font-bold ${
                                    modifier > 1
                                      ? "text-emerald-400"
                                      : modifier < 0.5
                                        ? "text-rose-400"
                                        : "text-white"
                                  }`}
                                >
                                  {damageAmount}
                                </span>
                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-white/5 text-[9px] text-slate-500 italic leading-tight">
                      * Values shown are before target defense subtraction.
                    </div>

                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-rose-900/40" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 mt-2">
              {selectedUnitDisplay.attributes.map((attribute) => (
                <span
                  key={attribute}
                  className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border border-slate-600/50 bg-slate-800/60 text-slate-300"
                >
                  {attribute}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedUnitIds.length > 1) {
    return (
      <div
        className="flex items-center justify-center p-3 overflow-visible"
        style={{ width: "calc(100% * 7 / 12)" }}
      >
        <div className="w-full h-full flex flex-col">
          <div className="flex items-center gap-2 mb-2 flex-shrink-0">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              {selectedUnitIds.length} Units Selected
            </span>
          </div>
          <div
            className="flex flex-wrap gap-1.5 content-start overflow-y-auto flex-1 pr-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(100,116,139,0.3) transparent" }}
          >
            {selectedUnitIds.map((unitId) => {
              const unit = units.find((entry) => entry.id === unitId);
              if (!unit) {
                return null;
              }

              const display = getUnitDisplay(unit);
              const hpPercent = unit.maxHealth > 0 ? (unit.health / unit.maxHealth) * 100 : 0;
              const hpColor = hpPercent > 60 ? "#34d399" : hpPercent > 30 ? "#fbbf24" : "#f43f5e";

              return (
                <button
                  key={unitId}
                  onClick={() => onSelectSingleUnit(unitId)}
                  className={`relative flex flex-col items-center cursor-pointer rounded-md border ${
                    unit.owner === "red"
                      ? "border-rose-800/40 hover:border-rose-400/60"
                      : "border-cyan-800/40 hover:border-cyan-400/60"
                  } bg-[#0a1520]/80 hover:bg-[#0d1a2a] transition-all group`}
                  style={{ width: 52, height: 60 }}
                  title={`${display.name} - ${Math.ceil(unit.health)}/${unit.maxHealth} HP`}
                >
                  <div className="flex-1 flex items-center justify-center pt-1">
                    <div
                      className={`w-7 h-7 flex items-center justify-center text-[8px] font-extrabold leading-none border ${
                        unit.owner === "red"
                          ? "border-rose-200/50 from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)] group-hover:shadow-[0_0_14px_rgba(244,63,94,0.5)]"
                          : "border-cyan-200/50 from-cyan-400 to-cyan-600 shadow-[0_0_10px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_14px_rgba(34,211,238,0.5)]"
                      } bg-gradient-to-br text-white transition-shadow ${
                        unit.variantId === "rifleman" || unit.variantId === "attackHelicopter"
                          ? "rounded-full"
                          : "rounded-sm"
                      }`}
                    >
                      {display.shortLabel}
                    </div>
                  </div>
                  <div className="w-full px-1 pb-1.5">
                    <div className="w-full h-[3px] rounded-full bg-[#0a0f18] border border-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
                      />
                    </div>
                    <p className="text-[7px] text-center text-slate-500 font-mono mt-px leading-none">
                      {Math.ceil(unit.health)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center p-3 overflow-visible"
      style={{ width: "calc(100% * 7 / 12)" }}
    >
      <div className="text-sm text-slate-500 italic">No unit selected</div>
    </div>
  );
}
