"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const MAP_WIDTH = 3200;
const MAP_HEIGHT = 3200;
const UNIT_SELECTION_RADIUS = 12;
const UNIT_CLICK_RADIUS = 14;
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

const INITIAL_UNITS = [
  { id: "unit-1", owner: "player", x: 420, y: 420, health: 100, maxHealth: 100, attackTargetId: null },
  { id: "unit-2", owner: "player", x: 480, y: 480, health: 100, maxHealth: 100, attackTargetId: null },
  { id: "unit-3", owner: "player", x: 440, y: 560, health: 100, maxHealth: 100, attackTargetId: null },
  { id: "unit-4", owner: "player", x: 1720, y: 1300, health: 100, maxHealth: 100, attackTargetId: null },
  { id: "unit-5", owner: "player", x: 1820, y: 1380, health: 100, maxHealth: 100, attackTargetId: null },
  { id: "enemy-1", owner: "enemy", x: 2000, y: 2000, health: 100, maxHealth: 100, attackTargetId: null },
];

const INITIAL_OBSTACLES = [
  { id: "rock-1", x: 640, y: 510, width: 350, height: 290 },
  { id: "rock-2", x: 1470, y: 1250, width: 320, height: 440 },
  { id: "rock-3", x: 2190, y: 890, width: 420, height: 300 },
  { id: "rock-4", x: 850, y: 2350, width: 480, height: 290 },
  { id: "rock-5", x: 2600, y: 2600, width: 200, height: 300 },
];

export default function Home() {
  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState(["unit-1"]);
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [obstacles, setObstacles] = useState(INITIAL_OBSTACLES);
  const [selectionBox, setSelectionBox] = useState(null);
  const [isAttackMoveMode, setIsAttackMoveMode] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const mousePosRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({ ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false });

  // Keyboard controls
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key in keysRef.current) {
        keysRef.current[e.key] = true;
      }
      if (e.key.toLowerCase() === "a") {
        if (selectedUnitIds.length > 0) {
          setIsAttackMoveMode(true);
        }
      } else if (e.key.toLowerCase() === "s") {
        setIsAttackMoveMode(false);
        if (selectedUnitIds.length > 0) {
          socketRef.current?.emit("unit:stop", { unitIds: selectedUnitIds });
        }
      } else if (e.key === "Escape") {
        setIsAttackMoveMode(false);
      }
    }
    
    function handleKeyUp(e) {
      if (e.key in keysRef.current) {
        keysRef.current[e.key] = false;
      }
    }
    
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedUnitIds]);

  // Mouse tracking for edge pan
  useEffect(() => {
    function handleMouseMove(e) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Camera panning animation loop
  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    function updateCamera(time) {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const panSpeed = 900; // pixels per second
      const edgeThreshold = 40;
      
      let dx = 0;
      let dy = 0;

      if (keysRef.current.ArrowUp) dy -= panSpeed * dt;
      if (keysRef.current.ArrowDown) dy += panSpeed * dt;
      if (keysRef.current.ArrowLeft) dx -= panSpeed * dt;
      if (keysRef.current.ArrowRight) dx += panSpeed * dt;

      // Edge panning logic
      if (mousePosRef.current.x < edgeThreshold) dx -= panSpeed * dt;
      if (mousePosRef.current.x > window.innerWidth - edgeThreshold) dx += panSpeed * dt;
      if (mousePosRef.current.y < edgeThreshold) dy -= panSpeed * dt;
      if (mousePosRef.current.y > window.innerHeight - edgeThreshold) dy += panSpeed * dt;

      if (dx !== 0 || dy !== 0) {
        setCamera((cam) => {
          const maxCamX = Math.max(0, MAP_WIDTH - window.innerWidth);
          const maxCamY = Math.max(0, MAP_HEIGHT - window.innerHeight);
          return {
            x: Math.max(0, Math.min(maxCamX, cam.x + dx)),
            y: Math.max(0, Math.min(maxCamY, cam.y + dy)),
          };
        });
      }

      animationFrameId = requestAnimationFrame(updateCamera);
    }

    animationFrameId = requestAnimationFrame(updateCamera);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("world:state", (state) => {
      if (Array.isArray(state?.obstacles)) {
        setObstacles(state.obstacles);
      }

      if (Array.isArray(state?.units)) {
        setUnits(
          state.units.map((unit) => ({
            id: unit.id,
            owner: unit.owner,
            x: unit.x,
            y: unit.y,
            health: unit.health,
            maxHealth: unit.maxHealth,
            attackTargetId: unit.attackTargetId,
          })),
        );
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  function toMapPoint(clientX, clientY) {
    return {
      x: Math.max(0, Math.min(MAP_WIDTH, clientX + camera.x)),
      y: Math.max(0, Math.min(MAP_HEIGHT, clientY + camera.y)),
    };
  }

  function handleMapRightClick(event) {
    event.preventDefault();

    if (isAttackMoveMode) {
      setIsAttackMoveMode(false);
    }

    if (selectedUnitIds.length === 0) {
      return;
    }

    const clickPoint = toMapPoint(event.clientX, event.clientY);

    const clickedEnemy = units.find(
      (unit) =>
        unit.owner === "enemy" &&
        unit.health > 0 &&
        Math.hypot(unit.x - clickPoint.x, unit.y - clickPoint.y) <= UNIT_CLICK_RADIUS,
    );

    if (clickedEnemy) {
      socketRef.current?.emit("unit:attack", {
        unitIds: selectedUnitIds,
        targetId: clickedEnemy.id,
      });
      return;
    }

    socketRef.current?.emit("unit:move", {
      unitIds: selectedUnitIds,
      position: clickPoint,
    });
  }

  useEffect(() => {
    if (!selectionBox) {
      return;
    }

    function handlePointerMove(event) {
      const currentPoint = {
          x: Math.max(0, Math.min(MAP_WIDTH, event.clientX + camera.x)),
          y: Math.max(0, Math.min(MAP_HEIGHT, event.clientY + camera.y))
      };
      
      const nextSelectionBox = {
        startX: selectionBox.startX,
        startY: selectionBox.startY,
        currentX: currentPoint.x,
        currentY: currentPoint.y,
      };

      setSelectionBox(nextSelectionBox);
      setSelectedUnitIds(getUnitsInSelection(units, nextSelectionBox));
    }

    function handlePointerUp(event) {
      const currentPoint = {
          x: Math.max(0, Math.min(MAP_WIDTH, event.clientX + camera.x)),
          y: Math.max(0, Math.min(MAP_HEIGHT, event.clientY + camera.y))
      };
      const completedSelection = {
        startX: selectionBox.startX,
        startY: selectionBox.startY,
        currentX: currentPoint.x,
        currentY: currentPoint.y,
      };

      setSelectedUnitIds(getUnitsInSelection(units, completedSelection));
      setSelectionBox(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [selectionBox, units, camera]);

  function handleMapPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    const start = toMapPoint(event.clientX, event.clientY);

    if (isAttackMoveMode) {
      socketRef.current?.emit("unit:attackMove", {
        unitIds: selectedUnitIds,
        position: start,
      });
      setIsAttackMoveMode(false);
      return;
    }

    setSelectionBox({
      startX: start.x,
      startY: start.y,
      currentX: start.x,
      currentY: start.y,
    });
    setSelectedUnitIds(getUnitsInSelection(units, {
      startX: start.x,
      startY: start.y,
      currentX: start.x,
      currentY: start.y,
    }));
  }

  function handleMapDoubleClick(event) {
    const point = toMapPoint(event.clientX, event.clientY);
    const clickedUnit = units.find(
      (unit) =>
        unit.owner === "player" &&
        Math.abs(unit.x - point.x) <= UNIT_SELECTION_RADIUS &&
        Math.abs(unit.y - point.y) <= UNIT_SELECTION_RADIUS,
    );

    if (clickedUnit) {
      setSelectedUnitIds(
        units.filter((unit) => unit.owner === "player").map((unit) => unit.id),
      );
    }
  }

  function handleRespawnEnemy() {
    socketRef.current?.emit("enemy:respawn");
  }

  const enemyAlive = units.some(
    (unit) => unit.owner === "enemy" && unit.health > 0,
  );

  const selectionBounds = selectionBox
    ? normalizeSelection(selectionBox)
    : null;

  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      
      {/* UI Overlay */}
      <div className="absolute top-6 left-6 z-50 pointer-events-auto flex flex-col gap-4 max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-[#0f1722]/80 backdrop-blur-md p-5 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400 font-bold">
            Dominion Protocol
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white drop-shadow-md">
            RTS Prototype
          </h1>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">
            Drag to select units. Right-click to move. Hit <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-200 font-mono text-[10px]">A</kbd> for Attack Move, and <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-200 font-mono text-[10px]">S</kbd> to Stop. Edge pan or use Arrow keys to move camera.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              id="reset-player-btn"
              onClick={() => socketRef.current?.emit("player:reset")}
              className="rounded-full border border-sky-400/50 bg-sky-500/20 px-5 py-2 text-sm font-medium text-sky-200 shadow-[0_0_15px_rgba(14,165,233,0.15)] transition hover:bg-sky-400/30 hover:border-sky-400/80 cursor-pointer"
            >
              ↺ Reset Units
            </button>
            {!enemyAlive ? (
              <button
                id="respawn-enemy-btn"
                onClick={handleRespawnEnemy}
                className="rounded-full border border-rose-400/50 bg-rose-500/20 px-5 py-2 text-sm font-medium text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.15)] transition hover:bg-rose-400/30 hover:border-rose-400/80 cursor-pointer"
              >
                ↻ Respawn Enemy
              </button>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-[#0f1722]/70 backdrop-blur-sm p-4 text-sm shadow-xl">
             <div className="flex items-center justify-between mb-2">
                 <span className="text-slate-400">Connection</span>
                 <span className={`flex items-center gap-1.5 ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
                    <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
                    {isConnected ? "Online" : "Offline"}
                 </span>
             </div>
             <div className="flex items-start justify-between">
                 <span className="text-slate-400 mt-1">Selected</span>
                 <span className="text-right text-slate-200 max-w-[150px] truncate">
                     {selectedUnitIds.length > 0 ? selectedUnitIds.join(", ") : "none"}
                 </span>
             </div>
          </div>
        </div>
      </div>

      {/* Map Interaction Area */}
      <div
        ref={mapRef}
        onDoubleClick={handleMapDoubleClick}
        onPointerDown={handleMapPointerDown}
        onContextMenu={handleMapRightClick}
        className={`absolute inset-0 touch-none ${isAttackMoveMode ? 'cursor-crosshair' : 'cursor-default'}`}
      >
        {/* World Space Container */}
        <div
          className="absolute left-0 top-0 origin-top-left shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"
          style={{
            width: `${MAP_WIDTH}px`,
            height: `${MAP_HEIGHT}px`,
            transform: `translate3d(${-camera.x}px, ${-camera.y}px, 0)`,
            backgroundColor: "#070c13",
            backgroundImage: "linear-gradient(rgba(34,211,238,0.04) 2px, transparent 2px), linear-gradient(90deg, rgba(34,211,238,0.04) 2px, transparent 2px), linear-gradient(rgba(34,211,238,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.015) 1px, transparent 1px)",
            backgroundSize: "120px 120px, 120px 120px, 24px 24px, 24px 24px"
          }}
        >
          {/* Map borders decorative */}
          <div className="absolute inset-0 border-[4px] border-cyan-900/40 pointer-events-none" />

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

          {selectionBounds ? (
            <div
              className="pointer-events-none absolute border border-cyan-300 bg-cyan-400/10 shadow-[inset_0_0_20px_rgba(34,211,238,0.2)]"
              style={{
                left: `${selectionBounds.left}px`,
                top: `${selectionBounds.top}px`,
                width: `${selectionBounds.width}px`,
                height: `${selectionBounds.height}px`,
              }}
            />
          ) : null}

          {units.map((unit) => {
            const isPlayer = unit.owner === "player";
            const isSelected = isPlayer && selectedUnitIds.includes(unit.id);
            const isEnemy = unit.owner === "enemy";
            const healthPercent = unit.maxHealth > 0
              ? (unit.health / unit.maxHealth) * 100
              : 0;
            const isAttacking = isPlayer && unit.attackTargetId;

            return (
              <div
                key={unit.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75 ease-linear"
                style={{
                  left: `${unit.x}px`,
                  top: `${unit.y}px`,
                }}
              >
                {/* Health bar */}
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
                    boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
                  }}
                >
                  <div
                    style={{
                      width: `${healthPercent}%`,
                      height: "100%",
                      borderRadius: "1px",
                      backgroundColor:
                        healthPercent > 60
                          ? "#34d399"
                          : healthPercent > 30
                            ? "#fbbf24"
                            : "#f43f5e",
                      transition: "width 0.15s ease",
                      boxShadow: "inset 0 1px 1px rgba(255,255,255,0.4)"
                    }}
                  />
                </div>

                {/* Selection ring */}
                <span
                  className={`absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all ${
                    isSelected
                      ? "border-amber-300/80 shadow-[0_0_15px_rgba(252,211,77,0.4)] scale-100 opacity-100"
                      : isAttacking
                        ? "border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] scale-100 opacity-100"
                        : "border-transparent scale-50 opacity-0"
                  }`}
                />

                {/* Unit shape */}
                {isEnemy ? (
                  <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-rose-300/60 bg-gradient-to-br from-rose-500 to-rose-700 shadow-[0_0_20px_rgba(244,63,94,0.6)]" />
                ) : (
                  <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-cyan-200/60 bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
                )}

                {/* Muzzle flash */}
                {unit.attackTargetId && (
                  (() => {
                    const target = units.find(u => u.id === unit.attackTargetId);
                    if (!target) return null;
                    const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
                    const radius = isEnemy ? 14 : 12;
                    return (
                      <div
                        className="absolute left-1/2 top-1/2"
                        style={{
                          transform: `translate(-50%, -50%) rotate(${angle}rad) translateX(${radius + 4}px)`,
                        }}
                      >
                        <div
                          className="h-1.5 w-4 rounded-full bg-yellow-200 shadow-[0_0_15px_rgba(253,224,71,1)]"
                          style={{
                            animation: "muzzle-flash 0.06s ease-in-out infinite alternate",
                          }}
                        />
                      </div>
                    );
                  })()
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimap Overlay */}
      <div className="absolute bottom-6 right-6 z-50 overflow-hidden rounded-xl border border-white/20 bg-[#070c13]/90 shadow-2xl backdrop-blur-md"
           style={{ width: 200, height: 200, padding: 4 }}
      >
        <div className="relative w-full h-full bg-[#0a121c] rounded-lg overflow-hidden outline outline-1 outline-white/5 pointer-events-none">
           {obstacles.map(obs => (
             <div key={obs.id} className="absolute bg-slate-700/50 rounded-sm" 
                  style={{ left: obs.x * (192 / MAP_WIDTH), top: obs.y * (192 / MAP_HEIGHT), width: obs.width * (192 / MAP_WIDTH), height: obs.height * (192 / MAP_HEIGHT) }} />
           ))}
           <div className="absolute border-[1.5px] border-white/60 bg-white/5 pointer-events-none transition-all duration-75" 
                style={{ 
                  left: camera.x * (192 / MAP_WIDTH), 
                  top: camera.y * (192 / MAP_HEIGHT), 
                  width: windowSize.width * (192 / MAP_WIDTH), 
                  height: windowSize.height * (192 / MAP_HEIGHT) 
                }} />
           {units.map(unit => {
             const isEnemy = unit.owner === "enemy";
             return (
               <div key={unit.id} className={`absolute w-1.5 h-1.5 rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ${isEnemy ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]' : 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]'}`}
                    style={{ left: unit.x * (192 / MAP_WIDTH), top: unit.y * (192 / MAP_HEIGHT) }} />
             )
           })}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes muzzle-flash {
          0% { opacity: 0; transform: scaleX(0.4); }
          100% { opacity: 1; transform: scaleX(1.5); }
        }
      `}} />
    </main>
  );
}

function normalizeSelection(selection) {
  const left = Math.min(selection.startX, selection.currentX);
  const top = Math.min(selection.startY, selection.currentY);
  const right = Math.max(selection.startX, selection.currentX);
  const bottom = Math.max(selection.startY, selection.currentY);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

function getUnitsInSelection(units, selection) {
  const bounds = normalizeSelection(selection);
  const isClickSelection =
    bounds.width < 4 &&
    bounds.height < 4;

  return units
    .filter((unit) => {
      if (unit.owner !== "player") {
        return false;
      }

      if (isClickSelection) {
        return (
          Math.abs(unit.x - selection.currentX) <= UNIT_SELECTION_RADIUS &&
          Math.abs(unit.y - selection.currentY) <= UNIT_SELECTION_RADIUS
        );
      }

      return (
        unit.x >= bounds.left &&
        unit.x <= bounds.right &&
        unit.y >= bounds.top &&
        unit.y <= bounds.bottom
      );
    })
    .map((unit) => unit.id);
}
