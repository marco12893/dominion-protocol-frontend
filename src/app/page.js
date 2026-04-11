"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const MAP_WIDTH = 3200;
const MAP_HEIGHT = 3200;
const UNIT_SELECTION_RADIUS = 12;
const UNIT_CLICK_RADIUS = 14;
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:10000";

const INITIAL_UNITS = [
  { id: "unit-1", owner: "player", variantId: "rifleman", unitClass: "unarmored", x: 420, y: 420, health: 100, maxHealth: 100, attackDamage: 10, attackRange: 120, attackCooldownTime: 1.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-2", owner: "player", variantId: "rifleman", unitClass: "unarmored", x: 480, y: 480, health: 100, maxHealth: 100, attackDamage: 10, attackRange: 120, attackCooldownTime: 1.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-3", owner: "player", variantId: "rifleman", unitClass: "unarmored", x: 440, y: 560, health: 100, maxHealth: 100, attackDamage: 10, attackRange: 120, attackCooldownTime: 1.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-4", owner: "player", variantId: "rifleman", unitClass: "unarmored", x: 1720, y: 1300, health: 100, maxHealth: 100, attackDamage: 10, attackRange: 120, attackCooldownTime: 1.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-5", owner: "player", variantId: "rifleman", unitClass: "unarmored", x: 1820, y: 1380, health: 100, maxHealth: 100, attackDamage: 10, attackRange: 120, attackCooldownTime: 1.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-at-1", owner: "player", variantId: "antiTank", unitClass: "unarmored", x: 450, y: 420, health: 100, maxHealth: 100, attackDamage: 40, attackRange: 160, attackCooldownTime: 2.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-at-2", owner: "player", variantId: "antiTank", unitClass: "unarmored", x: 510, y: 480, health: 100, maxHealth: 100, attackDamage: 40, attackRange: 160, attackCooldownTime: 2.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-at-3", owner: "player", variantId: "antiTank", unitClass: "unarmored", x: 470, y: 560, health: 100, maxHealth: 100, attackDamage: 40, attackRange: 160, attackCooldownTime: 2.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-at-4", owner: "player", variantId: "antiTank", unitClass: "unarmored", x: 1750, y: 1300, health: 100, maxHealth: 100, attackDamage: 40, attackRange: 160, attackCooldownTime: 2.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "unit-at-5", owner: "player", variantId: "antiTank", unitClass: "unarmored", x: 1850, y: 1380, health: 100, maxHealth: 100, attackDamage: 40, attackRange: 160, attackCooldownTime: 2.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "enemy-1", owner: "enemy", variantId: "rifleman", unitClass: "unarmored", x: 2000, y: 2000, health: 100, maxHealth: 100, attackDamage: 10, attackRange: 120, attackCooldownTime: 1.0, armor: 0, kills: 0, attackTargetId: null },
  { id: "enemy-2", owner: "enemy", variantId: "armoredDummy", unitClass: "armored", x: 2100, y: 2000, health: 500, maxHealth: 500, attackDamage: 0, attackRange: 0, attackCooldownTime: 1.0, armor: 0, kills: 0, attackTargetId: null },
];

const INITIAL_OBSTACLES = [
  { id: "rock-1", x: 640, y: 510, width: 350, height: 290 },
  { id: "rock-2", x: 1470, y: 1250, width: 320, height: 440 },
  { id: "rock-3", x: 2190, y: 890, width: 420, height: 300 },
  { id: "rock-4", x: 850, y: 2350, width: 480, height: 290 },
  { id: "rock-5", x: 2600, y: 2600, width: 200, height: 300 },
];

const UNIT_DISPLAY_INFO = {
  rifleman: {
    name: "Rifleman",
    shortLabel: "R",
    attributes: ["Light", "Infantry"],
    damageDescription: "5.56mm Rifle",
  },
  antiTank: {
    name: "Anti-Tank",
    shortLabel: "AT",
    attributes: ["Light", "Infantry"],
    damageDescription: "AT Missile",
  },
  armoredDummy: {
    name: "Armored Dummy",
    shortLabel: "A",
    attributes: ["Armored", "Mechanical"],
    damageDescription: "None",
  },
};

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
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [controlGroups, setControlGroups] = useState({});
  const lastDigitKeyPressRef = useRef({});
  const latestStateRef = useRef({});

  useEffect(() => {
    latestStateRef.current = { controlGroups, units, windowSize };
  });
  
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
      } else if (e.key.toLowerCase() === "h") {
        setIsAttackMoveMode(false);
        if (selectedUnitIds.length > 0) {
          socketRef.current?.emit("unit:holdPosition", { unitIds: selectedUnitIds });
        }
      } else if (e.key === "Escape") {
        setIsAttackMoveMode(false);
      } else {
        const digitMatch = e.code?.match(/^(?:Digit|Numpad)([0-9])$/);
        if (digitMatch) {
          const digitKey = digitMatch[1];
          if (e.ctrlKey || e.shiftKey) {
            e.preventDefault(); // Stop browser from switching tabs (Ctrl+Number)
          }

          if (e.ctrlKey) {
            setControlGroups(prev => ({ ...prev, [digitKey]: selectedUnitIds }));
          } else if (e.shiftKey) {
            setControlGroups(prev => {
              const existing = prev[digitKey] || [];
              return { ...prev, [digitKey]: Array.from(new Set([...existing, ...selectedUnitIds])) };
            });
          } else {
            const now = Date.now();
            const lastTime = lastDigitKeyPressRef.current[digitKey] || 0;
            const isDoubleTap = now - lastTime < 350;
            lastDigitKeyPressRef.current[digitKey] = now;

            const latest = latestStateRef.current;
            const groupIds = (latest.controlGroups[digitKey] || [])
              .filter(id => latest.units.some(u => u.id === id && u.owner === 'player' && u.health > 0));
            
            setSelectedUnitIds(groupIds);

            if (isDoubleTap && groupIds.length > 0) {
              const groupUnits = latest.units.filter(u => groupIds.includes(u.id));
              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
              for (const u of groupUnits) {
                 if (u.x < minX) minX = u.x;
                 if (u.x > maxX) maxX = u.x;
                 if (u.y < minY) minY = u.y;
                 if (u.y > maxY) maxY = u.y;
              }
              const cx = (minX + maxX) / 2;
              const cy = (minY + maxY) / 2;
              const maxCamX = Math.max(0, MAP_WIDTH - latest.windowSize.width);
              const maxCamY = Math.max(0, MAP_HEIGHT - latest.windowSize.height);
              setCamera({
                x: Math.max(0, Math.min(maxCamX, cx - latest.windowSize.width / 2)),
                y: Math.max(0, Math.min(maxCamY, cy - latest.windowSize.height / 2)),
              });
            }
          }
        }
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
            variantId: unit.variantId,
            unitClass: unit.unitClass,
            x: unit.x,
            y: unit.y,
            health: unit.health,
            maxHealth: unit.maxHealth,
            attackDamage: unit.attackDamage ?? 0,
            attackRange: unit.attackRange ?? 0,
            attackCooldownTime: unit.attackCooldownTime ?? 1,
            armor: unit.armor ?? 0,
            kills: unit.kills ?? 0,
            attackTargetId: unit.attackTargetId,
            isFiring: unit.isFiring,
            isHoldingPosition: !!unit.isHoldingPosition,
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

    if (event.ctrlKey) {
      const clickedUnit = units.find(
        (unit) =>
          unit.owner === "player" &&
          Math.abs(unit.x - start.x) <= UNIT_SELECTION_RADIUS &&
          Math.abs(unit.y - start.y) <= UNIT_SELECTION_RADIUS,
      );

      if (clickedUnit) {
        const screenLeft = camera.x;
        const screenRight = camera.x + windowSize.width;
        const screenTop = camera.y;
        const screenBottom = camera.y + windowSize.height;

        setSelectedUnitIds(
          units
            .filter(
              (u) =>
                u.owner === "player" &&
                u.variantId === clickedUnit.variantId &&
                u.x >= screenLeft &&
                u.x <= screenRight &&
                u.y >= screenTop &&
                u.y <= screenBottom
            )
            .map((u) => u.id),
        );
        return;
      }
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
      const screenLeft = camera.x;
      const screenRight = camera.x + windowSize.width;
      const screenTop = camera.y;
      const screenBottom = camera.y + windowSize.height;

      setSelectedUnitIds(
        units
          .filter(
            (u) =>
              u.owner === "player" &&
              u.variantId === clickedUnit.variantId &&
              u.x >= screenLeft &&
              u.x <= screenRight &&
              u.y >= screenTop &&
              u.y <= screenBottom
          )
          .map((u) => u.id),
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

  // Determine selected unit data for the bottom HUD
  const selectedUnit = selectedUnitIds.length === 1
    ? units.find((u) => u.id === selectedUnitIds[0])
    : null;
  const selectedUnitDisplay = selectedUnit
    ? UNIT_DISPLAY_INFO[selectedUnit.variantId] || { name: selectedUnit.variantId, shortLabel: "?", attributes: [], damageDescription: "Unknown" }
    : null;



  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      
      {/* Top UI Overlay */}
      <div className="absolute top-4 left-4 z-50 pointer-events-auto flex flex-col gap-3 max-w-xs">
        <div className="rounded-xl border border-white/10 bg-[#0f1722]/80 backdrop-blur-md p-4 shadow-2xl">
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-400 font-bold">
            Dominion Protocol
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white drop-shadow-md">
            RTS Prototype
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            id="reset-player-btn"
            onClick={() => socketRef.current?.emit("player:reset")}
            className="rounded-full border border-sky-400/50 bg-sky-500/20 px-4 py-1.5 text-xs font-medium text-sky-200 shadow-[0_0_15px_rgba(14,165,233,0.15)] transition hover:bg-sky-400/30 hover:border-sky-400/80 cursor-pointer"
          >
            ↺ Reset Units
          </button>
          {!enemyAlive ? (
            <button
              id="respawn-enemy-btn"
              onClick={handleRespawnEnemy}
              className="rounded-full border border-rose-400/50 bg-rose-500/20 px-4 py-1.5 text-xs font-medium text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.15)] transition hover:bg-rose-400/30 hover:border-rose-400/80 cursor-pointer"
            >
              ↻ Respawn Enemy
            </button>
          ) : null}
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0f1722]/70 backdrop-blur-sm p-3 text-xs shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Connection</span>
            <span className={`flex items-center gap-1.5 ${isConnected ? "text-emerald-400" : "text-amber-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
              {isConnected ? "Online" : "Offline"}
            </span>
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
                      : unit.isHoldingPosition
                        ? "border-cyan-400/60 border-dashed shadow-[0_0_12px_rgba(34,211,238,0.3)] scale-100 opacity-100"
                        : isAttacking
                          ? "border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)] scale-100 opacity-100"
                          : "border-transparent scale-50 opacity-0"
                  }`}
                />

                {/* Unit shape */}
                <div className={`absolute flex items-center justify-center left-1/2 top-1/2 h-7 w-7 text-[8px] font-extrabold leading-none -translate-x-1/2 -translate-y-1/2 shadow-inner ${
                  isEnemy 
                    ? 'border border-rose-300/60 bg-gradient-to-br from-rose-500 to-rose-700 text-rose-50 shadow-[0_0_20px_rgba(244,63,94,0.6)]' 
                    : 'border border-cyan-200/60 bg-gradient-to-br from-cyan-400 to-cyan-600 text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.5)]'
                } ${unit.variantId === "rifleman" ? "rounded-full" : "rounded-sm"}`}>
                  {unit.variantId === "rifleman" ? "R" : unit.variantId === "antiTank" ? "AT" : unit.variantId === "armoredDummy" ? "A" : ""}
                </div>

                {/* Muzzle flash */}
                {unit.isFiring && (
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
                          className="h-2 w-6 rounded-full bg-yellow-300 shadow-[0_0_20px_rgba(253,224,71,1)]"
                          style={{
                            animation: "muzzle-flash 0.08s ease-in-out infinite alternate",
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

      {/* ═══════════════════════════════════════════════════════════════════
          CONTROL GROUPS OVERLAY
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="absolute left-1/2 -translate-x-1/2 z-50 pointer-events-auto flex items-end gap-[3px]" style={{ bottom: 185 }}>
        {Object.entries(controlGroups).sort(([a],[b]) => a.localeCompare(b)).map(([key, ids]) => {
          const validUnits = ids.map(id => units.find(u => u.id === id && u.owner === 'player' && u.health > 0)).filter(Boolean);
          if (validUnits.length === 0) return null;
          const displayUnit = validUnits[0];
          const displayInfo = UNIT_DISPLAY_INFO[displayUnit.variantId] || { shortLabel: '?' };
          
          return (
             <button 
               key={`cg-${key}`}
               className="group flex flex-col items-center"
               onClick={() => setSelectedUnitIds(validUnits.map(u => u.id))}
               onDoubleClick={(e) => {
                 e.preventDefault();
                 let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                 for (const u of validUnits) {
                    if (u.x < minX) minX = u.x;
                    if (u.x > maxX) maxX = u.x;
                    if (u.y < minY) minY = u.y;
                    if (u.y > maxY) maxY = u.y;
                 }
                 const cx = (minX + maxX) / 2;
                 const cy = (minY + maxY) / 2;
                 const maxCamX = Math.max(0, MAP_WIDTH - windowSize.width);
                 const maxCamY = Math.max(0, MAP_HEIGHT - windowSize.height);
                 setCamera({
                   x: Math.max(0, Math.min(maxCamX, cx - windowSize.width / 2)),
                   y: Math.max(0, Math.min(maxCamY, cy - windowSize.height / 2)),
                 });
               }}
             >
               <div className="relative w-[34px] h-[34px] bg-gradient-to-b from-[#18283a] to-[#0c141d] border border-[#2a4563] rounded shadow-[0_4px_12px_rgba(0,0,0,0.8)] transition-all group-hover:border-cyan-400/80 xl:group-hover:shadow-[0_0_15px_rgba(34,211,238,0.4)] flex items-center justify-center mb-[3px]">
                 {/* Unit Icon inside the box */}
                 <div className={`w-[22px] h-[22px] flex items-center justify-center text-[10px] font-black leading-none bg-gradient-to-br from-green-400 to-green-600 text-green-50 shadow-[0_0_10px_rgba(74,222,128,0.5)] ${displayUnit.variantId === "rifleman" ? "rounded-full" : "rounded-sm"}`}>
                   {displayInfo.shortLabel}
                 </div>
                 {/* Count Badge */}
                 <div className="absolute -bottom-1 -right-1 bg-[#0a1018] border border-cyan-900/80 text-[9px] font-bold font-mono text-cyan-200 px-1 rounded-sm shadow-md z-10 min-w-[14px] text-center">
                   {validUnits.length}
                 </div>
                 {/* Selection Highlight (if this exact group is currently selected) */}
                 {selectedUnitIds.length === validUnits.length && validUnits.every(u => selectedUnitIds.includes(u.id)) && (
                   <div className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                 )}
               </div>
               {/* Control Group Number Box */}
               <div className="w-[18px] bg-gradient-to-b from-[#142031] to-[#090f17] border border-[#233a54] rounded-[2px] text-center text-[10px] font-bold text-slate-300 drop-shadow-md group-hover:border-cyan-400/80 group-hover:text-cyan-300 transition-colors pointer-events-none">
                 {key}
               </div>
             </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          BOTTOM HUD BAR — SC2 Style
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        id="bottom-hud"
        className="absolute bottom-0 left-0 right-0 z-50 pointer-events-auto"
        style={{ height: 180 }}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-[#0a1018]/98 to-[#0d1520]/90 border-t border-cyan-900/40" />
        {/* Decorative top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        <div className="absolute top-[1px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />

        <div className="relative h-full flex">

          {/* ─── LEFT: MINIMAP (2/12) ─── */}
          <div className="flex-shrink-0 p-2" style={{ width: 'calc(100% * 2 / 12)' }}>
            <div className="relative w-full h-full rounded-lg overflow-hidden border border-white/15 bg-[#070c13] shadow-[0_0_20px_rgba(0,0,0,0.6)] cursor-crosshair"
                 onClick={(e) => {
                   const rect = e.currentTarget.getBoundingClientRect();
                   const clickX = (e.clientX - rect.left) / rect.width;
                   const clickY = (e.clientY - rect.top) / rect.height;
                   const mapX = clickX * MAP_WIDTH;
                   const mapY = clickY * MAP_HEIGHT;
                   const maxCamX = Math.max(0, MAP_WIDTH - windowSize.width);
                   const maxCamY = Math.max(0, MAP_HEIGHT - windowSize.height);
                   setCamera({
                     x: Math.max(0, Math.min(maxCamX, mapX - windowSize.width / 2)),
                     y: Math.max(0, Math.min(maxCamY, mapY - windowSize.height / 2)),
                   });
                 }}
                 onContextMenu={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   if (selectedUnitIds.length === 0) return;
                   const rect = e.currentTarget.getBoundingClientRect();
                   const clickX = (e.clientX - rect.left) / rect.width;
                   const clickY = (e.clientY - rect.top) / rect.height;
                   const mapX = Math.max(0, Math.min(MAP_WIDTH, clickX * MAP_WIDTH));
                   const mapY = Math.max(0, Math.min(MAP_HEIGHT, clickY * MAP_HEIGHT));
                   if (isAttackMoveMode) {
                     setIsAttackMoveMode(false);
                   }
                   socketRef.current?.emit("unit:move", {
                     unitIds: selectedUnitIds,
                     position: { x: mapX, y: mapY },
                   });
                 }}
            >
              <div className="absolute inset-0 pointer-events-none">
                {obstacles.map(obs => (
                  <div key={obs.id} className="absolute bg-slate-600/40 rounded-[1px]" 
                       style={{ 
                         left: `${(obs.x / MAP_WIDTH) * 100}%`, 
                         top: `${(obs.y / MAP_HEIGHT) * 100}%`, 
                         width: `${(obs.width / MAP_WIDTH) * 100}%`, 
                         height: `${(obs.height / MAP_HEIGHT) * 100}%` 
                       }} />
                ))}
                <div className="absolute border border-white/60 bg-white/5 transition-all duration-75" 
                     style={{ 
                       left: `${(camera.x / MAP_WIDTH) * 100}%`, 
                       top: `${(camera.y / MAP_HEIGHT) * 100}%`, 
                       width: `${(windowSize.width / MAP_WIDTH) * 100}%`, 
                       height: `${(windowSize.height / MAP_HEIGHT) * 100}%` 
                     }} />
                {units.map(unit => {
                  const isEnemy = unit.owner === "enemy";
                  return (
                    <div key={unit.id} className={`absolute w-[5px] h-[5px] rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-75 ${isEnemy ? 'bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.8)]' : 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]'}`}
                         style={{ left: `${(unit.x / MAP_WIDTH) * 100}%`, top: `${(unit.y / MAP_HEIGHT) * 100}%` }} />
                  );
                })}
              </div>
              {/* Minimap corner accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/30 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/30 pointer-events-none" />
            </div>
          </div>

          {/* ─── DIVIDER: Minimap | Info ─── */}
          <div className="flex-shrink-0 w-px relative my-2">
            <div className="absolute inset-0 bg-slate-600/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/30 via-cyan-400/10 to-cyan-500/30" />
            <div className="absolute -left-px inset-y-0 w-[3px] bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
            <div className="absolute left-px inset-y-0 w-[3px] bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
          </div>

          {/* ─── CENTER: UNIT INFO PANEL (7/12) ─── */}
          <div className="flex items-center justify-center p-3 overflow-hidden" style={{ width: 'calc(100% * 7 / 12)' }}>
            {selectedUnit && selectedUnitDisplay ? (
              <div className="flex items-center justify-center gap-8 w-full">
                {/* Unit Portrait (left side) */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="relative">
                    {/* Portrait frame */}
                    <div className="w-[90px] h-[90px] rounded-lg border-2 border-cyan-500/50 bg-gradient-to-br from-[#0d1a2a] to-[#061018] flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.15),inset_0_0_30px_rgba(0,0,0,0.5)]">
                      <div className={`w-14 h-14 flex items-center justify-center text-xl font-black ${
                        selectedUnit.variantId === "rifleman" ? "rounded-full" : "rounded-md"
                      } border-2 border-cyan-300/60 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-[0_0_25px_rgba(34,211,238,0.6)]`}>
                        {selectedUnitDisplay.shortLabel}
                      </div>
                    </div>
                    {/* Corner decorations */}
                    <div className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400/70" />
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400/70" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400/70" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400/70" />
                  </div>
                  {/* HP bar below portrait */}
                  <div className="mt-2 w-[90px]">
                    <div className="relative w-full h-[6px] rounded-full bg-[#0a1520] border border-white/10 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${selectedUnit.maxHealth > 0 ? (selectedUnit.health / selectedUnit.maxHealth) * 100 : 0}%`,
                          background: selectedUnit.health / selectedUnit.maxHealth > 0.6
                            ? 'linear-gradient(90deg, #22c55e, #34d399)'
                            : selectedUnit.health / selectedUnit.maxHealth > 0.3
                              ? 'linear-gradient(90deg, #eab308, #fbbf24)'
                              : 'linear-gradient(90deg, #dc2626, #f43f5e)',
                          boxShadow: selectedUnit.health / selectedUnit.maxHealth > 0.6
                            ? '0 0 8px rgba(34,197,94,0.5)'
                            : selectedUnit.health / selectedUnit.maxHealth > 0.3
                              ? '0 0 8px rgba(234,179,8,0.5)'
                              : '0 0 8px rgba(220,38,38,0.5)',
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-center mt-0.5 text-slate-300 font-mono tracking-wide">
                      {Math.ceil(selectedUnit.health)}<span className="text-slate-500">/</span>{selectedUnit.maxHealth}
                    </p>
                  </div>
                </div>

                {/* Unit Stats (centered) */}
                <div className="flex flex-col items-center text-center">
                  {/* Name */}
                  <h2 className="text-lg font-bold text-white tracking-wide uppercase drop-shadow-md">
                    {selectedUnitDisplay.name}
                  </h2>
                  
                  {/* Kill count */}
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kills: <span className="text-amber-300 font-semibold">{selectedUnit.kills}</span>
                  </p>

                  {/* Armor & Damage icons */}
                  <div className="flex items-center justify-center gap-3 mt-2">
                    {/* Armor icon */}
                    <div 
                      className="relative group"
                      onMouseEnter={() => setHoveredTooltip('armor')}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <div className="w-8 h-8 rounded border border-slate-600/60 bg-slate-800/80 flex items-center justify-center cursor-help transition hover:border-cyan-500/50 hover:bg-slate-700/80">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </div>
                      {hoveredTooltip === 'armor' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#0c1829] border border-cyan-800/50 shadow-xl text-[11px] text-slate-200 whitespace-nowrap z-[60]">
                          <div className="font-semibold text-cyan-300 mb-1">Armor</div>
                          <div>Defense: <span className="text-white font-mono">{selectedUnit.armor}</span></div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-cyan-800/50" />
                        </div>
                      )}
                    </div>

                    {/* Damage icon */}
                    <div 
                      className="relative group"
                      onMouseEnter={() => setHoveredTooltip('damage')}
                      onMouseLeave={() => setHoveredTooltip(null)}
                    >
                      <div className="w-8 h-8 rounded border border-slate-600/60 bg-slate-800/80 flex items-center justify-center cursor-help transition hover:border-rose-500/50 hover:bg-slate-700/80">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="12" x2="12" y2="18" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      </div>
                      {hoveredTooltip === 'damage' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[#0c1829] border border-rose-800/50 shadow-xl text-[11px] text-slate-200 whitespace-nowrap z-[60]">
                          <div className="font-semibold text-rose-300 mb-1">{selectedUnitDisplay.damageDescription}</div>
                          <div>Damage: <span className="text-white font-mono">{selectedUnit.attackDamage}</span></div>
                          <div>Range: <span className="text-white font-mono">{selectedUnit.attackRange}</span></div>
                          <div>Cooldown: <span className="text-white font-mono">{selectedUnit.attackCooldownTime}s</span></div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-rose-800/50" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Attributes */}
                  <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                    {selectedUnitDisplay.attributes.map((attr) => (
                      <span 
                        key={attr}
                        className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border border-slate-600/50 bg-slate-800/60 text-slate-300"
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedUnitIds.length > 1 ? (
              <div className="w-full h-full flex flex-col">
                <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                    {selectedUnitIds.length} Units Selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 content-start overflow-y-auto flex-1 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,116,139,0.3) transparent' }}>
                  {selectedUnitIds.map((unitId) => {
                    const unit = units.find((u) => u.id === unitId);
                    if (!unit) return null;
                    const display = UNIT_DISPLAY_INFO[unit.variantId] || { shortLabel: "?", name: unit.variantId };
                    const hpPercent = unit.maxHealth > 0 ? (unit.health / unit.maxHealth) * 100 : 0;
                    const hpColor = hpPercent > 60 ? '#34d399' : hpPercent > 30 ? '#fbbf24' : '#f43f5e';
                    return (
                      <button
                        key={unitId}
                        onClick={() => setSelectedUnitIds([unitId])}
                        className="relative flex flex-col items-center cursor-pointer rounded-md border border-cyan-800/40 bg-[#0a1520]/80 hover:border-cyan-400/60 hover:bg-[#0d1a2a] transition-all group"
                        style={{ width: 52, height: 60 }}
                        title={`${display.name} — ${Math.ceil(unit.health)}/${unit.maxHealth} HP`}
                      >
                        {/* Unit icon */}
                        <div className="flex-1 flex items-center justify-center pt-1">
                          <div className={`w-7 h-7 flex items-center justify-center text-[8px] font-extrabold leading-none border border-cyan-200/50 bg-gradient-to-br from-cyan-400 to-cyan-600 text-white shadow-[0_0_10px_rgba(34,211,238,0.3)] group-hover:shadow-[0_0_14px_rgba(34,211,238,0.5)] transition-shadow ${
                            unit.variantId === "rifleman" ? "rounded-full" : "rounded-sm"
                          }`}>
                            {display.shortLabel}
                          </div>
                        </div>
                        {/* HP bar */}
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
            ) : (
              <div className="text-sm text-slate-500 italic">
                No unit selected
              </div>
            )}
          </div>

          {/* ─── DIVIDER: Info | Commands ─── */}
          <div className="flex-shrink-0 w-px relative my-2">
            <div className="absolute inset-0 bg-slate-600/50" />
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/30 via-cyan-400/10 to-cyan-500/30" />
            <div className="absolute -left-px inset-y-0 w-[3px] bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
            <div className="absolute left-px inset-y-0 w-[3px] bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
          </div>

          {/* ─── RIGHT: COMMAND PANEL (3/12) ─── */}
          <div className="flex-shrink-0 p-2 pr-3" style={{ width: 'calc(100% * 3 / 12)' }}>
            <div className="grid grid-cols-3 gap-1.5 h-full content-start pt-1">
              {/* Attack command */}
              <button
                id="cmd-attack-btn"
                onClick={() => {
                  if (selectedUnitIds.length > 0) {
                    setIsAttackMoveMode(true);
                  }
                }}
                className={`relative w-full aspect-square rounded-md border flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isAttackMoveMode
                    ? 'border-amber-400/80 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'border-slate-600/50 bg-slate-800/70 hover:border-cyan-500/50 hover:bg-slate-700/70'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isAttackMoveMode ? 'text-amber-300' : 'text-slate-300'}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="2" x2="12" y2="6" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                  <line x1="2" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
                <span className="text-[8px] mt-0.5 font-bold tracking-wide text-slate-400">A</span>
              </button>

              {/* Stop command */}
              <button
                id="cmd-stop-btn"
                onClick={() => {
                  setIsAttackMoveMode(false);
                  if (selectedUnitIds.length > 0) {
                    socketRef.current?.emit("unit:stop", { unitIds: selectedUnitIds });
                  }
                }}
                className="relative w-full aspect-square rounded-md border border-slate-600/50 bg-slate-800/70 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-cyan-500/50 hover:bg-slate-700/70"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-slate-300">
                  <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" opacity="0.8" />
                </svg>
                <span className="text-[8px] mt-0.5 font-bold tracking-wide text-slate-400">S</span>
              </button>

              {/* Hold Position command */}
              <button
                id="cmd-hold-btn"
                onClick={() => {
                  setIsAttackMoveMode(false);
                  if (selectedUnitIds.length > 0) {
                    socketRef.current?.emit("unit:holdPosition", { unitIds: selectedUnitIds });
                  }
                }}
                className={`relative w-full aspect-square rounded-md border flex flex-col items-center justify-center cursor-pointer transition-all ${
                  selectedUnitIds.length > 0 && selectedUnitIds.every(id => { const u = units.find(un=>un.id===id); return u && u.isHoldingPosition; })
                    ? 'border-cyan-400/80 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : 'border-slate-600/50 bg-slate-800/70 hover:border-cyan-500/50 hover:bg-slate-700/70'
                }`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={selectedUnitIds.length > 0 && selectedUnitIds.every(id => { const u = units.find(un=>un.id===id); return u && u.isHoldingPosition; }) ? 'text-cyan-300' : 'text-slate-300'}>
                   <path d="M12 2v20M5 12h14" />
                   <rect x="8" y="8" width="8" height="8" rx="1" />
                </svg>
                <span className="text-[8px] mt-0.5 font-bold tracking-wide text-slate-400">H</span>
              </button>

              {/* Empty slots to fill the grid */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-full aspect-square rounded-md border border-slate-700/30 bg-slate-900/30"
                />
              ))}
            </div>
          </div>
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

  if (isClickSelection) {
    const clickedUnits = units.filter((unit) =>
      Math.abs(unit.x - selection.currentX) <= UNIT_SELECTION_RADIUS &&
      Math.abs(unit.y - selection.currentY) <= UNIT_SELECTION_RADIUS
    );

    if (clickedUnits.length === 0) {
      return [];
    }

    const playerUnits = clickedUnits.filter(u => u.owner === "player");
    if (playerUnits.length > 0) {
      return playerUnits.map((unit) => unit.id);
    }
    
    // If no player units, select exactly one enemy unit
    return [clickedUnits[0].id];
  }

  // Box selection: only select player units.
  return units
    .filter((unit) => {
      if (unit.owner !== "player") {
        return false;
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
