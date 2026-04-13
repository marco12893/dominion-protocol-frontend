import { MAP_HEIGHT, MAP_WIDTH, UNIT_DISPLAY_INFO } from "@/features/game/constants";

function ProjectileSprite({ projectile }) {
  if (projectile.variantId === "fighter_bullet") {
    return (
      <div
        className="absolute pointer-events-none"
        style={{
          left: projectile.currentX,
          top: projectile.currentY,
          transform: `translate(-50%, -50%) rotate(${projectile.angle || 0}rad)`,
          zIndex: 40,
        }}
      >
        <div className="flex flex-col gap-[10px]">
          <div className="w-6 h-px bg-white/30 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
          <div className="w-6 h-px bg-white/30 shadow-[0_0_4px_rgba(255,255,255,0.4)]" />
        </div>
      </div>
    );
  }

  if (projectile.variantId === "aa_missile" || projectile.variantId === "antiTank_missile") {
    return (
      <div
        className="absolute pointer-events-none z-40"
        style={{
          left: projectile.currentX,
          top: projectile.currentY,
          transform: `translate(-50%, -50%) rotate(${projectile.angle}rad)`,
        }}
      >
        <div
          className={`h-1.5 w-4 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] ${
            projectile.variantId === "aa_missile" ? "bg-cyan-300" : "bg-orange-400"
          }`}
        />
        <div className="absolute right-full top-1/2 -translate-y-1/2 w-8 h-1 bg-gradient-to-r from-transparent to-white/40 blur-[2px]" />
      </div>
    );
  }

  if (projectile.variantId === "bomber_bomb") {
    return (
      <div
        className="absolute pointer-events-none z-40"
        style={{
          left: projectile.currentX,
          top: projectile.currentY,
          transform: `translate(-50%, -50%) rotate(${projectile.angle || 0}rad)`,
        }}
      >
        <div className="absolute right-[60%] top-1/2 -translate-y-1/2 w-6 h-2 bg-gradient-to-r from-transparent to-orange-300/70 blur-[3px]" />
        <div className="relative h-3 w-2.5 rounded-full border border-orange-100/60 bg-gradient-to-b from-slate-200 to-slate-700 shadow-[0_0_12px_rgba(251,146,60,0.55)]" />
      </div>
    );
  }

  return null;
}

function UnitSprite({
  hoveredUnitId,
  playerColor,
  selectedUnitIdSet,
  unit,
  unitsById,
  visualEffects,
}) {
  const isOwned = unit.owner === playerColor;
  const isSelected = isOwned && selectedUnitIdSet.has(unit.id);
  const healthPercent = unit.maxHealth > 0 ? (unit.health / unit.maxHealth) * 100 : 0;
  const isAttacking = isOwned && unit.attackTargetId;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: `${unit.x}px`,
        top: `${unit.y}px`,
        width: 0,
        height: 0,
        zIndex: unit.isPlane || unit.isHelicopter ? 60 : isSelected ? 50 : 30,
        transition: "left 0.1s linear, top 0.1s linear",
      }}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: "-18px",
          width: "28px",
          height: "4px",
          borderRadius: "2px",
          backgroundColor: "rgba(10, 15, 25, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          overflow: "hidden",
          boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}
      >
        <div
          style={{
            width: `${healthPercent}%`,
            height: "100%",
            borderRadius: "1px",
            backgroundColor:
              healthPercent > 60 ? "#34d399" : healthPercent > 30 ? "#fbbf24" : "#f43f5e",
            transition: "width 0.15s ease",
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)",
          }}
        />
      </div>

      <div
        className="absolute h-10 w-10 rounded-full border transition-all"
        style={{
          transform: "translate(-50%, -50%)",
          borderColor: isSelected
            ? "rgba(252,211,77,0.8)"
            : unit.isHoldingPosition
              ? "rgba(34,211,238,0.4)"
              : isAttacking
                ? "rgba(244,63,94,0.4)"
                : "transparent",
          boxShadow: isSelected ? "0 0 15px rgba(252,211,77,0.4)" : "none",
          opacity: isSelected || unit.isHoldingPosition || isAttacking ? 1 : 0,
          scale: isSelected || unit.isHoldingPosition || isAttacking ? 1 : 0.5,
        }}
      />

      {hoveredUnitId === unit.id && !isSelected && (
        <div
          className="absolute h-11 w-11 rounded-full border-[3px] border-dotted animate-pulse-bold"
          style={{
            transform: "translate(-50%, -50%)",
            borderColor:
              unit.owner === playerColor ? "rgba(252,211,77,0.9)" : "rgba(244,63,94,0.9)",
            pointerEvents: "none",
          }}
        />
      )}

      <div
        className={`absolute flex items-center justify-center text-[8px] font-black leading-none shadow-inner ${
          unit.owner === "red"
            ? "border border-rose-300/60 bg-gradient-to-br from-rose-500 to-rose-700 text-rose-50 shadow-[0_0_20px_rgba(244,63,94,0.6)]"
            : "border border-cyan-200/60 bg-gradient-to-br from-cyan-400 to-cyan-600 text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.5)]"
        } ${
          unit.variantId === "rifleman"
            ? "h-7 w-7 rounded-full"
            : unit.variantId === "antiTank"
              ? "h-7 w-7 rounded-full"
              : unit.variantId === "armoredCar"
                ? "h-8 w-8 rounded-md"
                : unit.variantId === "lightTank"
                  ? "h-9 w-10 rounded-none"
                  : unit.variantId === "heavyTank"
                    ? "h-11 w-13 rounded-none shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                    : unit.variantId === "antiAir"
                      ? "h-9 w-9 rounded-sm"
                      : unit.variantId === "attackHelicopter"
                        ? "h-10 w-10 rounded-full border-dashed"
                        : unit.variantId === "fighter"
                          ? "h-14 w-12 shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                          : unit.variantId === "bomber"
                            ? "h-16 w-16 shadow-[0_0_30px_rgba(251,146,60,0.22)]"
                          : "h-7 w-7 rounded-sm"
        }`}
        style={{
          transform: `translate(-50%, -50%) rotate(${(unit.angle ?? 0) * (180 / Math.PI)}deg)`,
          clipPath:
            unit.variantId === "fighter"
              ? "polygon(100% 50%, 0% 0%, 25% 50%, 0% 100%)"
              : unit.variantId === "bomber"
                ? "polygon(100% 50%, 74% 26%, 60% 0%, 46% 18%, 0% 6%, 24% 50%, 0% 94%, 46% 82%, 60% 100%, 74% 74%)"
              : "none",
        }}
      >
        {unit.variantId === "fighter" && (
          <div className="absolute top-[35%] right-[20%] w-[25%] h-[30%] bg-cyan-200/60 rounded-full shadow-[0_0_10px_rgba(165,243,252,0.8)]" />
        )}
        {unit.variantId === "bomber" && (
          <>
            <div className="absolute inset-y-[18%] right-[26%] w-[18%] rounded-full bg-orange-200/70 shadow-[0_0_12px_rgba(253,186,116,0.8)]" />
            <div className="absolute inset-y-[35%] left-[20%] right-[34%] border-y border-slate-950/35" />
          </>
        )}
        {unit.variantId === "antiAir" && (
          <div className="absolute inset-x-2 bottom-1 h-3 bg-white/20 border border-white/30 rounded-t-sm" />
        )}
        {unit.variantId !== "fighter" && unit.variantId !== "bomber" && (
          <div className={unit.variantId === "antiAir" ? "absolute top-1" : ""}>
            {UNIT_DISPLAY_INFO[unit.variantId]?.shortLabel || "?"}
          </div>
        )}
      </div>

      {unit.isFiring &&
        unit.variantId !== "antiTank" &&
        unit.variantId !== "lightTank" &&
        unit.variantId !== "antiAir" &&
        unit.variantId !== "bomber" &&
        (() => {
          const target = unitsById.get(unit.attackTargetId);
          if (!target) return null;
          const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
          const radius = unit.isHelicopter ? 18 : unit.owner !== playerColor ? 14 : 12;

          return (
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}rad) translateX(${radius + 4}px)`,
              }}
            >
              <div
                className="h-2 w-6 rounded-full bg-yellow-300 shadow-[0_0_20px_rgba(253,224,71,1)]"
                style={{ animation: "muzzle-flash 0.08s ease-in-out infinite alternate" }}
              />
            </div>
          );
        })()}

      {visualEffects.some((effect) => effect.type === "flash" && effect.shooterId === unit.id) &&
        (() => {
          const target = unitsById.get(unit.attackTargetId);
          if (!target) return null;
          const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
          const radius = unit.variantId === "heavyTank" ? 18 : 14;

          return (
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}rad) translateX(${radius + 4}px)`,
              }}
            >
              <div
                className="h-3 w-8 rounded-full bg-orange-300 shadow-[0_0_25px_rgba(255,165,0,1)]"
                style={{ animation: "discrete-flash 0.15s ease-out forwards" }}
              />
            </div>
          );
        })()}
    </div>
  );
}

export default function BattlefieldWorld({
  camera,
  hoveredUnitId,
  isAttackMoveMode,
  obstacles,
  onDoubleClick,
  onPointerDown,
  onRightClick,
  orderMarkers,
  playerColor,
  selectedUnitIds,
  selectionBounds,
  units,
  visualEffects,
  visualProjectiles,
}) {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]));
  const selectedUnitIdSet = new Set(selectedUnitIds);

  return (
    <div
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onContextMenu={onRightClick}
      className={`absolute inset-0 touch-none ${isAttackMoveMode ? "cursor-crosshair" : "cursor-default"}`}
    >
      <div
        className="absolute left-0 top-0 origin-top-left shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"
        style={{
          width: `${MAP_WIDTH}px`,
          height: `${MAP_HEIGHT}px`,
          transform: `translate3d(${-camera.x}px, ${-camera.y}px, 0)`,
          backgroundColor: "#070c13",
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.04) 2px, transparent 2px), linear-gradient(90deg, rgba(34,211,238,0.04) 2px, transparent 2px), linear-gradient(rgba(34,211,238,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.015) 1px, transparent 1px)",
          backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px",
        }}
      >
        <div className="absolute inset-0 border-[4px] border-cyan-900/40 pointer-events-none" />

        <svg className="absolute inset-0 pointer-events-none" width={MAP_WIDTH} height={MAP_HEIGHT} style={{ zIndex: 10 }}>
          {selectedUnitIds.map((unitId) => {
            const unit = unitsById.get(unitId);
            if (!unit?.orderQueue?.length) return null;

            const points = [{ x: unit.x, y: unit.y }];
            if (unit.isMoving) {
              points.push({ x: unit.destinationX, y: unit.destinationY });
            }

            unit.orderQueue.forEach((order) => {
              if (order.position) {
                points.push(order.position);
              } else if (order.type === "attack" && order.targetId) {
                const target = unitsById.get(order.targetId);
                if (target) points.push({ x: target.x, y: target.y });
              }
            });

            if (points.length < 2) return null;

            return (
              <polyline
                key={`queue-${unit.id}`}
                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke={
                  unit.orderQueue[0].type === "attackMove" || unit.orderQueue[0].type === "attack"
                    ? "rgba(244, 63, 94, 0.5)"
                    : "rgba(74, 222, 128, 0.5)"
                }
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            );
          })}
        </svg>

        {orderMarkers.map((marker) => (
          <div
            key={marker.id}
            className="absolute border-[2px] rounded-full flex items-center justify-center"
            style={{
              left: marker.x,
              top: marker.y,
              width: 24,
              height: 24,
              transform: "translate(-50%, -50%) scale(1)",
              borderColor:
                marker.type === "move" ? "rgba(74,222,128,0.8)" : "rgba(244,63,94,0.8)",
              pointerEvents: "none",
              zIndex: 15,
              animation: "pulse-marker 0.35s ease-out forwards",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: marker.type === "move" ? "#4ade80" : "#f43f5e" }}
            />
          </div>
        ))}

        {obstacles.map((obstacle) => (
          <div
            key={obstacle.id}
            className="absolute rounded-xl border-t border-l border-white/10 bg-[linear-gradient(135deg,rgba(30,41,59,0.8),rgba(15,23,42,0.95))] shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
            style={{
              left: `${obstacle.x}px`,
              top: `${obstacle.y}px`,
              width: `${obstacle.width}px`,
              height: `${obstacle.height}px`,
            }}
          >
            <div className="absolute inset-x-2 top-0 h-px bg-cyan-400/20" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(34,211,238,0.03)_50%,transparent_100%)] opacity-50 block" />
          </div>
        ))}

        {selectionBounds && (
          <div
            className="pointer-events-none absolute border border-cyan-300 bg-cyan-400/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]"
            style={{
              left: `${selectionBounds.left}px`,
              top: `${selectionBounds.top}px`,
              width: `${selectionBounds.width}px`,
              height: `${selectionBounds.height}px`,
            }}
          />
        )}

        {units.map((unit) => (
          <UnitSprite
            key={unit.id}
            hoveredUnitId={hoveredUnitId}
            playerColor={playerColor}
            selectedUnitIdSet={selectedUnitIdSet}
            unit={unit}
            unitsById={unitsById}
            visualEffects={visualEffects}
          />
        ))}

        {visualProjectiles.map((projectile) => (
          <ProjectileSprite key={projectile.id} projectile={projectile} />
        ))}

        {visualEffects
          .filter((effect) => effect.type === "explosion")
          .map((effect) => (
            <div
              key={effect.id}
              className="absolute pointer-events-none"
              style={{
                left: effect.x,
                top: effect.y,
                width: effect.radius * 2,
                height: effect.radius * 2,
                transform: "translate(-50%, -50%)",
                zIndex: 45,
              }}
            >
              <div
                className="absolute inset-0 rounded-full border-4 border-orange-300/80"
                style={{ animation: "explosion-ring 0.45s ease-out forwards" }}
              />
              <div
                className="absolute inset-[18%] rounded-full bg-orange-400/50 blur-md"
                style={{ animation: "explosion-core 0.4s ease-out forwards" }}
              />
              <div
                className="absolute inset-[30%] rounded-full bg-yellow-200/80 blur-sm"
                style={{ animation: "explosion 0.35s ease-out forwards" }}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
