import { getHexesInRange } from "@/features/game/utils/hexMath";

export const RESOURCE_TRACKER_ORDER = ["gold", "oil", "iron", "wheat"];

export const EMPTY_RESOURCE_COUNTS = Object.freeze({
  gold: 0,
  oil: 0,
  iron: 0,
  wheat: 0,
});

export const RESOURCE_LABELS = Object.freeze({
  gold: "Gold",
  oil: "Oil",
  iron: "Iron",
  wheat: "Wheat",
});

export const RESOURCE_ICON_ASSETS = Object.freeze({
  gold: "/assets/Resources/Gold Ore.png",
  oil: "/assets/Resources/Oil.png",
  iron: "/assets/Resources/Iron.png",
  wheat: "/assets/Resources/Wheat.png",
});

export const RESOURCE_MARKER_SPRITE_KEYS = Object.freeze({
  gold: "MarkerGold",
  oil: "MarkerOil",
  iron: "MarkerIron",
  wheat: "MarkerWheat",
});

export const CITY_BASE_GOLD_INCOME = 4;

export const IMPROVEMENT_RESOURCE_YIELDS = Object.freeze({
  farm: Object.freeze({ wheat: 2 }),
  mine: Object.freeze({ iron: 2 }),
  oilWell: Object.freeze({ oil: 2 }),
});

export function normalizeResourceCounts(counts = {}) {
  const nextCounts = { ...EMPTY_RESOURCE_COUNTS };

  for (const resourceType of RESOURCE_TRACKER_ORDER) {
    const value = Number(counts?.[resourceType]);
    nextCounts[resourceType] = Number.isFinite(value) ? value : 0;
  }

  return nextCounts;
}

export function normalizeResourceLedger(ledger = {}, playerColors = []) {
  const nextLedger = {};

  for (const playerColor of playerColors) {
    nextLedger[playerColor] = normalizeResourceCounts(ledger?.[playerColor]);
  }

  return nextLedger;
}

export function canAffordResourceCost(stockpile = {}, cost = {}) {
  const normalizedStockpile = normalizeResourceCounts(stockpile);
  const normalizedCost = normalizeResourceCounts(cost);

  return RESOURCE_TRACKER_ORDER.every(
    (resourceType) => normalizedStockpile[resourceType] >= normalizedCost[resourceType],
  );
}

export function hasAnyResourceValue(counts = {}) {
  const normalizedCounts = normalizeResourceCounts(counts);
  return RESOURCE_TRACKER_ORDER.some((resourceType) => normalizedCounts[resourceType] > 0);
}

export function computeCityIncome(city, terrainGrid, cols, rows) {
  const income = normalizeResourceCounts({ gold: CITY_BASE_GOLD_INCOME });

  for (const hex of getHexesInRange(city.centerCol, city.centerRow, 1, cols, rows)) {
    const tile = terrainGrid[hex.row * cols + hex.col];
    const yieldDefinition = IMPROVEMENT_RESOURCE_YIELDS[tile?.improvementType];
    if (!yieldDefinition) {
      continue;
    }

    for (const [resourceType, amount] of Object.entries(yieldDefinition)) {
      income[resourceType] += amount;
    }
  }

  return income;
}
