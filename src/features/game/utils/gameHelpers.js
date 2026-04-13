import {
  FALLBACK_UNIT_DISPLAY,
  MAP_HEIGHT,
  MAP_WIDTH,
  UNIT_DISPLAY_INFO,
  UNIT_SELECTION_RADIUS,
} from "@/features/game/constants";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function clampCamera(camera, viewport) {
  const maxCamX = Math.max(0, MAP_WIDTH - viewport.width);
  const maxCamY = Math.max(0, MAP_HEIGHT - viewport.height);

  return {
    x: clamp(camera.x, 0, maxCamX),
    y: clamp(camera.y, 0, maxCamY),
  };
}

export function toMapPoint(clientX, clientY, camera) {
  return {
    x: clamp(clientX + camera.x, 0, MAP_WIDTH),
    y: clamp(clientY + camera.y, 0, MAP_HEIGHT),
  };
}

export function centerCameraOnUnits(units, viewport) {
  if (!units.length) {
    return { x: 0, y: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const unit of units) {
    if (unit.x < minX) minX = unit.x;
    if (unit.x > maxX) maxX = unit.x;
    if (unit.y < minY) minY = unit.y;
    if (unit.y > maxY) maxY = unit.y;
  }

  return clampCamera(
    {
      x: (minX + maxX) / 2 - viewport.width / 2,
      y: (minY + maxY) / 2 - viewport.height / 2,
    },
    viewport,
  );
}

export function getVisibleUnitsOfVariant(units, clickedUnit, playerColor, camera, windowSize) {
  const screenLeft = camera.x;
  const screenRight = camera.x + windowSize.width;
  const screenTop = camera.y;
  const screenBottom = camera.y + windowSize.height;

  return units
    .filter(
      (unit) =>
        unit.owner === playerColor &&
        unit.variantId === clickedUnit.variantId &&
        unit.x >= screenLeft &&
        unit.x <= screenRight &&
        unit.y >= screenTop &&
        unit.y <= screenBottom,
    )
    .map((unit) => unit.id);
}

export function normalizeSelection(selection) {
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

export function getUnitsInSelection(units, selection, playerColor) {
  const bounds = normalizeSelection(selection);
  const isClickSelection = bounds.width < 4 && bounds.height < 4;

  if (isClickSelection) {
    const clickedUnits = units.filter(
      (unit) =>
        Math.abs(unit.x - selection.currentX) <= UNIT_SELECTION_RADIUS &&
        Math.abs(unit.y - selection.currentY) <= UNIT_SELECTION_RADIUS,
    );

    if (clickedUnits.length === 0) {
      return [];
    }

    const playerUnits = clickedUnits.filter((unit) => unit.owner === playerColor);
    if (playerUnits.length > 0) {
      return playerUnits.map((unit) => unit.id);
    }

    return [clickedUnits[0].id];
  }

  return units
    .filter(
      (unit) =>
        unit.owner === playerColor &&
        unit.x >= bounds.left &&
        unit.x <= bounds.right &&
        unit.y >= bounds.top &&
        unit.y <= bounds.bottom,
    )
    .map((unit) => unit.id);
}

export function getUnitDisplay(unit) {
  if (!unit) {
    return null;
  }

  return UNIT_DISPLAY_INFO[unit.variantId] ?? {
    ...FALLBACK_UNIT_DISPLAY,
    name: unit.variantId,
  };
}

export function normalizeWorldUnit(unit) {
  return {
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
    isMoving: !!unit.isMoving,
    destinationX: unit.destinationX,
    destinationY: unit.destinationY,
    orderQueue: unit.orderQueue ?? [],
    angle: unit.angle ?? 0,
    isPlane: !!unit.isPlane,
    isHelicopter: !!unit.isHelicopter,
    speed: unit.speed ?? 0,
    damageModifiers: unit.damageModifiers ?? {},
  };
}

export function normalizeWorldUnitPatch(unitPatch) {
  const patch = { ...unitPatch };

  if ("attackTargetId" in patch) {
    patch.attackTargetId = patch.attackTargetId ?? null;
  }
  if ("isFiring" in patch) {
    patch.isFiring = !!patch.isFiring;
  }
  if ("isHoldingPosition" in patch) {
    patch.isHoldingPosition = !!patch.isHoldingPosition;
  }
  if ("isMoving" in patch) {
    patch.isMoving = !!patch.isMoving;
  }
  if ("orderQueue" in patch) {
    patch.orderQueue = patch.orderQueue ?? [];
  }
  if ("angle" in patch) {
    patch.angle = patch.angle ?? 0;
  }
  if ("isPlane" in patch) {
    patch.isPlane = !!patch.isPlane;
  }
  if ("isHelicopter" in patch) {
    patch.isHelicopter = !!patch.isHelicopter;
  }
  if ("damageModifiers" in patch) {
    patch.damageModifiers = patch.damageModifiers ?? {};
  }

  return patch;
}

export function applyWorldDelta(currentUnits, delta) {
  const unitsById = new Map(currentUnits.map((unit) => [unit.id, unit]));

  for (const removedUnitId of delta.removedUnitIds ?? []) {
    unitsById.delete(removedUnitId);
  }

  for (const incomingUnit of delta.units ?? []) {
    const patch = normalizeWorldUnitPatch(incomingUnit);
    const existingUnit = unitsById.get(patch.id);

    if (existingUnit) {
      unitsById.set(patch.id, {
        ...existingUnit,
        ...patch,
      });
      continue;
    }

    unitsById.set(patch.id, normalizeWorldUnit(patch));
  }

  return Array.from(unitsById.values());
}
