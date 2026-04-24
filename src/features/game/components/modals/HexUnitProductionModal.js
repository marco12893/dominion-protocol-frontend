/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

import { FALLBACK_UNIT_DISPLAY, UNIT_DISPLAY_INFO } from "@/features/game/constants";
import {
  RESOURCE_ICON_ASSETS,
  RESOURCE_LABELS,
  RESOURCE_TRACKER_ORDER,
  canAffordResourceCost,
  hasAnyResourceValue,
  normalizeResourceCounts,
} from "@/features/game/constants/hexEconomy";
import { UNIT_ASSETS } from "@/features/game/constants/assets";
import UnitPreviewImage from "@/features/game/components/UnitPreviewImage";
import {
  getArmySlotCapacity,
  getArmySubtitle,
  getArmyTitle,
  getMaxAddableUnits,
  normalizeArmyRules,
  normalizeHexArmy,
} from "@/features/game/utils/hexArmy";

function ResourceValueRow({ counts, accentClassName = "text-slate-200" }) {
  const normalizedCounts = normalizeResourceCounts(counts);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {RESOURCE_TRACKER_ORDER.map((resourceType) => {
        const value = normalizedCounts[resourceType];
        if (value <= 0) {
          return null;
        }

        return (
          <div
            key={resourceType}
            className={`inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-xs font-semibold ${accentClassName}`}
          >
            <img
              src={RESOURCE_ICON_ASSETS[resourceType]}
              alt={RESOURCE_LABELS[resourceType]}
              className="h-4 w-4 object-contain"
            />
            <span>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

function multiplyResourceCounts(counts = {}, multiplier = 1) {
  const normalizedCounts = normalizeResourceCounts(counts);
  const normalizedMultiplier = Math.max(0, Math.floor(Number(multiplier) || 0));
  const nextCounts = normalizeResourceCounts({});

  for (const resourceType of RESOURCE_TRACKER_ORDER) {
    nextCounts[resourceType] = normalizedCounts[resourceType] * normalizedMultiplier;
  }

  return nextCounts;
}

function getMaxAffordableQuantity(stockpile = {}, costPerUnit = {}) {
  const normalizedStockpile = normalizeResourceCounts(stockpile);
  const normalizedCost = normalizeResourceCounts(costPerUnit);
  let maxAffordable = Number.POSITIVE_INFINITY;
  let hasCost = false;

  for (const resourceType of RESOURCE_TRACKER_ORDER) {
    const resourceCost = normalizedCost[resourceType];
    if (resourceCost <= 0) {
      continue;
    }

    hasCost = true;
    maxAffordable = Math.min(
      maxAffordable,
      Math.floor(normalizedStockpile[resourceType] / resourceCost),
    );
  }

  return hasCost ? Math.max(0, maxAffordable) : Number.MAX_SAFE_INTEGER;
}

function normalizeQuantityValue(value) {
  return Math.max(1, Math.floor(Number(value) || 0));
}

export default function HexUnitProductionModal({
  armyRules,
  buildError,
  city,
  cityIncome,
  isBusy,
  onBuildUnit,
  onClose,
  playerColor,
  resourceStockpile,
  stationedArmy,
  unitCatalog,
}) {
  const [quantities, setQuantities] = useState({});

  if (!city) {
    return null;
  }

  const normalizedStockpile = normalizeResourceCounts(resourceStockpile);
  const normalizedArmyRules = normalizeArmyRules(armyRules);
  const friendlyStationedArmy = stationedArmy?.owner === playerColor
    ? normalizeHexArmy(stationedArmy, normalizedArmyRules)
    : null;
  const hostileOccupant = stationedArmy && stationedArmy.owner && stationedArmy.owner !== playerColor
    ? stationedArmy
    : null;
  const totalSlotsUsed = friendlyStationedArmy?.usedSlots ?? 0;
  const openSlots = Math.max(0, normalizedArmyRules.maxSlotsPerArmy - totalSlotsUsed);

  function updateQuantity(variantId, nextValue) {
    setQuantities((current) => ({
      ...current,
      [variantId]: normalizeQuantityValue(nextValue),
    }));
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/82 px-4 py-6 backdrop-blur-xl"
      onPointerDown={onClose}
    >
      <div
        className="relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-amber-300/15 bg-[linear-gradient(160deg,rgba(12,22,31,0.97),rgba(18,32,45,0.96))] shadow-[0_35px_120px_rgba(0,0,0,0.65)]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/6 bg-[radial-gradient(circle_at_top_left,rgba(217,119,6,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0))] px-6 py-5 sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.45em] text-amber-300/75">
                City Foundry
              </div>
              <h2 className="mt-2 text-3xl font-black text-white">{city.name ?? city.id}</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300/75">
                Recruit strength directly into the city-center garrison. Overflow from a full slot
                automatically spills into the next free army slot until the six-slot cap is reached.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="rounded-2xl border border-white/7 bg-slate-950/35 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    City Garrison
                  </div>
                  <div className="mt-2 text-lg font-black text-white">
                    {hostileOccupant
                      ? "Occupied"
                      : friendlyStationedArmy
                        ? getArmyTitle(friendlyStationedArmy)
                        : "No Garrison"}
                  </div>
                  <div className="mt-1 text-sm text-slate-300/75">
                    {hostileOccupant
                      ? "Hostile forces are sitting on the city center. Clear them before recruiting."
                      : friendlyStationedArmy
                        ? getArmySubtitle(friendlyStationedArmy)
                        : "The first purchase here will create a fresh city-center army."}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-right">
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Slots
                  </div>
                  <div className="mt-1 text-2xl font-black text-white">
                    {totalSlotsUsed}/{normalizedArmyRules.maxSlotsPerArmy}
                  </div>
                  <div className="text-xs text-slate-400">
                    {hostileOccupant
                      ? "Recruitment blocked"
                      : `${openSlots} slot${openSlots === 1 ? "" : "s"} open`}
                  </div>
                </div>
              </div>

              {friendlyStationedArmy?.slots?.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {friendlyStationedArmy.slots.map((slot, index) => {
                    const display = UNIT_DISPLAY_INFO[slot.variantId] ?? FALLBACK_UNIT_DISPLAY;
                    return (
                      <div
                        key={`${slot.variantId}-${index}`}
                        className="rounded-2xl border border-white/8 bg-white/5 px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-white">{display.name}</div>
                            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                              Slot {index + 1}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-amber-100">{slot.count}</div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                              strength
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-white/7 bg-slate-950/35 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  Stockpile
                </div>
                <div className="mt-3">
                  <ResourceValueRow counts={normalizedStockpile} accentClassName="text-slate-100" />
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/8 px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300/70">
                  City Yield
                </div>
                <div className="mt-3">
                  <ResourceValueRow counts={cityIncome} accentClassName="text-emerald-100" />
                </div>
              </div>
            </div>
          </div>

          {buildError && (
            <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200">
              {buildError}
            </div>
          )}
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {Object.entries(unitCatalog ?? {}).map(([variantId, definition]) => {
              const display = UNIT_DISPLAY_INFO[variantId] ?? FALLBACK_UNIT_DISPLAY;
              const unitCost = normalizeResourceCounts(definition?.cost);
              const slotCapacity = getArmySlotCapacity(unitCatalog, variantId);
              const requestedQuantity = normalizeQuantityValue(quantities[variantId] ?? 1);
              const roomInArmy = hostileOccupant
                ? 0
                : getMaxAddableUnits(
                  friendlyStationedArmy ?? { slots: [] },
                  variantId,
                  unitCatalog,
                  normalizedArmyRules,
                );
              const affordableQuantity = getMaxAffordableQuantity(normalizedStockpile, unitCost);
              const totalCost = multiplyResourceCounts(unitCost, requestedQuantity);
              const canAffordRequested = canAffordResourceCost(normalizedStockpile, totalCost);
              const maxRecruitable = Math.max(0, Math.min(roomInArmy, affordableQuantity));
              const canRecruit =
                !isBusy &&
                !hostileOccupant &&
                requestedQuantity > 0 &&
                requestedQuantity <= roomInArmy &&
                canAffordRequested;

              let helperLabel = "Recruit directly into the city-center army";
              if (hostileOccupant) {
                helperLabel = "City center occupied by hostile forces";
              } else if (roomInArmy <= 0) {
                helperLabel = "No slot capacity remains for this unit type";
              } else if (affordableQuantity <= 0) {
                helperLabel = "Insufficient resources";
              } else if (requestedQuantity > roomInArmy) {
                helperLabel = `Only ${roomInArmy} can fit inside the remaining army slots`;
              } else if (requestedQuantity > affordableQuantity) {
                helperLabel = `Current stockpile supports ${affordableQuantity} right now`;
              }

              return (
                <div
                  key={variantId}
                  className="group relative overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(160deg,rgba(15,23,33,0.92),rgba(9,16,25,0.92))] p-5 shadow-[0_20px_40px_rgba(0,0,0,0.28)]"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  <div className="flex gap-4">
                    <div
                      className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white/[0.04] shadow-inner ${
                        playerColor === "red"
                          ? "border-rose-400/30"
                          : "border-cyan-300/30"
                      }`}
                    >
                      <UnitPreviewImage
                        unitId={variantId}
                        assetPath={UNIT_ASSETS[variantId]}
                        alt={display.name}
                        className="h-[82%] w-[82%] object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-xl font-black text-white">{display.name}</h3>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {display.attributes.map((attribute) => (
                              <span
                                key={attribute}
                                className="rounded-full border border-white/8 bg-white/5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400"
                              >
                                {attribute}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-full border border-amber-300/15 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                          {display.shortLabel}
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-slate-300/75">{display.damageDescription}</p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <div className="rounded-full border border-cyan-300/15 bg-cyan-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
                          {slotCapacity}/slot
                        </div>
                        <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                          Room {roomInArmy}
                        </div>
                        {Number.isFinite(maxRecruitable) && (
                          <div className="rounded-full border border-emerald-300/15 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100">
                            Affordable {maxRecruitable}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {RESOURCE_TRACKER_ORDER.map((resourceType) => {
                      const value = unitCost[resourceType];
                      if (value <= 0) {
                        return null;
                      }

                      return (
                        <div
                          key={resourceType}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-xs font-semibold text-slate-100"
                        >
                          <img
                            src={RESOURCE_ICON_ASSETS[resourceType]}
                            alt={RESOURCE_LABELS[resourceType]}
                            className="h-4 w-4 object-contain"
                          />
                          <span>{value}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-2xl border border-white/8 bg-white/5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(variantId, requestedQuantity - 1)}
                        className="h-11 w-11 rounded-l-2xl text-lg font-black text-slate-200 transition-colors hover:bg-white/10"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={requestedQuantity}
                        onChange={(event) => updateQuantity(variantId, event.target.value)}
                        className="h-11 w-20 border-x border-white/8 bg-transparent text-center text-lg font-black text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => updateQuantity(variantId, requestedQuantity + 1)}
                        disabled={maxRecruitable <= 0 || requestedQuantity >= maxRecruitable}
                        className={`h-11 w-11 rounded-r-2xl text-lg font-black transition-colors ${
                          maxRecruitable > 0 && requestedQuantity < maxRecruitable
                            ? "text-slate-100 hover:bg-white/10"
                            : "cursor-not-allowed text-slate-600"
                        }`}
                      >
                        +
                      </button>
                    </div>

                    <div className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-white/5 px-3 py-2">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        Total Cost
                      </div>
                      <div className="mt-2">
                        {hasAnyResourceValue(totalCost) ? (
                          <ResourceValueRow counts={totalCost} accentClassName="text-slate-100" />
                        ) : (
                          <div className="text-xs text-slate-500">No resource requirements</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-500">{helperLabel}</div>

                    <button
                      type="button"
                      onClick={() => onBuildUnit(variantId, requestedQuantity)}
                      disabled={!canRecruit}
                      className={`rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-[0.25em] transition-all ${
                        canRecruit
                          ? "bg-amber-300 text-slate-950 shadow-[0_12px_30px_rgba(252,211,77,0.25)] hover:-translate-y-0.5 hover:bg-amber-200"
                          : "cursor-not-allowed border border-white/6 bg-white/5 text-slate-500"
                      }`}
                    >
                      {friendlyStationedArmy ? `Add ${requestedQuantity}` : `Create ${requestedQuantity}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
