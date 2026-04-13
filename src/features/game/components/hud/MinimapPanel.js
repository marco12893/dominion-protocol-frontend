import { useEffect, useRef } from "react";

import { MAP_HEIGHT, MAP_WIDTH } from "@/features/game/constants";

export default function MinimapPanel({
  camera,
  obstacles,
  onIssueMove,
  onNavigate,
  selectedUnitIds,
  units,
  windowSize,
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);

  function getMapPointFromEvent(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) / rect.width;
    const clickY = (event.clientY - rect.top) / rect.height;

    return {
      x: Math.max(0, Math.min(MAP_WIDTH, clickX * MAP_WIDTH)),
      y: Math.max(0, Math.min(MAP_HEIGHT, clickY * MAP_HEIGHT)),
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const { width, height } = frame.getBoundingClientRect();
    if (width <= 0 || height <= 0) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const selectedUnitIdSet = new Set(selectedUnitIds);

    ctx.fillStyle = "#070c13";
    ctx.fillRect(0, 0, width, height);

    for (const obstacle of obstacles) {
      ctx.fillStyle = "rgba(100, 116, 139, 0.4)";
      ctx.fillRect(
        (obstacle.x / MAP_WIDTH) * width,
        (obstacle.y / MAP_HEIGHT) * height,
        (obstacle.width / MAP_WIDTH) * width,
        (obstacle.height / MAP_HEIGHT) * height,
      );
    }

    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(
      (camera.x / MAP_WIDTH) * width,
      (camera.y / MAP_HEIGHT) * height,
      (windowSize.width / MAP_WIDTH) * width,
      (windowSize.height / MAP_HEIGHT) * height,
    );
    ctx.strokeRect(
      (camera.x / MAP_WIDTH) * width,
      (camera.y / MAP_HEIGHT) * height,
      (windowSize.width / MAP_WIDTH) * width,
      (windowSize.height / MAP_HEIGHT) * height,
    );

    for (const unit of units) {
      ctx.fillStyle = unit.owner === "red" ? "#f43f5e" : "#22d3ee";
      ctx.beginPath();
      ctx.arc(
        (unit.x / MAP_WIDTH) * width,
        (unit.y / MAP_HEIGHT) * height,
        selectedUnitIdSet.has(unit.id) ? 3.5 : 2.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }, [camera, obstacles, selectedUnitIds, units, windowSize]);

  return (
    <div className="flex-shrink-0 p-2" style={{ width: "calc(100% * 2 / 12)" }}>
      <div
        ref={frameRef}
        className="relative w-full h-full rounded-lg overflow-hidden border border-white/15 bg-[#070c13] shadow-[0_0_20px_rgba(0,0,0,0.6)] cursor-crosshair"
        onClick={(event) => onNavigate(getMapPointFromEvent(event))}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (selectedUnitIds.length === 0) {
            return;
          }

          onIssueMove(getMapPointFromEvent(event));
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />

        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-cyan-500/30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-cyan-500/30 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-cyan-500/30 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-cyan-500/30 pointer-events-none" />
      </div>
    </div>
  );
}
