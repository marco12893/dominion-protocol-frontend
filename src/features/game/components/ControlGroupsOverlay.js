import { MAP_HEIGHT, MAP_WIDTH, UNIT_DISPLAY_INFO } from "@/features/game/constants";

export default function ControlGroupsOverlay({
  controlGroups,
  playerColor,
  selectedUnitIds,
  units,
  windowSize,
  onCenterGroup,
  onSelectGroup,
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-end gap-[3px]"
      style={{ bottom: 185 }}
    >
      {Object.entries(controlGroups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, ids]) => {
          const validUnits = ids
            .map((id) => units.find((unit) => unit.id === id && unit.owner === playerColor && unit.health > 0))
            .filter(Boolean);

          if (validUnits.length === 0) {
            return null;
          }

          const displayUnit = validUnits[0];
          const displayInfo = UNIT_DISPLAY_INFO[displayUnit.variantId] || { shortLabel: "?" };
          const isSelectedGroup =
            selectedUnitIds.length === validUnits.length &&
            validUnits.every((unit) => selectedUnitIds.includes(unit.id));

          return (
            <button
              key={`cg-${key}`}
              className="group flex flex-col items-center"
              onClick={() => onSelectGroup(validUnits.map((unit) => unit.id))}
              onDoubleClick={(event) => {
                event.preventDefault();
                onCenterGroup(validUnits, {
                  width: Math.min(windowSize.width, MAP_WIDTH),
                  height: Math.min(windowSize.height, MAP_HEIGHT),
                });
              }}
            >
              <div className="relative w-[34px] h-[34px] bg-gradient-to-b from-[#18283a] to-[#0c141d] border border-[#2a4563] rounded shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all group-hover:border-cyan-400/80 xl:group-hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center mb-[3px]">
                <div
                  className={`w-[22px] h-[22px] flex items-center justify-center text-[10px] font-black leading-none ${
                    playerColor === "red"
                      ? "from-rose-400 to-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                      : "from-green-400 to-green-600 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                  } bg-gradient-to-br text-white ${
                    displayUnit.variantId === "rifleman" ? "rounded-full" : "rounded-sm"
                  }`}
                >
                  {displayInfo.shortLabel}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-[#0a1018] border border-cyan-900/80 text-[9px] font-bold font-mono text-cyan-200 px-1 rounded-sm shadow-md z-10 min-w-[14px] text-center">
                  {validUnits.length}
                </div>
                {isSelectedGroup && (
                  <div className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}
              </div>
              <div className="w-[18px] bg-gradient-to-b from-[#142031] to-[#090f17] border border-[#233a54] rounded-[2px] text-center text-[10px] font-bold text-slate-300 drop-shadow-md group-hover:border-cyan-400/80 group-hover:text-cyan-300 transition-colors pointer-events-none">
                {key}
              </div>
            </button>
          );
        })}
    </div>
  );
}

