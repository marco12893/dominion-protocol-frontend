import { useState } from "react";

import { STARTING_RESOURCES, UNIT_DISPLAY_INFO } from "@/features/game/constants";

const INITIAL_QUANTITIES = {
  rifleman: 0,
  antiTank: 0,
  armoredCar: 0,
  lightTank: 0,
  fighter: 0,
  antiAir: 0,
  attackHelicopter: 0,
  heavyTank: 0,
};

export default function UnitSelectionModal({ onDeploy, playerColor }) {
  const [quantities, setQuantities] = useState(INITIAL_QUANTITIES);

  const totalCost = Object.entries(quantities).reduce(
    (sum, [id, quantity]) => sum + UNIT_DISPLAY_INFO[id].cost * quantity,
    0,
  );
  const remaining = STARTING_RESOURCES - totalCost;

  function handleUpdate(id, delta) {
    setQuantities((current) => ({
      ...current,
      [id]: Math.max(0, current[id] + delta),
    }));
  }

  function isAffordable(cost) {
    return remaining >= cost;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl">
      <div className="relative max-w-5xl w-full p-8 rounded-3xl border border-white/10 bg-[#0d1520]/95 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col h-[85vh]">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-400 font-bold mb-1">
              Logistics & Deployment
            </p>
            <h2 className="text-3xl font-black text-white">Battalion Composition</h2>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
              Available Credits
            </p>
            <div
              className={`text-3xl font-mono font-black transition-colors ${
                remaining < 0 ? "text-rose-500" : "text-emerald-400"
              }`}
            >
              {(remaining || 0).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 overflow-y-auto pr-4 custom-scrollbar mb-8">
          {Object.entries(UNIT_DISPLAY_INFO).map(([id, info]) => (
            <div
              key={id}
              className="group relative p-6 rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/60 transition-all"
            >
              <div className="flex gap-6">
                <div
                  className={`w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-black border-2 shadow-2xl ${
                    playerColor === "red"
                      ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                      : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                  } ${
                    id === "rifleman" || id === "antiTank"
                      ? "rounded-full"
                      : id === "armoredCar"
                        ? "rounded-lg"
                        : "rounded-none"
                  }`}
                >
                  {info.shortLabel}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{info.name}</h3>
                      <div className="flex gap-2 mt-1">
                        {info.attributes.map((attribute) => (
                          <span
                            key={attribute}
                            className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] uppercase tracking-wider text-slate-400"
                          >
                            {attribute}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-emerald-400 font-mono font-bold">
                      {info.cost} <span className="text-[10px] opacity-50">CR</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-slate-400 line-clamp-1">
                    {info.damageDescription}
                  </p>

                  <div className="mt-6 flex items-center gap-4">
                    <button
                      onClick={() => handleUpdate(id, -1)}
                      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl font-bold transition-colors"
                    >
                      -
                    </button>
                    <div className="w-12 text-center text-xl font-mono font-black text-white">
                      {quantities[id]}
                    </div>
                    <button
                      onClick={() => handleUpdate(id, 1)}
                      disabled={!isAffordable(info.cost)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold transition-all ${
                        isAffordable(info.cost)
                          ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                          : "bg-slate-800 text-slate-600 cursor-not-allowed"
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="text-blue-200/40 text-xs italic max-w-xs">
              &quot;Tactical efficiency depends on a balanced force. Ensure you have enough
              infantry to screen your heavy assets.&quot;
            </div>
          </div>

          <button
            disabled={totalCost === 0 || remaining < 0}
            onClick={() => onDeploy(quantities)}
            className={`px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all duration-300 ${
              totalCost > 0 && remaining >= 0
                ? "bg-cyan-500 text-slate-950 shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            Deploy Battalion
          </button>
        </div>
      </div>
    </div>
  );
}
