import { FALLBACK_UNIT_DISPLAY, UNIT_DISPLAY_INFO } from "@/features/game/constants";

export const DEFAULT_ARMY_RULES = Object.freeze({
  maxSlotsPerArmy: 6,
});

function toPositiveInt(value, fallback) {
  const normalizedValue = Math.floor(Number(value) || 0);
  return normalizedValue > 0 ? normalizedValue : fallback;
}

function normalizeArmySlot(slot) {
  if (!slot?.variantId) {
    return null;
  }

  const count = Math.max(0, Math.floor(Number(slot.count) || 0));
  if (count <= 0) {
    return null;
  }

  return {
    variantId: slot.variantId,
    count,
  };
}

export function normalizeArmyRules(rules = {}) {
  return {
    maxSlotsPerArmy: toPositiveInt(rules.maxSlotsPerArmy, DEFAULT_ARMY_RULES.maxSlotsPerArmy),
  };
}

export function normalizeHexArmy(army = {}, armyRules = DEFAULT_ARMY_RULES) {
  const normalizedRules = normalizeArmyRules(armyRules);
  const legacySlots = army.variantId
    ? [{ variantId: army.variantId, count: army.count ?? 1 }]
    : [];
  const slots = (Array.isArray(army.slots) ? army.slots : legacySlots)
    .map(normalizeArmySlot)
    .filter(Boolean)
    .slice(0, normalizedRules.maxSlotsPerArmy);
  const totalUnits = slots.reduce((sum, slot) => sum + slot.count, 0);
  const uniqueVariantCount = new Set(slots.map((slot) => slot.variantId)).size;
  const leadSlot = slots[0] ?? null;

  return {
    ...army,
    slots,
    variantId: leadSlot?.variantId ?? null,
    totalUnits,
    usedSlots: slots.length,
    uniqueVariantCount,
  };
}

export function normalizeHexArmies(armies = [], armyRules = DEFAULT_ARMY_RULES) {
  if (!Array.isArray(armies)) {
    return [];
  }

  return armies.map((army) => normalizeHexArmy(army, armyRules));
}

export function getArmyLeadDisplay(army) {
  const normalizedArmy = normalizeHexArmy(army);
  return UNIT_DISPLAY_INFO[normalizedArmy.slots[0]?.variantId] ?? FALLBACK_UNIT_DISPLAY;
}

export function getArmyTitle(army) {
  const normalizedArmy = normalizeHexArmy(army);
  if (!normalizedArmy.usedSlots) {
    return "Empty Army";
  }

  const leadDisplay = getArmyLeadDisplay(normalizedArmy);
  return normalizedArmy.uniqueVariantCount > 1
    ? "Mixed Army"
    : `${leadDisplay.name} Army`;
}

export function getArmyShortLabel(army) {
  const normalizedArmy = normalizeHexArmy(army);
  if (!normalizedArmy.usedSlots) {
    return FALLBACK_UNIT_DISPLAY.shortLabel;
  }

  if (normalizedArmy.uniqueVariantCount > 1) {
    return "MX";
  }

  return getArmyLeadDisplay(normalizedArmy).shortLabel;
}

export function getArmySubtitle(army) {
  const normalizedArmy = normalizeHexArmy(army);
  if (!normalizedArmy.usedSlots) {
    return "No deployed units";
  }

  if (normalizedArmy.uniqueVariantCount > 1) {
    return `${normalizedArmy.totalUnits} total across ${normalizedArmy.usedSlots} slots`;
  }

  return `${normalizedArmy.totalUnits} total in ${normalizedArmy.usedSlots} slot${normalizedArmy.usedSlots === 1 ? "" : "s"}`;
}

export function getArmySlotCapacity(unitCatalog = {}, variantId) {
  const rawCapacity = Number(unitCatalog?.[variantId]?.slotCapacity);
  if (!Number.isFinite(rawCapacity) || rawCapacity <= 0) {
    return 0;
  }

  return Math.floor(rawCapacity);
}

export function getMaxAddableUnits(
  army,
  variantId,
  unitCatalog = {},
  armyRules = DEFAULT_ARMY_RULES,
) {
  const slotCapacity = getArmySlotCapacity(unitCatalog, variantId);
  if (!slotCapacity) {
    return 0;
  }

  const normalizedRules = normalizeArmyRules(armyRules);
  const normalizedArmy = normalizeHexArmy(army, normalizedRules);
  const roomInMatchingSlots = normalizedArmy.slots.reduce((sum, slot) => {
    if (slot.variantId !== variantId) {
      return sum;
    }

    return sum + Math.max(0, slotCapacity - slot.count);
  }, 0);
  const openSlots = Math.max(0, normalizedRules.maxSlotsPerArmy - normalizedArmy.usedSlots);

  return roomInMatchingSlots + openSlots * slotCapacity;
}
