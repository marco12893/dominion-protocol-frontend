import { useEffect, useRef, useState } from "react";

import { MAP_HEIGHT, MAP_WIDTH, UNIT_DISPLAY_INFO } from "@/features/game/constants";
import { UNIT_ASSETS, UNIT_ASSET_SIZES } from "@/features/game/constants/assets";

const OWNER_COLORS = {
  blue: {
    primary: "#22d3ee",
    secondary: "#0f766e",
    accent: "rgba(165, 243, 252, 0.9)",
    ring: "rgba(34, 211, 238, 0.5)",
  },
  red: {
    primary: "#fb7185",
    secondary: "#9f1239",
    accent: "rgba(254, 205, 211, 0.9)",
    ring: "rgba(244, 63, 94, 0.5)",
  },
};

function isVisible(screenX, screenY, width, height, viewportWidth, viewportHeight, margin = 80) {
  return !(
    screenX + width < -margin ||
    screenY + height < -margin ||
    screenX > viewportWidth + margin ||
    screenY > viewportHeight + margin
  );
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const adjustedRadius = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + adjustedRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, adjustedRadius);
  ctx.arcTo(x + width, y + height, x, y + height, adjustedRadius);
  ctx.arcTo(x, y + height, x, y, adjustedRadius);
  ctx.arcTo(x, y, x + width, y, adjustedRadius);
  ctx.closePath();
}

function drawPolygon(ctx, points) {
  if (points.length === 0) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index][0], points[index][1]);
  }

  ctx.closePath();
}

function drawBackground(ctx, camera, viewportWidth, viewportHeight) {
  ctx.fillStyle = "#070c13";
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);

  const coarseSpacing = 120;
  const fineSpacing = 24;
  const coarseOffsetX = -((camera.x % coarseSpacing) + coarseSpacing) % coarseSpacing;
  const coarseOffsetY = -((camera.y % coarseSpacing) + coarseSpacing) % coarseSpacing;
  const fineOffsetX = -((camera.x % fineSpacing) + fineSpacing) % fineSpacing;
  const fineOffsetY = -((camera.y % fineSpacing) + fineSpacing) % fineSpacing;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(34, 211, 238, 0.015)";
  for (let x = fineOffsetX; x <= viewportWidth; x += fineSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewportHeight);
    ctx.stroke();
  }
  for (let y = fineOffsetY; y <= viewportHeight; y += fineSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewportWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(34, 211, 238, 0.04)";
  ctx.lineWidth = 2;
  for (let x = coarseOffsetX; x <= viewportWidth; x += coarseSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewportHeight);
    ctx.stroke();
  }
  for (let y = coarseOffsetY; y <= viewportHeight; y += coarseSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(viewportWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(8, 145, 178, 0.25)";
  ctx.lineWidth = 4;
  ctx.strokeRect(-camera.x, -camera.y, MAP_WIDTH, MAP_HEIGHT);
}

function drawObstacles(ctx, obstacles, camera, viewportWidth, viewportHeight) {
  for (const obstacle of obstacles) {
    const x = obstacle.x - camera.x;
    const y = obstacle.y - camera.y;

    if (!isVisible(x, y, obstacle.width, obstacle.height, viewportWidth, viewportHeight, 40)) {
      continue;
    }

    const gradient = ctx.createLinearGradient(x, y, x + obstacle.width, y + obstacle.height);
    gradient.addColorStop(0, "rgba(30, 41, 59, 0.82)");
    gradient.addColorStop(1, "rgba(15, 23, 42, 0.96)");

    ctx.fillStyle = gradient;
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, x, y, obstacle.width, obstacle.height, 12);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(34, 211, 238, 0.08)";
    ctx.fillRect(x + 8, y, Math.max(0, obstacle.width - 16), 1);
  }
}

function drawOrderLines(ctx, selectedUnitIds, unitsById, camera) {
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  for (const unitId of selectedUnitIds) {
    const unit = unitsById.get(unitId);
    if (!unit?.orderQueue?.length) {
      continue;
    }

    const points = [{ x: unit.x, y: unit.y }];
    if (unit.isMoving) {
      points.push({ x: unit.destinationX, y: unit.destinationY });
    }

    for (const order of unit.orderQueue) {
      if (order.position) {
        points.push(order.position);
      } else if (order.type === "attack" && order.targetId) {
        const target = unitsById.get(order.targetId);
        if (target) {
          points.push({ x: target.x, y: target.y });
        }
      }
    }

    if (points.length < 2) {
      continue;
    }

    ctx.strokeStyle =
      unit.orderQueue[0].type === "attackMove" || unit.orderQueue[0].type === "attack"
        ? "rgba(244, 63, 94, 0.45)"
        : "rgba(74, 222, 128, 0.45)";

    ctx.beginPath();
    ctx.moveTo(points[0].x - camera.x, points[0].y - camera.y);
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x - camera.x, points[index].y - camera.y);
    }
    ctx.stroke();
  }

  ctx.setLineDash([]);
}

function drawOrderMarkers(ctx, orderMarkers, camera, unitsById) {
  const now = Date.now();

  for (const marker of orderMarkers) {
    const elapsed = Math.min(1, (now - marker.timestamp) / 350);
    const radius = 10 + elapsed * 8;
    const alpha = 1 - elapsed;
    
    let x = marker.x;
    let y = marker.y;
    
    if (marker.targetId && unitsById) {
      const target = unitsById.get(marker.targetId);
      if (target) {
        x = target.x;
        y = target.y;
      }
    }
    
    const screenX = x - camera.x;
    const screenY = y - camera.y;

    ctx.strokeStyle =
      marker.type === "move"
        ? `rgba(74, 222, 128, ${alpha * 0.8})`
        : `rgba(244, 63, 94, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = marker.type === "move" ? "#4ade80" : "#f43f5e";
    ctx.beginPath();
    ctx.arc(screenX, screenY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectile(ctx, projectile, camera) {
  const x = projectile.currentX - camera.x;
  const y = projectile.currentY - camera.y;
  const angle = projectile.angle || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (projectile.variantId === "fighter_bullet") {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(10, -5);
    ctx.moveTo(-10, 5);
    ctx.lineTo(10, 5);
    ctx.stroke();
  } else if (
    projectile.variantId === "aa_missile" ||
    projectile.variantId === "antiTank_missile"
  ) {
    ctx.fillStyle = projectile.variantId === "aa_missile" ? "#67e8f9" : "#fb923c";
    drawRoundedRect(ctx, -2, -3, 14, 6, 3);
    ctx.fill();
    const trail = ctx.createLinearGradient(-18, 0, -2, 0);
    trail.addColorStop(0, "rgba(255,255,255,0)");
    trail.addColorStop(1, "rgba(255,255,255,0.45)");
    ctx.fillStyle = trail;
    ctx.fillRect(-18, -2, 16, 4);
  } else if (projectile.variantId === "bomber_bomb") {
    const trail = ctx.createLinearGradient(-14, 0, -2, 0);
    trail.addColorStop(0, "rgba(251, 146, 60, 0)");
    trail.addColorStop(1, "rgba(253, 186, 116, 0.65)");
    ctx.fillStyle = trail;
    ctx.fillRect(-14, -3, 12, 6);
    ctx.fillStyle = "#cbd5e1";
    drawRoundedRect(ctx, -2, -5, 6, 10, 3);
    ctx.fill();
  }

  ctx.restore();
}

function drawSelectionBounds(ctx, selectionBounds, camera) {
  if (!selectionBounds) {
    return;
  }

  const x = selectionBounds.left - camera.x;
  const y = selectionBounds.top - camera.y;

  ctx.fillStyle = "rgba(34, 211, 238, 0.08)";
  ctx.strokeStyle = "rgba(103, 232, 249, 0.9)";
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, selectionBounds.width, selectionBounds.height);
  ctx.strokeRect(x, y, selectionBounds.width, selectionBounds.height);
}

function drawHealthBar(ctx, unit, screenX, screenY) {
  const width = 28;
  const height = 4;
  const healthPercent = unit.maxHealth > 0 ? unit.health / unit.maxHealth : 0;
  const barX = screenX - width / 2;
  const barY = screenY - 18;

  ctx.fillStyle = "rgba(10, 15, 25, 0.82)";
  drawRoundedRect(ctx, barX, barY, width, height, 2);
  ctx.fill();

  const fillWidth = width * healthPercent;
  if (fillWidth > 0) {
    ctx.fillStyle =
      healthPercent > 0.6 ? "#34d399" : healthPercent > 0.3 ? "#fbbf24" : "#f43f5e";
    drawRoundedRect(ctx, barX, barY, fillWidth, height, 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, barX, barY, width, height, 2);
  ctx.stroke();
}

function drawUnitBody(ctx, unit, colorTheme, assetImages, renderTime = Date.now()) {
  const img = assetImages.get(unit.variantId);

  if (img) {
    const size = UNIT_ASSET_SIZES[unit.variantId] || { width: 32, height: 32 };
    
    ctx.save();
    // Assets face North, but game coordinate 0 is East.
    // So we add 90 degrees (PI/2) to align the North-facing asset to East.
    ctx.rotate(Math.PI / 2);
    
    if (size.spritesheet) {
      const { rows, cols, totalFrames, duration } = size.spritesheet;
      const frameIndex = Math.floor((renderTime % duration) / (duration / totalFrames)) % totalFrames;
      
      const fw = img.width / cols;
      const fh = img.height / rows;
      const fx = (frameIndex % cols) * fw;
      const fy = Math.floor(frameIndex / cols) * fh;

      ctx.drawImage(
        img,
        fx, fy, fw, fh,
        -size.width / 2, -size.height / 2, size.width, size.height
      );
    } else {
      ctx.drawImage(img, -size.width / 2, -size.height / 2, size.width, size.height);
    }
    
    ctx.restore();
    return;
  }

  // Fallback to geometric shapes if image not loaded
  ctx.fillStyle = colorTheme.primary;
  ctx.strokeStyle = colorTheme.accent;
  ctx.lineWidth = 1.4;

  switch (unit.variantId) {
    case "rifleman":
    case "antiTank":
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "armoredCar":
      drawRoundedRect(ctx, -16, -16, 32, 32, 6);
      ctx.fill();
      ctx.stroke();
      break;
    case "lightTank":
      ctx.fillRect(-20, -16, 40, 32);
      ctx.strokeRect(-20, -16, 40, 32);
      break;
    case "heavyTank":
      ctx.fillRect(-26, -18, 52, 36);
      ctx.strokeRect(-26, -18, 52, 36);
      break;
    case "antiAir":
      drawRoundedRect(ctx, -18, -18, 36, 36, 4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(-10, 4, 20, 10);
      break;
    case "attackHelicopter":
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.moveTo(-24, 0);
      ctx.lineTo(24, 0);
      ctx.stroke();
      break;
    case "fighter":
      drawPolygon(ctx, [
        [24, 0],
        [-18, -16],
        [-4, 0],
        [-18, 16],
      ]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(165, 243, 252, 0.7)";
      ctx.beginPath();
      ctx.arc(8, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "bomber":
      drawPolygon(ctx, [
        [28, 0],
        [10, -14],
        [2, -24],
        [-6, -12],
        [-28, -8],
        [-12, 0],
        [-28, 8],
        [-6, 12],
        [2, 24],
        [10, 14],
      ]);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(253, 186, 116, 0.75)";
      ctx.beginPath();
      ctx.arc(9, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      drawRoundedRect(ctx, -14, -14, 28, 28, 4);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

function drawUnit(ctx, unit, options) {
  const {
    camera,
    hoveredUnitId,
    playerColor,
    selectedUnitIdSet,
    unitsById,
    flashShooterIds,
  } = options;
  const screenX = unit.x - camera.x;
  const screenY = unit.y - camera.y;
  const colorTheme = OWNER_COLORS[unit.owner] ?? OWNER_COLORS.blue;
  const isOwned = unit.owner === playerColor;
  const isSelected = isOwned && selectedUnitIdSet.has(unit.id);
  const isAttacking = isOwned && !!unit.attackTargetId;

  drawHealthBar(ctx, unit, screenX, screenY);

  if (isSelected || unit.isHoldingPosition || isAttacking) {
    ctx.strokeStyle = isSelected
      ? "rgba(252, 211, 77, 0.82)"
      : unit.isHoldingPosition
        ? "rgba(34, 211, 238, 0.45)"
        : "rgba(244, 63, 94, 0.45)";
    ctx.lineWidth = isSelected ? 2.4 : 1.5;
    ctx.beginPath();
    ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
    ctx.stroke();
  }

  const targetedIdSet = options.targetedIdSet;
  const isTargetedBySelection = !isOwned && targetedIdSet?.has(unit.id);

  if (isTargetedBySelection) {
    const renderTime = options.renderTime;
    const spinSpeed = 0.006;
    const angle = (renderTime * spinSpeed) % (Math.PI * 2);

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(angle);
    ctx.strokeStyle = "rgba(244, 63, 94, 0.85)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (hoveredUnitId === unit.id && !isSelected && !isTargetedBySelection) {
    ctx.strokeStyle =
      unit.owner === playerColor ? "rgba(252, 211, 77, 0.9)" : "rgba(244, 63, 94, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(screenX, screenY, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(unit.angle ?? 0);
  drawUnitBody(ctx, unit, colorTheme, options.assetImages, options.renderTime);
  ctx.restore();

  if (
    unit.isFiring &&
    unit.variantId !== "antiTank" &&
    unit.variantId !== "lightTank" &&
    unit.variantId !== "antiAir" &&
    unit.variantId !== "bomber"
  ) {
    const target = unitsById.get(unit.attackTargetId);
    if (target) {
      const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
      const radius = unit.isHelicopter ? 22 : 18;
      const flashX = screenX + Math.cos(angle) * radius;
      const flashY = screenY + Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(flashX, flashY);
      ctx.rotate(angle);
      ctx.fillStyle = "#fde047";
      drawRoundedRect(ctx, 0, -4, 20, 8, 4);
      ctx.fill();
      ctx.restore();
    }
  }

  if (flashShooterIds.has(unit.id)) {
    const target = unitsById.get(unit.attackTargetId);
    if (target) {
      const angle = Math.atan2(target.y - unit.y, target.x - unit.x);
      const radius = unit.variantId === "heavyTank" ? 24 : 18;
      const flashX = screenX + Math.cos(angle) * radius;
      const flashY = screenY + Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(flashX, flashY);
      ctx.rotate(angle);
      ctx.fillStyle = "#fdba74";
      drawRoundedRect(ctx, 0, -5, 24, 10, 5);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawVisualEffects(ctx, visualEffects, camera) {
  for (const effect of visualEffects) {
    if (effect.type !== "explosion") {
      continue;
    }

    const x = effect.x - camera.x;
    const y = effect.y - camera.y;
    const radius = effect.radius ?? 95;
    const progress = Math.min(1, (Date.now() - effect.timestamp) / (effect.duration ?? 450));

    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = "rgba(253, 186, 116, 0.9)";
    ctx.lineWidth = Math.max(1, 4 - progress * 4);
    ctx.beginPath();
    ctx.arc(x, y, radius * (0.25 + progress), 0, Math.PI * 2);
    ctx.stroke();

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.8);
    gradient.addColorStop(0, "rgba(254, 240, 138, 0.9)");
    gradient.addColorStop(0.45, "rgba(251, 146, 60, 0.45)");
    gradient.addColorStop(1, "rgba(251, 146, 60, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function BattlefieldWorld({
  camera,
  cameraRef,
  hoveredUnitId,
  isAttackMoveMode,
  obstacles,
  onDoubleClick,
  onPointerDown,
  onRightClick,
  orderMarkers,
  playerColor,
  selectedUnitIds,
  selectedUnitIdsRef,
  selectionBounds,
  units,
  unitsRef,
  lastUpdateTimestamp,
  visualEffects,
  visualEffectsRef,
  visualProjectiles,
  visualProjectilesRef,
  windowSize,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const unitsByIdRef = useRef(new Map());
  const selectedUnitIdSetRef = useRef(new Set());
  const flashShooterIdsRef = useRef(new Set());
  const lastUnitsRef = useRef(null);
  const lastSelectedUnitIdsRef = useRef(null);
  const lastVisualEffectsRef = useRef(null);
  const groundUnitsRef = useRef([]);
  const helicopterUnitsRef = useRef([]);
  const airUnitsRef = useRef([]);
  const assetImagesRef = useRef(new Map());
  const [, setAssetsLoaded] = useState(false);

  useEffect(() => {
    let loaded = 0;
    const entries = Object.entries(UNIT_ASSETS);
    entries.forEach(([id, path]) => {
      const img = new Image();
      img.src = path;
      img.onload = () => {
        assetImagesRef.current.set(id, img);
        loaded++;
        if (loaded === entries.length) {
          setAssetsLoaded((v) => !v); // Force a re-render once all loaded
        }
      };
    });
  }, []);

  // Unit state history for interpolation
  const unitHistoryRef = useRef(new Map()); // unitId -> [{x, y, angle, timestamp}]
  const INTERPOLATION_DELAY = 50; // ms, slightly more than backend tick rate (33ms)

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function lerpAngle(start, end, t) {
    const diff = end - start;
    const normalizedDiff = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
    return start + normalizedDiff * t;
  }

  function getInterpolatedUnit(unit, renderTime) {
    const history = unitHistoryRef.current.get(unit.id);
    if (!history || history.length < 2) {
      return unit;
    }

    // Find two states to interpolate between
    const targetTime = renderTime - INTERPOLATION_DELAY;
    
    // Find the state just before targetTime and the state just after
    let beforeState = null;
    let afterState = null;
    
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].timestamp <= targetTime) {
        beforeState = history[i];
        afterState = history[i + 1] || null;
        break;
      }
    }

    if (!beforeState || !afterState) {
      return unit;
    }

    const timeDiff = afterState.timestamp - beforeState.timestamp;
    if (timeDiff === 0) {
      return unit;
    }

    const t = (targetTime - beforeState.timestamp) / timeDiff;
    
    return {
      ...unit,
      x: lerp(beforeState.x, afterState.x, t),
      y: lerp(beforeState.y, afterState.y, t),
      angle: lerpAngle(beforeState.angle || 0, afterState.angle || 0, t),
    };
  }

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

    let animationFrameId;
    let lastViewportWidth = 0;
    let lastViewportHeight = 0;

    function render() {
      const viewportWidth = container.clientWidth;
      const viewportHeight = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.max(1, Math.floor(viewportWidth * dpr));
      const targetHeight = Math.max(1, Math.floor(viewportHeight * dpr));

      if (canvas.width !== targetWidth || canvas.height !== targetHeight || 
          lastViewportWidth !== viewportWidth || lastViewportHeight !== viewportHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${viewportWidth}px`;
        canvas.style.height = `${viewportHeight}px`;
        lastViewportWidth = viewportWidth;
        lastViewportHeight = viewportHeight;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewportWidth, viewportHeight);

      // Read from refs for high-frequency data
      const currentCamera = cameraRef.current;
      const currentUnits = unitsRef.current;
      const currentVisualProjectiles = visualProjectilesRef.current;
      const currentVisualEffects = visualEffectsRef.current;
      const currentSelectedUnitIds = selectedUnitIdsRef.current;
      const renderTime = Date.now();

      // Update unit history for interpolation
      for (const unit of currentUnits) {
        const unitTimestamp = unit._timestamp || lastUpdateTimestamp;
        const history = unitHistoryRef.current.get(unit.id) || [];
        
        // Add new state if timestamp is different from the last one
        if (history.length === 0 || history[history.length - 1].timestamp !== unitTimestamp) {
          history.push({
            x: unit.x,
            y: unit.y,
            angle: unit.angle || 0,
            timestamp: unitTimestamp,
          });
          
          // Keep only last 3 states to save memory
          if (history.length > 3) {
            history.shift();
          }
          
          unitHistoryRef.current.set(unit.id, history);
        }
      }

      // Clean up history for units that no longer exist
      const currentUnitIds = new Set(currentUnits.map((u) => u.id));
      for (const unitId of unitHistoryRef.current.keys()) {
        if (!currentUnitIds.has(unitId)) {
          unitHistoryRef.current.delete(unitId);
        }
      }

      drawBackground(ctx, currentCamera, viewportWidth, viewportHeight);

      // Only rebuild Map/Set when underlying arrays change
      if (currentUnits !== lastUnitsRef.current) {
        unitsByIdRef.current = new Map(currentUnits.map((unit) => [unit.id, unit]));
        lastUnitsRef.current = currentUnits;
      }
      if (currentSelectedUnitIds !== lastSelectedUnitIdsRef.current) {
        selectedUnitIdSetRef.current = new Set(currentSelectedUnitIds);
        lastSelectedUnitIdsRef.current = currentSelectedUnitIds;
      }
      if (currentVisualEffects !== lastVisualEffectsRef.current) {
        flashShooterIdsRef.current = new Set(
          currentVisualEffects
            .filter((effect) => effect.type === "flash")
            .map((effect) => effect.shooterId),
        );
        lastVisualEffectsRef.current = currentVisualEffects;
      }

      drawOrderLines(ctx, currentSelectedUnitIds, unitsByIdRef.current, currentCamera);
      drawObstacles(ctx, obstacles, currentCamera, viewportWidth, viewportHeight);
      drawOrderMarkers(ctx, orderMarkers, currentCamera, unitsByIdRef.current);

      groundUnitsRef.current.length = 0;
      helicopterUnitsRef.current.length = 0;
      airUnitsRef.current.length = 0;
      const groundUnits = groundUnitsRef.current;
      const helicopterUnits = helicopterUnitsRef.current;
      const planeUnits = airUnitsRef.current;
      
      for (const unit of currentUnits) {
        const interpolatedUnit = getInterpolatedUnit(unit, renderTime);
        const assetSize = UNIT_ASSET_SIZES[interpolatedUnit.variantId] || { width: 32, height: 32 };
        const radius = Math.max(assetSize.width, assetSize.height) / 2 + 30; // buffer
        
        const screenX = interpolatedUnit.x - currentCamera.x;
        const screenY = interpolatedUnit.y - currentCamera.y;

        if (!isVisible(screenX - radius, screenY - radius, radius * 2, radius * 2, viewportWidth, viewportHeight)) {
          continue;
        }

        if (interpolatedUnit.isPlane) {
          planeUnits.push(interpolatedUnit);
        } else if (interpolatedUnit.isHelicopter) {
          helicopterUnits.push(interpolatedUnit);
        } else {
          groundUnits.push(interpolatedUnit);
        }
      }

      const targetedIdSet = new Set();
      for (const id of currentSelectedUnitIds) {
        const u = unitsByIdRef.current.get(id);
        if (u?.attackTargetId) {
          targetedIdSet.add(u.attackTargetId);
        }
      }

      const targetTime = renderTime - 100; // Match INTERPOLATION_DELAY

      for (const unit of [...groundUnits, ...helicopterUnits, ...planeUnits]) {
        drawUnit(ctx, unit, {
          camera: currentCamera,
          hoveredUnitId,
          playerColor,
          selectedUnitIdSet: selectedUnitIdSetRef.current,
          unitsById: unitsByIdRef.current,
          flashShooterIds: flashShooterIdsRef.current,
          assetImages: assetImagesRef.current,
          targetedIdSet,
          renderTime: targetTime,
        });
      }

      for (const projectile of currentVisualProjectiles) {
        const x = projectile.currentX - currentCamera.x;
        const y = projectile.currentY - currentCamera.y;

        if (!isVisible(x - 20, y - 20, 40, 40, viewportWidth, viewportHeight, 24)) {
          continue;
        }

        drawProjectile(ctx, projectile, currentCamera);
      }

      drawVisualEffects(ctx, currentVisualEffects, currentCamera);
      drawSelectionBounds(ctx, selectionBounds, currentCamera);

      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [cameraRef, unitsRef, visualProjectilesRef, visualEffectsRef, selectedUnitIdsRef, obstacles, orderMarkers, playerColor, hoveredUnitId, selectionBounds, lastUpdateTimestamp]);

  return (
    <div
      ref={containerRef}
      onDoubleClick={onDoubleClick}
      onPointerDown={onPointerDown}
      onContextMenu={onRightClick}
      className={`absolute inset-0 touch-none ${isAttackMoveMode ? "cursor-crosshair" : "cursor-default"}`}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
