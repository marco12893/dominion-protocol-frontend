import { useEffect, useRef } from "react";

import { MAP_HEIGHT, MAP_WIDTH, UNIT_DISPLAY_INFO } from "@/features/game/constants";

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

function drawOrderMarkers(ctx, orderMarkers, camera) {
  const now = Date.now();

  for (const marker of orderMarkers) {
    const elapsed = Math.min(1, (now - marker.timestamp) / 350);
    const radius = 10 + elapsed * 8;
    const alpha = 1 - elapsed;
    const x = marker.x - camera.x;
    const y = marker.y - camera.y;

    ctx.strokeStyle =
      marker.type === "move"
        ? `rgba(74, 222, 128, ${alpha * 0.8})`
        : `rgba(244, 63, 94, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = marker.type === "move" ? "#4ade80" : "#f43f5e";
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
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

function drawUnitBody(ctx, unit, colorTheme) {
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

  if (hoveredUnitId === unit.id && !isSelected) {
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
  drawUnitBody(ctx, unit, colorTheme);

  if (unit.variantId !== "fighter" && unit.variantId !== "bomber") {
    const label = UNIT_DISPLAY_INFO[unit.variantId]?.shortLabel ?? "?";
    ctx.fillStyle = "#f8fafc";
    ctx.font = "900 8px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 0, 0);
  }
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
  windowSize,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

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
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);

    drawBackground(ctx, camera, viewportWidth, viewportHeight);

    const unitsById = new Map(units.map((unit) => [unit.id, unit]));
    const selectedUnitIdSet = new Set(selectedUnitIds);
    const flashShooterIds = new Set(
      visualEffects
        .filter((effect) => effect.type === "flash")
        .map((effect) => effect.shooterId),
    );

    drawOrderLines(ctx, selectedUnitIds, unitsById, camera);
    drawObstacles(ctx, obstacles, camera, viewportWidth, viewportHeight);
    drawOrderMarkers(ctx, orderMarkers, camera);

    const groundUnits = [];
    const airUnits = [];
    for (const unit of units) {
      const radius = unit.isPlane || unit.isHelicopter ? 36 : 28;
      const screenX = unit.x - camera.x;
      const screenY = unit.y - camera.y;

      if (!isVisible(screenX - radius, screenY - radius, radius * 2, radius * 2, viewportWidth, viewportHeight)) {
        continue;
      }

      if (unit.isPlane || unit.isHelicopter) {
        airUnits.push(unit);
      } else {
        groundUnits.push(unit);
      }
    }

    for (const unit of [...groundUnits, ...airUnits]) {
      drawUnit(ctx, unit, {
        camera,
        hoveredUnitId,
        playerColor,
        selectedUnitIdSet,
        unitsById,
        flashShooterIds,
      });
    }

    for (const projectile of visualProjectiles) {
      const x = projectile.currentX - camera.x;
      const y = projectile.currentY - camera.y;

      if (!isVisible(x - 20, y - 20, 40, 40, viewportWidth, viewportHeight, 24)) {
        continue;
      }

      drawProjectile(ctx, projectile, camera);
    }

    drawVisualEffects(ctx, visualEffects, camera);
    drawSelectionBounds(ctx, selectionBounds, camera);
  }, [
    camera,
    hoveredUnitId,
    obstacles,
    orderMarkers,
    playerColor,
    selectedUnitIds,
    selectionBounds,
    units,
    visualEffects,
    visualProjectiles,
    windowSize,
  ]);

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
