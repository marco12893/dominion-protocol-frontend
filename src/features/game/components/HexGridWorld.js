"use client";

import { useEffect, useRef, useState, useCallback } from "react";

import {
  hexToPixel,
  pixelToHex,
  hexCorners,
  hexDistance,
  getHexesInRange,
} from "@/features/game/utils/hexMath";

// ─── Grid constants ──────────────────────────────────────────────────────────

const HEX_SIZE = 36; // Outer radius (center to vertex)
const GRID_COLS = 40;
const GRID_ROWS = 30;

// Precompute world size for camera clamping.
const WORLD_PADDING = HEX_SIZE * 2;
const LAST_HEX = hexToPixel(GRID_COLS - 1, GRID_ROWS - 1, HEX_SIZE);
const HEX_WORLD_WIDTH = LAST_HEX.x + HEX_SIZE * 2 + WORLD_PADDING;
const HEX_WORLD_HEIGHT = LAST_HEX.y + HEX_SIZE * 2 + WORLD_PADDING;

// ─── Color tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0a0f1a",
  hexFill: "#0e1525",
  hexFillAlt: "#0c1220",
  hexStroke: "rgba(34, 211, 238, 0.06)",
  hexStrokeHover: "rgba(34, 211, 238, 0.25)",
  moveFill: "rgba(34, 211, 238, 0.12)",
  moveStroke: "rgba(34, 211, 238, 0.35)",
  selectedRing: "rgba(252, 211, 77, 0.85)",
  unitPlayer: "#22d3ee",
  unitEnemy: "#fb7185",
  unitDotRadius: 8,
  moveAnimSpeed: 6, // hexes per second (visual lerp speed)
};

// ─── Initial demo units ──────────────────────────────────────────────────────

const INITIAL_HEX_UNITS = [
  { id: "hex-u1", col: 5, row: 5, owner: "player" },
  { id: "hex-u2", col: 8, row: 10, owner: "player" },
  { id: "hex-u3", col: 12, row: 7, owner: "player" },
  { id: "hex-u4", col: 20, row: 14, owner: "enemy" },
  { id: "hex-u5", col: 25, row: 8, owner: "enemy" },
];

const MOVEMENT_RANGE = 2;

// ─── Drawing helpers ─────────────────────────────────────────────────────────

function drawHexPath(ctx, cx, cy, size) {
  const corners = hexCorners(cx, cy, size);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
}

function drawGrid(ctx, camera, vw, vh) {
  // Fill bg
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, vw, vh);

  // Determine visible hex range for culling.
  const margin = HEX_SIZE * 2;
  const minPx = camera.x - margin;
  const maxPx = camera.x + vw + margin;
  const minPy = camera.y - margin;
  const maxPy = camera.y + vh + margin;

  for (let col = 0; col < GRID_COLS; col++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const { x: wx, y: wy } = hexToPixel(col, row, HEX_SIZE);
      if (wx < minPx || wx > maxPx || wy < minPy || wy > maxPy) continue;

      const sx = wx - camera.x;
      const sy = wy - camera.y;

      ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.hexFill : COLORS.hexFillAlt;
      ctx.strokeStyle = COLORS.hexStroke;
      ctx.lineWidth = 1;

      drawHexPath(ctx, sx, sy, HEX_SIZE - 1);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawMovementOverlay(ctx, camera, moveHexes) {
  if (!moveHexes || moveHexes.length === 0) return;

  for (const hex of moveHexes) {
    const { x: wx, y: wy } = hexToPixel(hex.col, hex.row, HEX_SIZE);
    const sx = wx - camera.x;
    const sy = wy - camera.y;

    ctx.fillStyle = COLORS.moveFill;
    ctx.strokeStyle = COLORS.moveStroke;
    ctx.lineWidth = 1.5;

    drawHexPath(ctx, sx, sy, HEX_SIZE - 1);
    ctx.fill();
    ctx.stroke();
  }
}

function drawHoveredHex(ctx, camera, hoveredHex, moveHexSet) {
  if (!hoveredHex) return;

  const isLegal = moveHexSet && moveHexSet.has(`${hoveredHex.col},${hoveredHex.row}`);

  const { x: wx, y: wy } = hexToPixel(hoveredHex.col, hoveredHex.row, HEX_SIZE);
  const sx = wx - camera.x;
  const sy = wy - camera.y;

  ctx.strokeStyle = isLegal ? "rgba(74, 222, 128, 0.6)" : COLORS.hexStrokeHover;
  ctx.lineWidth = 2;
  drawHexPath(ctx, sx, sy, HEX_SIZE - 1);
  ctx.stroke();
}

function drawUnits(ctx, camera, units, selectedUnitId, renderTime) {
  for (const unit of units) {
    const { x: wx, y: wy } = hexToPixel(unit.col, unit.row, HEX_SIZE);

    // If the unit is animating, lerp pixel position.
    let sx, sy;
    if (unit._animFrom) {
      const { x: fromWx, y: fromWy } = hexToPixel(
        unit._animFrom.col,
        unit._animFrom.row,
        HEX_SIZE
      );
      const elapsed = (renderTime - unit._animStart) / 1000;
      const duration = 0.3; // seconds
      const t = Math.min(1, elapsed / duration);
      // Ease-out quad
      const eased = 1 - (1 - t) * (1 - t);
      sx = fromWx + (wx - fromWx) * eased - camera.x;
      sy = fromWy + (wy - fromWy) * eased - camera.y;
    } else {
      sx = wx - camera.x;
      sy = wy - camera.y;
    }

    const isSelected = unit.id === selectedUnitId;

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = COLORS.selectedRing;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, COLORS.unitDotRadius + 6, 0, Math.PI * 2);
      ctx.stroke();

      // Pulsing outer ring
      const pulse = 0.5 + 0.5 * Math.sin(renderTime * 0.004);
      ctx.strokeStyle = `rgba(252, 211, 77, ${0.25 + 0.25 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, COLORS.unitDotRadius + 10 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Unit dot
    const color = unit.owner === "player" ? COLORS.unitPlayer : COLORS.unitEnemy;
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, COLORS.unitDotRadius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color + "88");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, COLORS.unitDotRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Outer glow
    ctx.strokeStyle = color + "55";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, COLORS.unitDotRadius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function HexGridWorld({ windowSize }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });
  const mousePosRef = useRef({ x: 0, y: 0 });

  const [hexUnits, setHexUnits] = useState(INITIAL_HEX_UNITS);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [hoveredHex, setHoveredHex] = useState(null);

  // Keep refs in sync.
  const hexUnitsRef = useRef(hexUnits);
  useEffect(() => {
    hexUnitsRef.current = hexUnits;
  }, [hexUnits]);

  const selectedUnitIdRef = useRef(selectedUnitId);
  useEffect(() => {
    selectedUnitIdRef.current = selectedUnitId;
  }, [selectedUnitId]);

  const hoveredHexRef = useRef(hoveredHex);
  useEffect(() => {
    hoveredHexRef.current = hoveredHex;
  }, [hoveredHex]);

  // ─── Compute movement range ────────────────────────────────────────────────

  const selectedUnit = hexUnits.find((u) => u.id === selectedUnitId) || null;

  const moveHexes =
    selectedUnit && selectedUnit.owner === "player"
      ? getHexesInRange(selectedUnit.col, selectedUnit.row, MOVEMENT_RANGE, GRID_COLS, GRID_ROWS)
      : [];

  const moveHexSet = new Set(moveHexes.map((h) => `${h.col},${h.row}`));

  // Keep refs for rendering loop.
  const moveHexesRef = useRef(moveHexes);
  const moveHexSetRef = useRef(moveHexSet);
  useEffect(() => {
    moveHexesRef.current = moveHexes;
    moveHexSetRef.current = moveHexSet;
  }, [selectedUnitId, hexUnits]);

  // ─── Camera clamping ───────────────────────────────────────────────────────

  const clampCam = useCallback(
    (cam) => {
      const maxX = Math.max(0, HEX_WORLD_WIDTH - (windowSize?.width || 800));
      const maxY = Math.max(0, HEX_WORLD_HEIGHT - (windowSize?.height || 600));
      return {
        x: Math.max(0, Math.min(maxX, cam.x)),
        y: Math.max(0, Math.min(maxY, cam.y)),
      };
    },
    [windowSize]
  );

  // ─── Camera panning (keyboard + edge scroll) ──────────────────────────────

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key in keysRef.current) keysRef.current[e.key] = true;
    }
    function onKeyUp(e) {
      if (e.key in keysRef.current) keysRef.current[e.key] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    function onMouseMove(e) {
      mousePosRef.current = { x: e.clientX, y: e.clientY };

      // Update hovered hex.
      const cam = cameraRef.current;
      const mapX = e.clientX + cam.x;
      const mapY = e.clientY + cam.y;
      const hex = pixelToHex(mapX, mapY, HEX_SIZE);
      if (hex.col >= 0 && hex.col < GRID_COLS && hex.row >= 0 && hex.row < GRID_ROWS) {
        setHoveredHex({ col: hex.col, row: hex.row });
      } else {
        setHoveredHex(null);
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    let rafId;
    let lastTime = performance.now();

    function tick(time) {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const panSpeed = 700;
      const edgeThreshold = 40;
      let dx = 0,
        dy = 0;

      if (keysRef.current.ArrowUp) dy -= panSpeed * dt;
      if (keysRef.current.ArrowDown) dy += panSpeed * dt;
      if (keysRef.current.ArrowLeft) dx -= panSpeed * dt;
      if (keysRef.current.ArrowRight) dx += panSpeed * dt;

      const mp = mousePosRef.current;
      if (mp.x < edgeThreshold) dx -= panSpeed * dt;
      if (mp.x > window.innerWidth - edgeThreshold) dx += panSpeed * dt;
      if (mp.y < edgeThreshold) dy -= panSpeed * dt;
      if (mp.y > window.innerHeight - edgeThreshold) dy += panSpeed * dt;

      if (dx !== 0 || dy !== 0) {
        setCamera((c) => {
          const next = clampCam({ x: c.x + dx, y: c.y + dy });
          cameraRef.current = next;
          return next;
        });
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [clampCam]);

  // ─── Click handling ────────────────────────────────────────────────────────

  function handlePointerDown(e) {
    if (e.button !== 0) return;

    const cam = cameraRef.current;
    const mapX = e.clientX + cam.x;
    const mapY = e.clientY + cam.y;
    const clickedHex = pixelToHex(mapX, mapY, HEX_SIZE);

    // Check if we clicked on a unit.
    const clickedUnit = hexUnitsRef.current.find(
      (u) => u.col === clickedHex.col && u.row === clickedHex.row
    );

    const currentSelectedId = selectedUnitIdRef.current;

    if (clickedUnit) {
      // Select this unit (only player units are selectable).
      if (clickedUnit.owner === "player") {
        setSelectedUnitId(clickedUnit.id);
      } else {
        setSelectedUnitId(null);
      }
      return;
    }

    // If we have a selected unit and the click is on a legal move hex, move.
    if (currentSelectedId) {
      const hexKey = `${clickedHex.col},${clickedHex.row}`;
      if (moveHexSetRef.current.has(hexKey)) {
        // Check no other unit occupies that hex.
        const occupied = hexUnitsRef.current.some(
          (u) => u.col === clickedHex.col && u.row === clickedHex.row
        );
        if (!occupied) {
          setHexUnits((prev) =>
            prev.map((u) =>
              u.id === currentSelectedId
                ? {
                    ...u,
                    _animFrom: { col: u.col, row: u.row },
                    _animStart: performance.now(),
                    col: clickedHex.col,
                    row: clickedHex.row,
                  }
                : u
            )
          );
          // Deselect after move.
          setSelectedUnitId(null);
          return;
        }
      }
    }

    // Clicked empty / non-legal → deselect.
    setSelectedUnitId(null);
  }

  // ─── Clear animation data after animation completes ────────────────────────

  useEffect(() => {
    const interval = setInterval(() => {
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
    return () => clearInterval(interval);
  }, []);

  // ─── Canvas render loop ────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId;

    function render() {
      const vw = container.clientWidth;
      const vh = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const tw = Math.max(1, Math.floor(vw * dpr));
      const th = Math.max(1, Math.floor(vh * dpr));

      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
        canvas.style.width = `${vw}px`;
        canvas.style.height = `${vh}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, vw, vh);

      const cam = cameraRef.current;
      const renderTime = performance.now();

      drawGrid(ctx, cam, vw, vh);
      drawMovementOverlay(ctx, cam, moveHexesRef.current);
      drawHoveredHex(ctx, cam, hoveredHexRef.current, moveHexSetRef.current);
      drawUnits(ctx, cam, hexUnitsRef.current, selectedUnitIdRef.current, renderTime);

      // World boundary.
      ctx.strokeStyle = "rgba(34, 211, 238, 0.15)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-cam.x, -cam.y, HEX_WORLD_WIDTH, HEX_WORLD_HEIGHT);

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // ─── Context menu prevention ───────────────────────────────────────────────

  function handleContextMenu(e) {
    e.preventDefault();
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      className="absolute inset-0 touch-none cursor-default"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
