"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const MAP_WIDTH = 960;
const MAP_HEIGHT = 540;
const UNIT_SELECTION_RADIUS = 12;
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";
const INITIAL_UNITS = [
  { id: "unit-1", x: 180, y: 160 },
  { id: "unit-2", x: 300, y: 240 },
  { id: "unit-3", x: 420, y: 180 },
  { id: "unit-4", x: 540, y: 300 },
  { id: "unit-5", x: 660, y: 220 },
];

export default function Home() {
  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState(["unit-1"]);
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [selectionBox, setSelectionBox] = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("world:state", (state) => {
      if (Array.isArray(state?.units)) {
        setUnits(
          state.units.map((unit) => ({
            id: unit.id,
            x: unit.x,
            y: unit.y,
          })),
        );
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  function handleMapRightClick(event) {
    event.preventDefault();

    if (selectedUnitIds.length === 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = {
      x: Math.max(0, Math.min(MAP_WIDTH, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(MAP_HEIGHT, event.clientY - bounds.top)),
    };

    socketRef.current?.emit("unit:move", {
      unitIds: selectedUnitIds,
      position,
    });
  }

  useEffect(() => {
    if (!selectionBox) {
      return;
    }

    function handlePointerMove(event) {
      const bounds = mapRef.current?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      const current = toMapPoint(event, bounds);
      const nextSelectionBox = {
        startX: selectionBox.startX,
        startY: selectionBox.startY,
        currentX: current.x,
        currentY: current.y,
      };

      setSelectionBox(nextSelectionBox);
      setSelectedUnitIds(getUnitsInSelection(units, nextSelectionBox));
    }

    function handlePointerUp(event) {
      const bounds = mapRef.current?.getBoundingClientRect();

      if (bounds) {
        const current = toMapPoint(event, bounds);
        const completedSelection = {
          startX: selectionBox.startX,
          startY: selectionBox.startY,
          currentX: current.x,
          currentY: current.y,
        };

        setSelectedUnitIds(getUnitsInSelection(units, completedSelection));
      }

      setSelectionBox(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [selectionBox, units]);

  function handleMapPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const start = toMapPoint(event, bounds);

    setSelectionBox({
      startX: start.x,
      startY: start.y,
      currentX: start.x,
      currentY: start.y,
    });
    setSelectedUnitIds(getUnitsInSelection(units, {
      startX: start.x,
      startY: start.y,
      currentX: start.x,
      currentY: start.y,
    }));
  }

  const selectionBounds = selectionBox
    ? normalizeSelection(selectionBox)
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#23384d_0%,#0f1722_45%,#05070a_100%)] px-6 py-10 text-slate-100">
      <section className="w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
              Dominion Protocol
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              RTS Prototype
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              Drag a selection box with left click, then right-click the map to
              move the selected units.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              Selected:{" "}
              {selectedUnitIds.length > 0 ? selectedUnitIds.join(", ") : "none"}
            </div>
            <div
              className={`rounded-full border px-4 py-2 text-sm ${
                isConnected
                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-200"
                  : "border-amber-400/50 bg-amber-400/15 text-amber-200"
              }`}
            >
              {isConnected ? "Socket connected" : "Socket disconnected"}
            </div>
          </div>
        </div>

        <div
          ref={mapRef}
          onPointerDown={handleMapPointerDown}
          onContextMenu={handleMapRightClick}
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#13212d] shadow-2xl shadow-black/30 select-none"
          style={{
            width: "100%",
            maxWidth: `${MAP_WIDTH}px`,
            aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at center, rgba(43,91,122,0.22), rgba(9,16,24,0.92))",
            backgroundSize: "48px 48px, 48px 48px, cover",
            backgroundPosition: "-1px -1px, -1px -1px, center",
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,197,94,0.06),transparent_35%,rgba(34,211,238,0.08))]" />

          {selectionBounds ? (
            <div
              className="pointer-events-none absolute border border-cyan-200/80 bg-cyan-300/10"
              style={{
                left: `${selectionBounds.left}px`,
                top: `${selectionBounds.top}px`,
                width: `${selectionBounds.width}px`,
                height: `${selectionBounds.height}px`,
              }}
            />
          ) : null}

          {units.map((unit) => {
            const isSelected = selectedUnitIds.includes(unit.id);

            return (
              <div
                key={unit.id}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75 ease-linear"
                style={{
                  left: `${unit.x}px`,
                  top: `${unit.y}px`,
                }}
              >
                <span
                  className={`absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border transition ${
                    isSelected
                      ? "border-amber-300/90 shadow-[0_0_18px_rgba(252,211,77,0.45)]"
                      : "border-transparent"
                  }`}
                />
                <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/80 bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.9)]" />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function toMapPoint(event, bounds) {
  return {
    x: Math.max(0, Math.min(MAP_WIDTH, event.clientX - bounds.left)),
    y: Math.max(0, Math.min(MAP_HEIGHT, event.clientY - bounds.top)),
  };
}

function normalizeSelection(selection) {
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

function getUnitsInSelection(units, selection) {
  const bounds = normalizeSelection(selection);
  const isClickSelection =
    bounds.width < 4 &&
    bounds.height < 4;

  return units
    .filter((unit) => {
      if (isClickSelection) {
        return (
          Math.abs(unit.x - selection.currentX) <= UNIT_SELECTION_RADIUS &&
          Math.abs(unit.y - selection.currentY) <= UNIT_SELECTION_RADIUS
        );
      }

      return (
        unit.x >= bounds.left &&
        unit.x <= bounds.right &&
        unit.y >= bounds.top &&
        unit.y <= bounds.bottom
      );
    })
    .map((unit) => unit.id);
}
