"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  hexToPixel, pixelToHex, hexCorners, getHexesInRange,
} from "@/features/game/utils/hexMath";
import {
  HEX_BASE_TILE_HEIGHT,
  HEX_BASE_TILE_WIDTH,
  HEX_TERRAIN_ASSETS,
} from "@/features/game/constants/hexTerrainAssets";

const HEX_SIZE = 32;
const GRID_COLS = 40;
const GRID_ROWS = 30;
const WORLD_PADDING = HEX_SIZE * 2;
const LAST_HEX = hexToPixel(GRID_COLS - 1, GRID_ROWS - 1, HEX_SIZE);
const HEX_WORLD_WIDTH = LAST_HEX.x + HEX_SIZE * 2 + WORLD_PADDING;
const HEX_WORLD_HEIGHT = LAST_HEX.y + HEX_SIZE * 2 + WORLD_PADDING;
const MOVEMENT_RANGE = 2;
const TILE_HALF_WIDTH = HEX_BASE_TILE_WIDTH / 2;
const TILE_HALF_HEIGHT = HEX_BASE_TILE_HEIGHT / 2;

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

const TERRAIN_FALLBACK_COLORS = {
  Ocean: "#69b8d2",
  Coast: "#8fd6e5",
  Lakes: "#6fc8dd",
  Grassland: "#7ba64b",
  "Grassland+Hill": "#7ba64b",
  Plains: "#9cae66",
  "Plains+Hill": "#9cae66",
  Desert: "#cab16a",
  "Desert+Hill": "#cab16a",
  Tundra: "#93a496",
  "Tundra+Hill": "#93a496",
  Snow: "#dce9f3",
  "Snow+Hill": "#dce9f3",
};

const CITIES = [
  { id: "city-blue", centerCol: 6, centerRow: 6, owner: "blue" },
  { id: "city-red", centerCol: 33, centerRow: 22, owner: "red" },
];

const INITIAL_HEX_UNITS = [
  { id: "hex-u1", col: 5, row: 4, owner: "blue" },
  { id: "hex-u2", col: 8, row: 8, owner: "blue" },
  { id: "hex-u3", col: 10, row: 6, owner: "blue" },
  { id: "hex-u4", col: 32, row: 21, owner: "red" },
  { id: "hex-u5", col: 35, row: 23, owner: "red" },
  { id: "hex-u6", col: 30, row: 24, owner: "red" },
];

function getTerrainIndex(col, row) {
  return row * GRID_COLS + col;
}

function createEmptyTerrainGrid() {
  return Array.from({ length: GRID_COLS * GRID_ROWS }, () => null);
}

function buildTerrainGrid(terrainTiles = []) {
  const grid = createEmptyTerrainGrid();

  for (const tile of terrainTiles) {
    if (
      typeof tile?.col !== "number" ||
      typeof tile?.row !== "number" ||
      tile.col < 0 ||
      tile.col >= GRID_COLS ||
      tile.row < 0 ||
      tile.row >= GRID_ROWS
    ) {
      continue;
    }

    grid[getTerrainIndex(tile.col, tile.row)] = tile;
  }

  return grid;
}

function getCityHexes(city) {
  return getHexesInRange(city.centerCol, city.centerRow, 1, GRID_COLS, GRID_ROWS);
}

const CITY_HEX_MAP = new Map();
for (const city of CITIES) {
  for (const hex of getCityHexes(city)) {
    CITY_HEX_MAP.set(`${hex.col},${hex.row}`, city.owner);
  }
}

const CITY_CENTER_SET = new Set(CITIES.map((city) => `${city.centerCol},${city.centerRow}`));

function drawHexPath(ctx, cx, cy, size) {
  const corners = hexCorners(cx, cy, size);
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i += 1) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
}

function drawTerrainTile(ctx, tileImages, terrainTile, sx, sy, col, row) {
  const fallbackColor = terrainTile?.baseAssetKey
    ? TERRAIN_FALLBACK_COLORS[terrainTile.baseAssetKey]
    : ((col + row) % 2 === 0 ? COLORS.hexFill : COLORS.hexFillAlt);
  const baseImage = terrainTile?.baseAssetKey ? tileImages.get(terrainTile.baseAssetKey) : null;

  if (baseImage?.complete && baseImage.naturalWidth > 0) {
    ctx.drawImage(
      baseImage,
      sx - TILE_HALF_WIDTH,
      sy - TILE_HALF_HEIGHT,
      HEX_BASE_TILE_WIDTH,
      HEX_BASE_TILE_HEIGHT,
    );
  } else {
    ctx.fillStyle = fallbackColor;
    drawHexPath(ctx, sx, sy, HEX_SIZE - 1);
    ctx.fill();
  }

  if (!terrainTile?.overlayAssetKey) {
    return;
  }

  const overlayImage = tileImages.get(terrainTile.overlayAssetKey);
  if (!overlayImage?.complete || overlayImage.naturalWidth === 0) {
    return;
  }

  ctx.drawImage(
    overlayImage,
    sx - overlayImage.naturalWidth / 2,
    sy - overlayImage.naturalHeight / 2,
    overlayImage.naturalWidth,
    overlayImage.naturalHeight,
  );
}

function drawGrid(ctx, camera, vw, vh, terrainGrid, tileImages) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, vw, vh);

  const margin = HEX_SIZE * 2;

  for (let col = 0; col < GRID_COLS; col += 1) {
    for (let row = 0; row < GRID_ROWS; row += 1) {
      const { x: wx, y: wy } = hexToPixel(col, row, HEX_SIZE);
      if (
        wx < camera.x - margin ||
        wx > camera.x + vw + margin ||
        wy < camera.y - margin ||
        wy > camera.y + vh + margin
      ) {
        continue;
      }

      const sx = wx - camera.x;
      const sy = wy - camera.y;
      const key = `${col},${row}`;
      const cityOwner = CITY_HEX_MAP.get(key);
      const isCenter = CITY_CENTER_SET.has(key);
      const terrainTile = terrainGrid[getTerrainIndex(col, row)];

      drawTerrainTile(ctx, tileImages, terrainTile, sx, sy, col, row);

      if (cityOwner) {
        ctx.fillStyle = cityOwner === "blue" ? COLORS.cityBlue : COLORS.cityRed;
        ctx.strokeStyle = cityOwner === "blue" ? COLORS.cityBlueBorder : COLORS.cityRedBorder;
        ctx.lineWidth = isCenter ? 2.5 : 1.8;
        drawHexPath(ctx, sx, sy, HEX_SIZE - 1);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = COLORS.hexStroke;
        ctx.lineWidth = 1;
        drawHexPath(ctx, sx, sy, HEX_SIZE - 1);
        ctx.stroke();
      }

      if (isCenter) {
        const markerColor = cityOwner === "blue" ? COLORS.unitBlue : COLORS.unitRed;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = markerColor;
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
      }
    }
  }
}

function drawMovementOverlay(ctx, camera, moveHexes) {
  if (!moveHexes?.length) {
    return;
  }

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

function drawHoveredHex(ctx, camera, hoveredHex, moveHexSet) {
  if (!hoveredHex) {
    return;
  }

  const isLegalMove = moveHexSet?.has(`${hoveredHex.col},${hoveredHex.row}`);
  const { x: wx, y: wy } = hexToPixel(hoveredHex.col, hoveredHex.row, HEX_SIZE);

  ctx.strokeStyle = isLegalMove ? "rgba(74, 222, 128, 0.6)" : COLORS.hexStrokeHover;
  ctx.lineWidth = 2;
  drawHexPath(ctx, wx - camera.x, wy - camera.y, HEX_SIZE - 1);
  ctx.stroke();
}

function drawPendingMoves(ctx, camera, pendingMoves, units, renderTime) {
  for (const [unitId, move] of pendingMoves) {
    const unit = units.find((entry) => entry.id === unitId);
    if (!unit) {
      continue;
    }

    const from = hexToPixel(unit.col, unit.row, HEX_SIZE);
    const to = hexToPixel(move.toCol, move.toRow, HEX_SIZE);
    const fx = from.x - camera.x;
    const fy = from.y - camera.y;
    const tx = to.x - camera.x;
    const ty = to.y - camera.y;

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = unit.owner === "blue"
      ? "rgba(34, 211, 238, 0.5)"
      : "rgba(251, 113, 133, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    const angle = Math.atan2(ty - fy, tx - fx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 10 * Math.cos(angle - 0.4), ty - 10 * Math.sin(angle - 0.4));
    ctx.lineTo(tx - 10 * Math.cos(angle + 0.4), ty - 10 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

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
    let sx;
    let sy;

    if (unit._animFrom) {
      const fromPixel = hexToPixel(unit._animFrom.col, unit._animFrom.row, HEX_SIZE);
      const progress = Math.min(1, (renderTime - unit._animStart) / 300);
      const eased = 1 - (1 - progress) * (1 - progress);
      sx = fromPixel.x + (wx - fromPixel.x) * eased - camera.x;
      sy = fromPixel.y + (wy - fromPixel.y) * eased - camera.y;
    } else {
      sx = wx - camera.x;
      sy = wy - camera.y;
    }

    const isSelected = unit.id === selectedUnitId;
    const hasMoved = movedUnitIds.has(unit.id);
    const isOwned = unit.owner === playerColor;

    if (hasMoved && isOwned) {
      ctx.globalAlpha = COLORS.dimAlpha;
    }

    if (isSelected) {
      ctx.strokeStyle = COLORS.selectedRing;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, COLORS.unitDotRadius + 6, 0, Math.PI * 2);
      ctx.stroke();

      const pulse = 0.5 + 0.5 * Math.sin(renderTime * 0.004);
      ctx.strokeStyle = `rgba(252, 211, 77, ${0.25 + 0.25 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sx, sy, COLORS.unitDotRadius + 10 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    const color = unit.owner === "blue" ? COLORS.unitBlue : COLORS.unitRed;
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, COLORS.unitDotRadius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, `${color}88`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, COLORS.unitDotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `${color}55`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, COLORS.unitDotRadius + 2, 0, Math.PI * 2);
    ctx.stroke();

    if (hasMoved && isOwned) {
      ctx.globalAlpha = 1;
    }
  }
}

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
  const terrainImagesRef = useRef(new Map());

  const [hexUnits, setHexUnits] = useState(INITIAL_HEX_UNITS);
  const [terrainGrid, setTerrainGrid] = useState(() => createEmptyTerrainGrid());
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [, setCamera] = useState({ x: 0, y: 0 });
  const [hoveredHex, setHoveredHex] = useState(null);
  const [pendingMoves, setPendingMoves] = useState(new Map());
  const [turnNumber, setTurnNumber] = useState(1);
  const [playerReady, setPlayerReady] = useState(false);
  const [opponentReady, setOpponentReady] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  const hexUnitsRef = useRef(hexUnits);
  useEffect(() => {
    hexUnitsRef.current = hexUnits;
  }, [hexUnits]);

  const terrainGridRef = useRef(terrainGrid);
  useEffect(() => {
    terrainGridRef.current = terrainGrid;
  }, [terrainGrid]);

  const selectedUnitIdRef = useRef(selectedUnitId);
  useEffect(() => {
    selectedUnitIdRef.current = selectedUnitId;
  }, [selectedUnitId]);

  const hoveredHexRef = useRef(hoveredHex);
  useEffect(() => {
    hoveredHexRef.current = hoveredHex;
  }, [hoveredHex]);

  const pendingMovesRef = useRef(pendingMoves);
  useEffect(() => {
    pendingMovesRef.current = pendingMoves;
  }, [pendingMoves]);

  const movedUnitIds = useMemo(() => new Set(pendingMoves.keys()), [pendingMoves]);
  const movedUnitIdsRef = useRef(movedUnitIds);
  useEffect(() => {
    movedUnitIdsRef.current = movedUnitIds;
  }, [movedUnitIds]);

  useEffect(() => {
    const nextImages = new Map();

    for (const [assetKey, src] of Object.entries(HEX_TERRAIN_ASSETS)) {
      const image = new Image();
      image.src = src;
      nextImages.set(assetKey, image);
    }

    terrainImagesRef.current = nextImages;
  }, []);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    function applyState(snapshot) {
      if (Array.isArray(snapshot?.terrainTiles)) {
        setTerrainGrid(buildTerrainGrid(snapshot.terrainTiles));
      }

      if (Array.isArray(snapshot?.hexUnits)) {
        setHexUnits(snapshot.hexUnits);
      }

      if (typeof snapshot?.turnNumber === "number") {
        setTurnNumber(snapshot.turnNumber);
      }

      const readyPlayers = Array.isArray(snapshot?.readyPlayers) ? snapshot.readyPlayers : [];
      setPlayerReady(Boolean(playerColor) && readyPlayers.includes(playerColor));
      setOpponentReady(Boolean(playerColor) && readyPlayers.some((color) => color !== playerColor));
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
        if (!prev.has(unitId)) {
          return prev;
        }

        const next = new Map(prev);
        next.delete(unitId);
        return next;
      });
    }

    function handlePlayerReady({ playerColor: readyColor }) {
      if (!playerColor) {
        return;
      }

      if (readyColor === playerColor) {
        setPlayerReady(true);
      } else {
        setOpponentReady(true);
      }
    }

    function handlePlayerUnready({ playerColor: readyColor }) {
      if (!playerColor) {
        return;
      }

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
        if (!appliedMove) {
          return unit;
        }

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

  const selectedUnit = useMemo(
    () => hexUnits.find((unit) => unit.id === selectedUnitId) || null,
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
    () => new Set(moveHexes.map((hex) => `${hex.col},${hex.row}`)),
    [moveHexes],
  );

  const moveHexesRef = useRef(moveHexes);
  const moveHexSetRef = useRef(moveHexSet);
  useEffect(() => {
    moveHexesRef.current = moveHexes;
    moveHexSetRef.current = moveHexSet;
  }, [moveHexes, moveHexSet]);

  const clampCam = useCallback((nextCamera) => {
    const maxX = Math.max(0, HEX_WORLD_WIDTH - (windowSize?.width || 800));
    const maxY = Math.max(0, HEX_WORLD_HEIGHT - (windowSize?.height || 600));

    return {
      x: Math.max(0, Math.min(maxX, nextCamera.x)),
      y: Math.max(0, Math.min(maxY, nextCamera.y)),
    };
  }, [windowSize]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key in keysRef.current) {
        keysRef.current[event.key] = true;
      }
    };
    const onKeyUp = (event) => {
      if (event.key in keysRef.current) {
        keysRef.current[event.key] = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    function onMouseMove(event) {
      mousePosRef.current = { x: event.clientX, y: event.clientY };
      const currentCamera = cameraRef.current;
      const hex = pixelToHex(event.clientX + currentCamera.x, event.clientY + currentCamera.y, HEX_SIZE);

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
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const panSpeed = 700;
      const edgeThreshold = 40;
      let dx = 0;
      let dy = 0;

      if (keysRef.current.ArrowUp) dy -= panSpeed * deltaTime;
      if (keysRef.current.ArrowDown) dy += panSpeed * deltaTime;
      if (keysRef.current.ArrowLeft) dx -= panSpeed * deltaTime;
      if (keysRef.current.ArrowRight) dx += panSpeed * deltaTime;

      const mousePos = mousePosRef.current;
      if (mousePos.x < edgeThreshold) dx -= panSpeed * deltaTime;
      if (mousePos.x > window.innerWidth - edgeThreshold) dx += panSpeed * deltaTime;
      if (mousePos.y < edgeThreshold) dy -= panSpeed * deltaTime;
      if (mousePos.y > window.innerHeight - edgeThreshold) dy += panSpeed * deltaTime;

      if (dx !== 0 || dy !== 0) {
        setCamera((current) => {
          const next = clampCam({ x: current.x + dx, y: current.y + dy });
          cameraRef.current = next;
          return next;
        });
      }

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [clampCam]);

  function handlePointerDown(event) {
    if (event.button !== 0 || isResolving || !playerColor || playerReady) {
      return;
    }

    const currentCamera = cameraRef.current;
    const clickedHex = pixelToHex(event.clientX + currentCamera.x, event.clientY + currentCamera.y, HEX_SIZE);
    const clickedUnit = hexUnitsRef.current.find(
      (unit) => unit.col === clickedHex.col && unit.row === clickedHex.row,
    );
    const currentSelection = selectedUnitIdRef.current;

    if (clickedUnit) {
      if (clickedUnit.owner === playerColor) {
        setSelectedUnitId(clickedUnit.id);
      } else {
        setSelectedUnitId(null);
      }
      return;
    }

    if (currentSelection && moveHexSetRef.current.has(`${clickedHex.col},${clickedHex.row}`)) {
      const occupied = hexUnitsRef.current.some(
        (unit) => unit.col === clickedHex.col && unit.row === clickedHex.row,
      );

      let pendingOccupied = false;
      for (const [, move] of pendingMovesRef.current) {
        if (move.toCol === clickedHex.col && move.toRow === clickedHex.row) {
          pendingOccupied = true;
          break;
        }
      }

      if (!occupied && !pendingOccupied) {
        socketRef.current?.emit("hex:submitMove", {
          unitId: currentSelection,
          toCol: clickedHex.col,
          toRow: clickedHex.row,
        });
        setSelectedUnitId(null);
        return;
      }
    }

    setSelectedUnitId(null);
  }

  function handleEndTurn() {
    if (playerReady || isResolving) {
      return;
    }

    socketRef.current?.emit("hex:endTurn");
  }

  function handleCancelReady() {
    if (!playerReady || opponentReady || isResolving) {
      return;
    }

    socketRef.current?.emit("hex:cancelReady");
  }

  function handleCancelMove(unitId) {
    if (!unitId || playerReady || isResolving) {
      return;
    }

    socketRef.current?.emit("hex:cancelMove", { unitId });

    if (selectedUnitIdRef.current === unitId) {
      setSelectedUnitId(null);
    }
  }

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = performance.now();

      setHexUnits((prev) => {
        let changed = false;
        const next = prev.map((unit) => {
          if (unit._animFrom && now - unit._animStart > 350) {
            changed = true;
            const { _animFrom, _animStart, ...rest } = unit;
            return rest;
          }

          return unit;
        });

        return changed ? next : prev;
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return undefined;
    }

    let rafId;

    function render() {
      const viewportWidth = container.clientWidth;
      const viewportHeight = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.max(1, Math.floor(viewportWidth * dpr));
      const targetHeight = Math.max(1, Math.floor(viewportHeight * dpr));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      const currentCamera = cameraRef.current;
      const renderTime = performance.now();

      drawGrid(ctx, currentCamera, viewportWidth, viewportHeight, terrainGridRef.current, terrainImagesRef.current);
      drawMovementOverlay(ctx, currentCamera, moveHexesRef.current);
      drawHoveredHex(ctx, currentCamera, hoveredHexRef.current, moveHexSetRef.current);
      drawPendingMoves(ctx, currentCamera, pendingMovesRef.current, hexUnitsRef.current, renderTime);
      drawUnits(
        ctx,
        currentCamera,
        hexUnitsRef.current,
        selectedUnitIdRef.current,
        renderTime,
        movedUnitIdsRef.current,
        playerColor,
      );

      rafId = requestAnimationFrame(render);
    }

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [playerColor]);

  const myPendingMoves = [...pendingMoves.entries()]
    .filter(([unitId]) => hexUnits.find((unit) => unit.id === unitId)?.owner === playerColor)
    .map(([unitId, move]) => {
      const unit = hexUnits.find((entry) => entry.id === unitId);
      return {
        unitId,
        move,
        fromCol: unit?.col,
        fromRow: unit?.row,
      };
    });

  const myPendingCount = myPendingMoves.length;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onContextMenu={(event) => event.preventDefault()}
      className="absolute inset-0 touch-none cursor-default"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="absolute bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-end gap-4 pointer-events-auto">
        <div className="rounded-xl border border-white/10 bg-[#0f1722]/90 px-5 py-2.5 shadow-2xl backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Turn </span>
          <span className="text-lg font-black text-white">{turnNumber}</span>
        </div>

        {myPendingCount > 0 && (
          <div className="min-w-[240px] max-w-[420px] rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
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
                        ? "cursor-not-allowed border-white/5 bg-white/5 text-slate-600"
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

        <button
          id="end-turn-btn"
          onClick={playerReady ? handleCancelReady : handleEndTurn}
          disabled={isResolving || !playerColor || (playerReady && opponentReady)}
          className={`flex items-center gap-2 rounded-xl border-2 px-6 py-3 text-sm font-black uppercase tracking-widest shadow-2xl backdrop-blur-md transition-all ${
            playerReady
              ? opponentReady
                ? "cursor-default border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                : "border-rose-500/45 bg-rose-500/12 text-rose-300 hover:border-rose-400/60 hover:bg-rose-500/20 hover:text-rose-200"
              : isResolving || !playerColor
                ? "cursor-not-allowed border-white/5 bg-white/5 text-slate-600"
                : "border-amber-500/50 bg-amber-500/10 text-amber-400 hover:border-amber-400/60 hover:bg-amber-500/20 hover:text-amber-300"
          }`}
        >
          {playerReady ? (
            opponentReady ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Ready
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
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
    </div>
  );
}
