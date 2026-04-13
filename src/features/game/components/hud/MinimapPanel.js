import { MAP_HEIGHT, MAP_WIDTH } from "@/features/game/constants";

export default function MinimapPanel({
  camera,
  obstacles,
  onIssueMove,
  onNavigate,
  playerColor,
  selectedUnitIds,
  units,
  windowSize,
}) {
  function getMapPointFromEvent(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width;
    const clickY = (event.clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(MAP_WIDTH, clickX * MAP_WIDTH)),
      y: Math.max(0, Math.min(MAP_HEIGHT, clickY * MAP_HEIGHT)),
    };
  }

  return (
    <div className="flex-shrink-0 p-2" style={{ width: "calc(100% * 2 / 12)" }}>
      <div
        className="relative w-full h-full rounded-lg overflow-hidden border border-white/15 bg-[#070c13] shadow-[0_0_20px_rgba(0,0,0,0.6)] cursor-crosshair"
        onClick={(event) => onNavigate(getMapPointFromEvent(event))}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (selectedUnitIds.length === 0) {
            return;
          }

          onIssueMove(getMapPointFromEvent(event));
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          {obstacles.map((obstacle) => (
            <div
              key={obstacle.id}
              className="absolute bg-slate-600/40 rounded-[1px]"
              style={{
                left: `${(obstacle.x / MAP_WIDTH) * 100}%`,
                top: `${(obstacle.y / MAP_HEIGHT) * 100}%`,
                width: `${(obstacle.width / MAP_WIDTH) * 100}%`,
                height: `${(obstacle.height / MAP_HEIGHT) * 100}%`,
              }}
            />
          ))}
          <div
            className="absolute border border-white/60 bg-white/5 transition-all duration-75"
            style={{
              left: `${(camera.x / MAP_WIDTH) * 100}%`,
              top: `${(camera.y / MAP_HEIGHT) * 100}%`,
              width: `${(windowSize.width / MAP_WIDTH) * 100}%`,
              height: `${(windowSize.height / MAP_HEIGHT) * 100}%`,
            }}
          />
          {units.map((unit) => (
            <div
              key={unit.id}
              className={`absolute w-[5px] h-[5px] rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ${
                unit.owner === "red"
                  ? "bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]"
                  : "bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]"
              }`}
              style={{
                left: `${(unit.x / MAP_WIDTH) * 100}%`,
                top: `${(unit.y / MAP_HEIGHT) * 100}%`,
              }}
              title={unit.owner === playerColor ? "Friendly unit" : "Enemy unit"}
            />
          ))}
        </div>

        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/30 pointer-events-none" />
      </div>
    </div>
  );
}

