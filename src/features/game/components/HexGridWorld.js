"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  hexToPixel, pixelToHex, hexCorners, hexDistance, getHexesInRange,
} from "@/features/game/utils/hexMath";

// ─── Grid constants ──────────────────────────────────────────────────────────
const HEX_SIZE = 36;
const GRID_COLS = 40;
const GRID_ROWS = 30;
const WORLD_PADDING = HEX_SIZE * 2;
const LAST_HEX = hexToPixel(GRID_COLS - 1, GRID_ROWS - 1, HEX_SIZE);
const HEX_WORLD_WIDTH = LAST_HEX.x + HEX_SIZE * 2 + WORLD_PADDING;
const HEX_WORLD_HEIGHT = LAST_HEX.y + HEX_SIZE * 2 + WORLD_PADDING;
const MOVEMENT_RANGE = 2;

const COLORS = {
  bg: "#1a2332",
  hexFill: "#1e2d3d",
  hexFillAlt: "#1b2838",
  hexStroke: "rgba(148, 186, 216, 0.18)",
  hexStrokeHover: "rgba(34, 211, 238, 0.4)",
  moveFill: "rgba(34, 211, 238, 0.12)",
  moveStroke: "rgba(34, 211, 238, 0.4)",
  selectedRing: "rgba(252, 211, 77, 0.85)",
  unitBlue: "#22d3ee",
  unitRed: "#fb7185",
  unitDotRadius: 8,
  cityBlue: "rgba(34, 211, 238, 0.10)",
  cityBlueBorder: "rgba(34, 211, 238, 0.55)",
  cityRed: "rgba(251, 113, 133, 0.10)",
  cityRedBorder: "rgba(251, 113, 133, 0.55)",
  dimAlpha: 0.35,
};

// ─── Cities ──────────────────────────────────────────────────────────────────
const CITIES = [
  { id: "city-blue", centerCol: 6, centerRow: 6, owner: "blue" },
  { id: "city-red", centerCol: 33, centerRow: 22, owner: "red" },
];

function getCityHexes(city) {
  return getHexesInRange(city.centerCol, city.centerRow, 1, GRID_COLS, GRID_ROWS);
}

// Precompute city hex lookup
const CITY_HEX_MAP = new Map();
for (const city of CITIES) {
  for (const h of getCityHexes(city)) {
    CITY_HEX_MAP.set(`${h.col},${h.row}`, city.owner);
  }
}

const CITY_CENTER_SET = new Set(CITIES.map((c) => `${c.centerCol},${c.centerRow}`));

// ─── Initial units ───────────────────────────────────────────────────────────
const INITIAL_HEX_UNITS = [
  { id: "hex-u1", col: 5, row: 4, owner: "blue" },
  { id: "hex-u2", col: 8, row: 8, owner: "blue" },
  { id: "hex-u3", col: 10, row: 6, owner: "blue" },
  { id: "hex-u4", col: 32, row: 21, owner: "red" },
  { id: "hex-u5", col: 35, row: 23, owner: "red" },
  { id: "hex-u6", col: 30, row: 24, owner: "red" },
];

// ─── Drawing helpers ─────────────────────────────────────────────────────────
function drawHexPath(ctx, cx, cy, size) {
  const corners = hexCorners(cx, cy, size);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(corners[i].x, corners[i].y);
  ctx.closePath();
}

function drawGrid(ctx, camera, vw, vh) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, vw, vh);
  const margin = HEX_SIZE * 2;

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const { x: wx, y: wy } = hexToPixel(col, row, HEX_SIZE);
      if (wx < camera.x - margin || wx > camera.x + vw + margin ||
          wy < camera.y - margin || wy > camera.y + vh + margin) continue;
      const sx = wx - camera.x, sy = wy - camera.y;
      const key = `${col},${row}`;
      const cityOwner = CITY_HEX_MAP.get(key);
      const isCenter = CITY_CENTER_SET.has(key);

      if (cityOwner) {
        ctx.fillStyle = cityOwner === "blue" ? COLORS.cityBlue : COLORS.cityRed;
        ctx.strokeStyle = cityOwner === "blue" ? COLORS.cityBlueBorder : COLORS.cityRedBorder;
        ctx.lineWidth = isCenter ? 2.5 : 1.8;
      } else {
        ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.hexFill : COLORS.hexFillAlt;
        ctx.strokeStyle = COLORS.hexStroke;
        ctx.lineWidth = 1;
      }
      drawHexPath(ctx, sx, sy, HEX_SIZE - 1);
      ctx.fill();
      ctx.stroke();

      // City center marker
      if (isCenter) {
        const c = cityOwner === "blue" ? COLORS.unitBlue : COLORS.unitRed;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = c;
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
      }
    }
  }
}

function drawMovementOverlay(ctx, camera, moveHexes) {
  if (!moveHexes || !moveHexes.length) return;
  for (const hex of moveHexes) {
    const { x: wx, y: wy } = hexToPixel(hex.col, hex.row, HEX_SIZE);
    ctx.fillStyle = COLORS.moveFill;
    ctx.strokeStyle = COLORS.moveStroke;
    ctx.lineWidth = 1.5;
    drawHexPath(ctx, wx - camera.x, wy - camera.y, HEX_SIZE - 1);
    ctx.fill();
    ctx.stroke();
  }
}

function drawHoveredHex(ctx, camera, hov, moveHexSet) {
  if (!hov) return;
  const legal = moveHexSet && moveHexSet.has(`${hov.col},${hov.row}`);
  const { x: wx, y: wy } = hexToPixel(hov.col, hov.row, HEX_SIZE);
  ctx.strokeStyle = legal ? "rgba(74, 222, 128, 0.6)" : COLORS.hexStrokeHover;
  ctx.lineWidth = 2;
  drawHexPath(ctx, wx - camera.x, wy - camera.y, HEX_SIZE - 1);
  ctx.stroke();
}

function drawPendingMoves(ctx, camera, pendingMoves, units, renderTime) {
  for (const [unitId, move] of pendingMoves) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) continue;
    const from = hexToPixel(unit.col, unit.row, HEX_SIZE);
    const to = hexToPixel(move.toCol, move.toRow, HEX_SIZE);
    const fx = from.x - camera.x, fy = from.y - camera.y;
    const tx = to.x - camera.x, ty = to.y - camera.y;

    // Dashed arrow line
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = unit.owner === "blue"
      ? "rgba(34, 211, 238, 0.5)" : "rgba(251, 113, 133, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrowhead
    const angle = Math.atan2(ty - fy, tx - fx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 10 * Math.cos(angle - 0.4), ty - 10 * Math.sin(angle - 0.4));
    ctx.lineTo(tx - 10 * Math.cos(angle + 0.4), ty - 10 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Ghost dot at destination
    const pulse = 0.4 + 0.3 * Math.sin(renderTime * 0.005);
    const color = unit.owner === "blue" ? COLORS.unitBlue : COLORS.unitRed;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty, COLORS.unitDotRadius - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawUnits(ctx, camera, units, selectedUnitId, renderTime, movedUnitIds, playerColor) {
  for (const unit of units) {
    const { x: wx, y: wy } = hexToPixel(unit.col, unit.row, HEX_SIZE);
    let sx, sy;
    if (unit._animFrom) {
      const fp = hexToPixel(unit._animFrom.col, unit._animFrom.row, HEX_SIZE);
      const t = Math.min(1, (renderTime - unit._animStart) / 300);
      const e = 1 - (1 - t) * (1 - t);
      sx = fp.x + (wx - fp.x) * e - camera.x;
      sy = fp.y + (wy - fp.y) * e - camera.y;
    } else {
      sx = wx - camera.x;
      sy = wy - camera.y;
    }

    const isSelected = unit.id === selectedUnitId;
    const hasMoved = movedUnitIds.has(unit.id);
    const isOwned = unit.owner === playerColor;

    // Dim units that already have a pending move
    if (hasMoved && isOwned) ctx.globalAlpha = COLORS.dimAlpha;

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = COLORS.selectedRing;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, COLORS.unitDotRadius + 6, 0, Math.PI * 2);
      ctx.stroke();
      const p = 0.5 + 0.5 * Math.sin(renderTime * 0.004);
      ctx.strokeStyle = `rgba(252, 211, 77, ${0.25 + 0.25 * p})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, COLORS.unitDotRadius + 10 + p * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Unit dot
    const color = unit.owner === "blue" ? COLORS.unitBlue : COLORS.unitRed;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, COLORS.unitDotRadius);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + "88");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, COLORS.unitDotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color + "55";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, COLORS.unitDotRadius + 2, 0, Math.PI * 2);
    ctx.stroke();

    if (hasMoved && isOwned) ctx.globalAlpha = 1;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────
const TURN_RESOLVE_ANIMATION_MS = 400;

function toPendingMoveMap(pendingMoves = {}) {
  return new Map(
    Object.entries(pendingMoves).map(([unitId, move]) => [
      unitId,
      { toCol: move.toCol, toRow: move.toRow },
    ]),
  );
}

export default function HexGridWorld({ windowSize, playerColor, socket, socketRef }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({ ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false });
  const mousePosRef = useRef({ x: 0, y: 0 });

  const [hexUnits, setHexUnits] = useState(INITIAL_HEX_UNITS);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [hoveredHex, setHoveredHex] = useState(null);
  const [pendingMoves, setPendingMoves] = useState(new Map());
  const [turnNumber, setTurnNumber] = useState(1);
  const [playerReady, setPlayerReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Refs for render loop
  const hexUnitsRef = useRef(hexUnits);
  useEffect(() => { hexUnitsRef.current = hexUnits; }, [hexUnits]);
  const selectedUnitIdRef = useRef(selectedUnitId);
  useEffect(() => { selectedUnitIdRef.current = selectedUnitId; }, [selectedUnitId]);
  const hoveredHexRef = useRef(hoveredHex);
  useEffect(() => { hoveredHexRef.current = hoveredHex; }, [hoveredHex]);
  const pendingMovesRef = useRef(pendingMoves);
  useEffect(() => { pendingMovesRef.current = pendingMoves; }, [pendingMoves]);

  const movedUnitIds = useMemo(() => new Set(pendingMoves.keys()), [pendingMoves]);
  const movedUnitIdsRef = useRef(movedUnitIds);
  useEffect(() => { movedUnitIdsRef.current = movedUnitIds; }, [movedUnitIds]);

  useEffect(() => {
    if (!socket) return undefined;

    function applyState(snapshot) {
      if (Array.isArray(snapshot?.hexUnits)) {
        setHexUnits(snapshot.hexUnits);
      }

      if (typeof snapshot?.turnNumber === "number") {
        setTurnNumber(snapshot.turnNumber);
      }

      const readyPlayers = Array.isArray(snapshot?.readyPlayers) ? snapshot.readyPlayers : [];
      setPlayerReady(Boolean(playerColor) && readyPlayers.includes(playerColor));
      setOpponentReady(
        Boolean(playerColor) && readyPlayers.some((color) => color !== playerColor),
      );
      setIsResolving(Boolean(snapshot?.isResolving));

      if (playerColor) {
        setPendingMoves(toPendingMoveMap(snapshot?.pendingMoves));
      } else {
        setPendingMoves(new Map());
      }
    }

    function handleMoveSubmitted({ unitId, toCol, toRow }) {
      setPendingMoves((prev) => {
        const next = new Map(prev);
        next.set(unitId, { toCol, toRow });
        return next;
      });
    }

    function handleMoveCancelled({ unitId }) {
      setPendingMoves((prev) => {
        if (!prev.has(unitId)) return prev;
        const next = new Map(prev);
        next.delete(unitId);
        return next;
      });
    }

    function handlePlayerReady({ playerColor: readyColor }) {
      if (!playerColor) return;
      if (readyColor === playerColor) {
        setPlayerReady(true);
      } else {
        setOpponentReady(true);
      }
    }

    function handlePlayerUnready({ playerColor: readyColor }) {
      if (!playerColor) return;
      if (readyColor === playerColor) {
        setPlayerReady(false);
      } else {
        setOpponentReady(false);
      }
    }

    function handleTurnResolved(resolved) {
      setIsResolving(true);
      setSelectedUnitId(null);
      setPendingMoves(new Map());
      setPlayerReady(false);
      setOpponentReady(false);

      const appliedMoves = Array.isArray(resolved?.appliedMoves) ? resolved.appliedMoves : [];
      const animationStart = performance.now();

      setHexUnits((prev) => prev.map((unit) => {
        const appliedMove = appliedMoves.find((move) => move.unitId === unit.id);
        if (!appliedMove) return unit;

        return {
          ...unit,
          _animFrom: { col: appliedMove.fromCol, row: appliedMove.fromRow },
          _animStart: animationStart,
          col: appliedMove.toCol,
          row: appliedMove.toRow,
        };
      }));

      window.setTimeout(() => {
        setHexUnits(Array.isArray(resolved?.hexUnits) ? resolved.hexUnits : INITIAL_HEX_UNITS);
        setTurnNumber(typeof resolved?.turnNumber === "number" ? resolved.turnNumber : 1);
        setIsResolving(false);
      }, TURN_RESOLVE_ANIMATION_MS);
    }

    socket.on("hex:state", applyState);
    socket.on("hex:moveSubmitted", handleMoveSubmitted);
    socket.on("hex:moveCancelled", handleMoveCancelled);
    socket.on("hex:playerReady", handlePlayerReady);
    socket.on("hex:playerUnready", handlePlayerUnready);
    socket.on("hex:turnResolved", handleTurnResolved);

    socket.emit("hex:requestState");

    return () => {
      socket.off("hex:state", applyState);
      socket.off("hex:moveSubmitted", handleMoveSubmitted);
      socket.off("hex:moveCancelled", handleMoveCancelled);
      socket.off("hex:playerReady", handlePlayerReady);
      socket.off("hex:playerUnready", handlePlayerUnready);
      socket.off("hex:turnResolved", handleTurnResolved);
    };
  }, [playerColor, socket]);

  // Selected unit & movement range
  const selectedUnit = useMemo(
    () => hexUnits.find((u) => u.id === selectedUnitId) || null,
    [hexUnits, selectedUnitId],
  );
  const moveHexes = useMemo(
    () => (
      selectedUnit && selectedUnit.owner === playerColor && !movedUnitIds.has(selectedUnit.id)
        ? getHexesInRange(selectedUnit.col, selectedUnit.row, MOVEMENT_RANGE, GRID_COLS, GRID_ROWS)
        : []
    ),
    [movedUnitIds, playerColor, selectedUnit],
  );
  const moveHexSet = useMemo(
    () => new Set(moveHexes.map((h) => `${h.col},${h.row}`)),
    [moveHexes],
  );
  const moveHexesRef = useRef(moveHexes);
  const moveHexSetRef = useRef(moveHexSet);
  useEffect(() => { moveHexesRef.current = moveHexes; moveHexSetRef.current = moveHexSet; }, [moveHexes, moveHexSet]);

  // Camera
  const clampCam = useCallback((cam) => {
    const maxX = Math.max(0, HEX_WORLD_WIDTH - (windowSize?.width || 800));
    const maxY = Math.max(0, HEX_WORLD_HEIGHT - (windowSize?.height || 600));
    return { x: Math.max(0, Math.min(maxX, cam.x)), y: Math.max(0, Math.min(maxY, cam.y)) };
  }, [windowSize]);

  useEffect(() => {
    const onKD = (e) => { if (e.key in keysRef.current) keysRef.current[e.key] = true; };
    const onKU = (e) => { if (e.key in keysRef.current) keysRef.current[e.key] = false; };
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);
    return () => { window.removeEventListener("keydown", onKD); window.removeEventListener("keyup", onKU); };
  }, []);

  useEffect(() => {
    function onMM(e) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      const cam = cameraRef.current;
      const hex = pixelToHex(e.clientX + cam.x, e.clientY + cam.y, HEX_SIZE);
      if (hex.col >= 0 && hex.col < GRID_COLS && hex.row >= 0 && hex.row < GRID_ROWS)
        setHoveredHex({ col: hex.col, row: hex.row });
      else setHoveredHex(null);
    }
    window.addEventListener("mousemove", onMM);
    return () => window.removeEventListener("mousemove", onMM);
  }, []);

  useEffect(() => {
    let rafId; let last = performance.now();
    function tick(t) {
      const dt = (t - last) / 1000; last = t;
      const ps = 700, et = 40; let dx = 0, dy = 0;
      if (keysRef.current.ArrowUp) dy -= ps * dt;
      if (keysRef.current.ArrowDown) dy += ps * dt;
      if (keysRef.current.ArrowLeft) dx -= ps * dt;
      if (keysRef.current.ArrowRight) dx += ps * dt;
      const mp = mousePosRef.current;
      if (mp.x < et) dx -= ps * dt;
      if (mp.x > window.innerWidth - et) dx += ps * dt;
      if (mp.y < et) dy -= ps * dt;
      if (mp.y > window.innerHeight - et) dy += ps * dt;
      if (dx !== 0 || dy !== 0) setCamera((c) => { const n = clampCam({ x: c.x + dx, y: c.y + dy }); cameraRef.current = n; return n; });
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [clampCam]);

  // ─── Click handling ──────────────────────────────────────────────────────
  function handlePointerDown(e) {
    if (e.button !== 0 || isResolving || !playerColor || playerReady) return;
    const cam = cameraRef.current;
    const clicked = pixelToHex(e.clientX + cam.x, e.clientY + cam.y, HEX_SIZE);
    const clickedUnit = hexUnitsRef.current.find((u) => u.col === clicked.col && u.row === clicked.row);
    const curSel = selectedUnitIdRef.current;

    if (clickedUnit) {
      if (clickedUnit.owner === playerColor) {
        setSelectedUnitId(clickedUnit.id);
      } else {
        setSelectedUnitId(null);
      }
      return;
    }

    if (curSel && moveHexSetRef.current.has(`${clicked.col},${clicked.row}`)) {
      const occupied = hexUnitsRef.current.some((u) => u.col === clicked.col && u.row === clicked.row);
      // Also check no other pending move targets this hex
      let pendingOccupied = false;
      for (const [, m] of pendingMovesRef.current) {
        if (m.toCol === clicked.col && m.toRow === clicked.row) { pendingOccupied = true; break; }
      }
      if (!occupied && !pendingOccupied) {
        socketRef.current?.emit("hex:submitMove", {
          unitId: curSel,
          toCol: clicked.col,
          toRow: clicked.row,
        });
        setSelectedUnitId(null);
        return;
      }
    }
    setSelectedUnitId(null);
  }

  // ─── End Turn ──────────────────────────────────────────────────────────
  function handleEndTurn() {
    if (playerReady || isResolving) return;
    socketRef.current?.emit("hex:endTurn");
  }

  function handleCancelReady() {
    if (!playerReady || opponentReady || isResolving) return;
    socketRef.current?.emit("hex:cancelReady");
  }

  function handleCancelMove(unitId) {
    if (!unitId || playerReady || isResolving) return;
    socketRef.current?.emit("hex:cancelMove", { unitId });
    if (selectedUnitIdRef.current === unitId) {
      setSelectedUnitId(null);
    }
  }

  // Clear animation data
  useEffect(() => {
    const iv = setInterval(() => {
      const now = performance.now();
      setHexUnits((prev) => {
        let changed = false;
        const next = prev.map((u) => {
          if (u._animFrom && now - u._animStart > 350) {
            changed = true;
            const { _animFrom, _animStart, ...rest } = u;
            return rest;
          }
          return u;
        });
        return changed ? next : prev;
      });
    }, 100);
    return () => clearInterval(iv);
  }, []);

  // ─── Canvas render loop ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let rafId;
    function render() {
      const vw = container.clientWidth, vh = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const tw = Math.max(1, Math.floor(vw * dpr));
      const th = Math.max(1, Math.floor(vh * dpr));
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw; canvas.height = th;
        canvas.style.width = `${vw}px`; canvas.style.height = `${vh}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      const cam = cameraRef.current;
      const rt = performance.now();
      drawGrid(ctx, cam, vw, vh);
      drawMovementOverlay(ctx, cam, moveHexesRef.current);
      drawHoveredHex(ctx, cam, hoveredHexRef.current, moveHexSetRef.current);
      drawPendingMoves(ctx, cam, pendingMovesRef.current, hexUnitsRef.current, rt);
      drawUnits(ctx, cam, hexUnitsRef.current, selectedUnitIdRef.current, rt, movedUnitIdsRef.current, playerColor);
      rafId = requestAnimationFrame(render);
    }
    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [playerColor]);

  const myPendingMoves = [...pendingMoves.entries()]
    .filter(([id]) => hexUnits.find((u) => u.id === id)?.owner === playerColor)
    .map(([unitId, move]) => {
      const unit = hexUnits.find((entry) => entry.id === unitId);
      return {
        unitId,
        move,
        owner: unit?.owner,
        fromCol: unit?.col,
        fromRow: unit?.row,
      };
    });
  const myPendingCount = myPendingMoves.length;

  return (
    <div ref={containerRef} onPointerDown={handlePointerDown} onContextMenu={(e) => e.preventDefault()} className="absolute inset-0 touch-none cursor-default">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Turn HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-end gap-4 pointer-events-auto">
        {/* Turn counter */}
        <div className="px-5 py-2.5 rounded-xl border border-white/10 bg-[#0f1722]/90 backdrop-blur-md shadow-2xl">
          <span className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">Turn </span>
          <span className="text-lg font-black text-white">{turnNumber}</span>
        </div>

        {/* Pending moves indicator */}
        {myPendingCount > 0 && (
          <div className="min-w-[240px] max-w-[420px] px-4 py-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 backdrop-blur-md shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-cyan-400">
                {myPendingCount} move{myPendingCount > 1 ? "s" : ""} queued
              </span>
              {!playerReady && !isResolving && (
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Cancel individually below
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {myPendingMoves.map(({ unitId, move, fromCol, fromRow }) => (
                <div
                  key={unitId}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-slate-950/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {unitId}
                    </div>
                    <div className="text-xs font-semibold text-slate-200">
                      ({fromCol}, {fromRow}) to ({move.toCol}, {move.toRow})
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCancelMove(unitId)}
                    disabled={playerReady || isResolving}
                    className={`shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                      playerReady || isResolving
                        ? "border-white/5 bg-white/5 text-slate-600 cursor-not-allowed"
                        : "border-rose-500/35 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* End Turn button */}
        <button
          id="end-turn-btn"
          onClick={playerReady ? handleCancelReady : handleEndTurn}
          disabled={isResolving || !playerColor || (playerReady && opponentReady)}
          className={`px-6 py-3 rounded-xl border-2 text-sm font-black uppercase tracking-widest transition-all backdrop-blur-md shadow-2xl flex items-center gap-2 ${
            playerReady
              ? opponentReady
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 cursor-default"
                : "border-rose-500/45 bg-rose-500/12 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 hover:border-rose-400/60"
              : isResolving || !playerColor
                ? "border-white/5 bg-white/5 text-slate-600 cursor-not-allowed"
                : "border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 hover:border-amber-400/60"
          }`}
        >
          {playerReady ? (
            opponentReady ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Ready
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                Cancel Ready
              </>
            )
          ) : isResolving ? (
            "Resolving..."
          ) : (
            "End Turn"
          )}
        </button>
      </div>

      {/* Player indicator */}
      {playerColor && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className={`px-4 py-1.5 rounded-full border ${
            playerColor === "blue" ? "border-cyan-500/30 text-cyan-400" : "border-rose-500/30 text-rose-400"
          } bg-slate-900/80 backdrop-blur-md text-[10px] font-black uppercase tracking-widest`}>
            {playerColor} — Strategic Command
          </div>
        </div>
      )}
    </div>
  );
}
