"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import BattlefieldStyles from "@/features/game/components/BattlefieldStyles";
import BattlefieldTopOverlay from "@/features/game/components/BattlefieldTopOverlay";
import BattlefieldWorld from "@/features/game/components/BattlefieldWorld";
import ControlGroupsOverlay from "@/features/game/components/ControlGroupsOverlay";
import BottomHud from "@/features/game/components/hud/BottomHud";
import ColorChooserModal from "@/features/game/components/modals/ColorChooserModal";
import UnitSelectionModal from "@/features/game/components/modals/UnitSelectionModal";
import {
  INITIAL_OBSTACLES,
  INITIAL_TEAM_SELECTIONS,
  INITIAL_UNITS,
  MAP_HEIGHT,
  MAP_WIDTH,
  SOCKET_URL,
  UNIT_CLICK_RADIUS,
  UNIT_SELECTION_RADIUS,
} from "@/features/game/constants";
import {
  centerCameraOnUnits,
  clampCamera,
  getUnitDisplay,
  getUnitsInSelection,
  getVisibleUnitsOfVariant,
  normalizeSelection,
  normalizeWorldUnit,
  toMapPoint,
} from "@/features/game/utils/gameHelpers";

export default function BattlefieldClient() {
  const socketRef = useRef(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });
  const lastDigitKeyPressRef = useRef({});
  const latestStateRef = useRef({});
  const playerColorRef = useRef(null);
  const prevTeamSelectionsRef = useRef(INITIAL_TEAM_SELECTIONS);
  const unitsRef = useRef(INITIAL_UNITS);

  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [controlGroups, setControlGroups] = useState({});
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [hoveredUnitId, setHoveredUnitId] = useState(null);
  const [isAttackMoveMode, setIsAttackMoveMode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [obstacles, setObstacles] = useState(INITIAL_OBSTACLES);
  const [orderMarkers, setOrderMarkers] = useState([]);
  const [playerColor, setPlayerColor] = useState(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);
  const [teamSelections, setTeamSelections] = useState(INITIAL_TEAM_SELECTIONS);
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [visualEffects, setVisualEffects] = useState([]);
  const [visualProjectiles, setVisualProjectiles] = useState([]);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const opponentColor = playerColor === "blue" ? "red" : "blue";

  useEffect(() => {
    latestStateRef.current = {
      camera,
      controlGroups,
      playerColor,
      selectedUnitIds,
      units,
      windowSize,
    };
  }, [camera, controlGroups, playerColor, selectedUnitIds, units, windowSize]);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  function addNotification(message, type = "info") {
    const id = Math.random().toString(36).slice(2, 11);

    setNotifications((current) =>
      [{ id, message, type, timestamp: Date.now() }, ...current].slice(0, 5),
    );

    window.setTimeout(() => {
      setNotifications((current) => current.filter((entry) => entry.id !== id));
    }, 5000);
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      setOrderMarkers((current) => {
        const now = Date.now();
        const next = current.filter((marker) => now - marker.timestamp < 350);
        return next.length !== current.length ? next : current;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleResize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const latest = latestStateRef.current;

      if (event.key in keysRef.current) {
        keysRef.current[event.key] = true;
      }

      const key = event.key.toLowerCase();

      if (key === "a") {
        if (latest.selectedUnitIds?.length > 0) {
          setIsAttackMoveMode(true);
        }
        return;
      }

      if (key === "s") {
        setIsAttackMoveMode(false);
        if (latest.selectedUnitIds?.length > 0) {
          socketRef.current?.emit("unit:stop", {
            unitIds: latest.selectedUnitIds,
            isQueued: event.shiftKey,
          });
        }
        return;
      }

      if (key === "h") {
        setIsAttackMoveMode(false);
        if (latest.selectedUnitIds?.length > 0) {
          socketRef.current?.emit("unit:holdPosition", {
            unitIds: latest.selectedUnitIds,
            isQueued: event.shiftKey,
          });
        }
        return;
      }

      if (event.key === "Escape") {
        setIsAttackMoveMode(false);
        return;
      }

      const digitMatch = event.code?.match(/^(?:Digit|Numpad)([0-9])$/);
      if (!digitMatch) {
        return;
      }

      const digitKey = digitMatch[1];
      if (event.ctrlKey || event.shiftKey) {
        event.preventDefault();
      }

      if (event.ctrlKey) {
        setControlGroups((current) => ({
          ...current,
          [digitKey]: latest.selectedUnitIds ?? [],
        }));
        return;
      }

      if (event.shiftKey) {
        setControlGroups((current) => {
          const existing = current[digitKey] || [];
          return {
            ...current,
            [digitKey]: Array.from(new Set([...existing, ...(latest.selectedUnitIds ?? [])])),
          };
        });
        return;
      }

      const now = Date.now();
      const lastTime = lastDigitKeyPressRef.current[digitKey] || 0;
      const isDoubleTap = now - lastTime < 350;
      lastDigitKeyPressRef.current[digitKey] = now;

      const groupIds = (latest.controlGroups?.[digitKey] || []).filter((id) =>
        latest.units?.some(
          (unit) => unit.id === id && unit.owner === latest.playerColor && unit.health > 0,
        ),
      );

      setSelectedUnitIds(groupIds);

      if (isDoubleTap && groupIds.length > 0) {
        const groupUnits = latest.units.filter((unit) => groupIds.includes(unit.id));
        setCamera(centerCameraOnUnits(groupUnits, latest.windowSize));
      }
    }

    function handleKeyUp(event) {
      if (event.key in keysRef.current) {
        keysRef.current[event.key] = false;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    function handleMouseMove(event) {
      mousePosRef.current = { x: event.clientX, y: event.clientY };

      const latest = latestStateRef.current;
      if (!latest.units || !latest.camera) {
        return;
      }

      const mapX = event.clientX + latest.camera.x;
      const mapY = event.clientY + latest.camera.y;

      let foundId = null;
      for (let index = latest.units.length - 1; index >= 0; index -= 1) {
        const unit = latest.units[index];
        if (unit.health <= 0) {
          continue;
        }

        const distance = Math.hypot(unit.x - mapX, unit.y - mapY);
        if (distance <= UNIT_CLICK_RADIUS) {
          foundId = unit.id;
          break;
        }
      }

      setHoveredUnitId((current) => (current !== foundId ? foundId : current));
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    function updateCamera(time) {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const panSpeed = 900;
      const edgeThreshold = 40;
      let deltaX = 0;
      let deltaY = 0;

      if (keysRef.current.ArrowUp) deltaY -= panSpeed * deltaTime;
      if (keysRef.current.ArrowDown) deltaY += panSpeed * deltaTime;
      if (keysRef.current.ArrowLeft) deltaX -= panSpeed * deltaTime;
      if (keysRef.current.ArrowRight) deltaX += panSpeed * deltaTime;

      if (mousePosRef.current.x < edgeThreshold) deltaX -= panSpeed * deltaTime;
      if (mousePosRef.current.x > window.innerWidth - edgeThreshold) deltaX += panSpeed * deltaTime;
      if (mousePosRef.current.y < edgeThreshold) deltaY -= panSpeed * deltaTime;
      if (mousePosRef.current.y > window.innerHeight - edgeThreshold) deltaY += panSpeed * deltaTime;

      if (deltaX !== 0 || deltaY !== 0) {
        setCamera((current) =>
          clampCamera(
            { x: current.x + deltaX, y: current.y + deltaY },
            { width: window.innerWidth, height: window.innerHeight },
          ),
        );
      }

      animationFrameId = requestAnimationFrame(updateCamera);
    }

    animationFrameId = requestAnimationFrame(updateCamera);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setVisualEffects((current) => {
        const now = Date.now();
        const next = current.filter((effect) => now - effect.timestamp < 250);
        return next.length !== current.length ? next : current;
      });
    }, 50);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let animationFrameId;
    let lastTime = performance.now();

    function updateProjectiles(time) {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      if (deltaTime > 0) {
        setVisualProjectiles((current) => {
          if (current.length === 0) {
            return current;
          }

          const next = [];
          const currentUnits = unitsRef.current;

          for (const projectile of current) {
            const target = currentUnits.find(
              (unit) => unit.id === projectile.targetId && unit.health > 0,
            );
            const targetX = target ? target.x : (projectile.lastTargetPos?.x ?? projectile.currentX);
            const targetY = target ? target.y : (projectile.lastTargetPos?.y ?? projectile.currentY);
            const deltaX = targetX - projectile.currentX;
            const deltaY = targetY - projectile.currentY;
            const distance = Math.hypot(deltaX, deltaY);

            if (distance < 12) {
              continue;
            }

            const step = projectile.speed * deltaTime;
            const move = Math.min(distance, step);

            next.push({
              ...projectile,
              currentX: projectile.currentX + (deltaX / distance) * move,
              currentY: projectile.currentY + (deltaY / distance) * move,
              angle: Math.atan2(deltaY, deltaX),
              lastTargetPos: target ? { x: target.x, y: target.y } : projectile.lastTargetPos,
            });
          }

          return next;
        });
      }

      animationFrameId = requestAnimationFrame(updateProjectiles);
    }

    animationFrameId = requestAnimationFrame(updateProjectiles);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("game:reset", () => {
      setPlayerColor(null);
      setSelectedUnitIds([]);
      setControlGroups({});
      setVisualProjectiles([]);
      setVisualEffects([]);
    });
    socket.on("unit:attack", (data) => {
      if (data.variantId === "lightTank" || data.variantId === "heavyTank") {
        setVisualEffects((current) => [
          ...current,
          {
            id: `${data.id}-flash`,
            type: "flash",
            shooterId: data.unitId,
            timestamp: Date.now(),
          },
        ]);
      }
    });
    socket.on("unit:shootProjectile", (projectile) => {
      setVisualProjectiles((current) => [
        ...current,
        {
          ...projectile,
          currentX: projectile.startX,
          currentY: projectile.startY,
        },
      ]);
    });
    socket.on("world:state", (state) => {
      if (state?.teamSelections) {
        const activePlayerColor = playerColorRef.current;
        const nextTeamSelections = state.teamSelections;

        if (activePlayerColor) {
          const activeOpponentColor = activePlayerColor === "blue" ? "red" : "blue";
          const previousOpponent = prevTeamSelectionsRef.current?.[activeOpponentColor];
          const nextOpponent = nextTeamSelections[activeOpponentColor];

          if (nextOpponent?.hasDeployed && !previousOpponent?.hasDeployed) {
            addNotification(
              `${activeOpponentColor.toUpperCase()} BATTALION DEPLOYED`,
              activeOpponentColor,
            );
          }
        }

        prevTeamSelectionsRef.current = nextTeamSelections;
        setTeamSelections(state.teamSelections);
      }
      if (Array.isArray(state?.obstacles)) {
        setObstacles(state.obstacles);
      }
      if (Array.isArray(state?.units)) {
        setUnits(state.units.map(normalizeWorldUnit));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!selectionBox) {
      return;
    }

    function handlePointerMove(event) {
      const currentPoint = toMapPoint(event.clientX, event.clientY, camera);
      const nextSelectionBox = {
        startX: selectionBox.startX,
        startY: selectionBox.startY,
        currentX: currentPoint.x,
        currentY: currentPoint.y,
      };

      setSelectionBox(nextSelectionBox);
      setSelectedUnitIds(getUnitsInSelection(units, nextSelectionBox, playerColor));
    }

    function handlePointerUp(event) {
      const currentPoint = toMapPoint(event.clientX, event.clientY, camera);
      const completedSelection = {
        startX: selectionBox.startX,
        startY: selectionBox.startY,
        currentX: currentPoint.x,
        currentY: currentPoint.y,
      };

      setSelectedUnitIds(getUnitsInSelection(units, completedSelection, playerColor));
      setSelectionBox(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [camera, playerColor, selectionBox, units]);

  function handleJoinTeam(color) {
    socketRef.current?.emit("player:join", color);
    setPlayerColor(color);

    if (color === "blue") {
      setCamera({ x: 0, y: 0 });
    } else {
      setCamera(
        clampCamera(
          { x: MAP_WIDTH - windowSize.width, y: MAP_HEIGHT - windowSize.height },
          windowSize,
        ),
      );
    }

    addNotification(`DEPLOYMENT AUTHORIZED: ${color.toUpperCase()} OPS`, color);
  }

  function handleMapRightClick(event) {
    event.preventDefault();

    if (isAttackMoveMode) {
      setIsAttackMoveMode(false);
    }

    if (selectedUnitIds.length === 0) {
      return;
    }

    const clickPoint = toMapPoint(event.clientX, event.clientY, camera);
    const clickedEnemy = units.find(
      (unit) =>
        unit.owner !== playerColor &&
        unit.health > 0 &&
        Math.hypot(unit.x - clickPoint.x, unit.y - clickPoint.y) <= UNIT_CLICK_RADIUS,
    );

    if (clickedEnemy) {
      socketRef.current?.emit("unit:attack", {
        unitIds: selectedUnitIds,
        targetId: clickedEnemy.id,
        isQueued: event.shiftKey,
      });
      return;
    }

    socketRef.current?.emit("unit:move", {
      unitIds: selectedUnitIds,
      position: clickPoint,
      isQueued: event.shiftKey,
    });

    setOrderMarkers((current) => [
      ...current,
      {
        x: clickPoint.x,
        y: clickPoint.y,
        type: "move",
        id: Math.random(),
        timestamp: Date.now(),
      },
    ]);
  }

  function handleMapPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    const start = toMapPoint(event.clientX, event.clientY, camera);

    if (isAttackMoveMode) {
      socketRef.current?.emit("unit:attackMove", {
        unitIds: selectedUnitIds,
        position: start,
        isQueued: event.shiftKey,
      });
      setOrderMarkers((current) => [
        ...current,
        {
          x: start.x,
          y: start.y,
          type: "attackMove",
          id: Math.random(),
          timestamp: Date.now(),
        },
      ]);
      setIsAttackMoveMode(false);
      return;
    }

    if (event.ctrlKey) {
      const clickedUnit = units.find(
        (unit) =>
          unit.owner === playerColor &&
          Math.abs(unit.x - start.x) <= UNIT_SELECTION_RADIUS &&
          Math.abs(unit.y - start.y) <= UNIT_SELECTION_RADIUS,
      );

      if (clickedUnit) {
        setSelectedUnitIds(
          getVisibleUnitsOfVariant(units, clickedUnit, playerColor, camera, windowSize),
        );
        return;
      }
    }

    const nextSelection = {
      startX: start.x,
      startY: start.y,
      currentX: start.x,
      currentY: start.y,
    };

    setSelectionBox(nextSelection);
    setSelectedUnitIds(getUnitsInSelection(units, nextSelection, playerColor));
  }

  function handleMapDoubleClick(event) {
    const point = toMapPoint(event.clientX, event.clientY, camera);
    const clickedUnit = units.find(
      (unit) =>
        unit.owner === playerColor &&
        Math.abs(unit.x - point.x) <= UNIT_SELECTION_RADIUS &&
        Math.abs(unit.y - point.y) <= UNIT_SELECTION_RADIUS,
    );

    if (clickedUnit) {
      setSelectedUnitIds(
        getVisibleUnitsOfVariant(units, clickedUnit, playerColor, camera, windowSize),
      );
    }
  }

  function handleNavigateMinimap(point) {
    setCamera(
      clampCamera(
        { x: point.x - windowSize.width / 2, y: point.y - windowSize.height / 2 },
        windowSize,
      ),
    );
  }

  function handleIssueMinimapMove(point) {
    if (isAttackMoveMode) {
      setIsAttackMoveMode(false);
    }

    socketRef.current?.emit("unit:move", {
      unitIds: selectedUnitIds,
      position: point,
    });
  }

  function handleStop(event) {
    setIsAttackMoveMode(false);
    if (selectedUnitIds.length > 0) {
      socketRef.current?.emit("unit:stop", {
        unitIds: selectedUnitIds,
        isQueued: event.shiftKey,
      });
    }
  }

  function handleHoldPosition(event) {
    setIsAttackMoveMode(false);
    if (selectedUnitIds.length > 0) {
      socketRef.current?.emit("unit:holdPosition", {
        unitIds: selectedUnitIds,
        isQueued: event.shiftKey,
      });
    }
  }

  const selectionBounds = selectionBox ? normalizeSelection(selectionBox) : null;
  const selectedUnit =
    selectedUnitIds.length === 1 ? units.find((unit) => unit.id === selectedUnitIds[0]) : null;
  const selectedUnitDisplay = getUnitDisplay(selectedUnit);
  const allSelectedHoldingPosition =
    selectedUnitIds.length > 0 &&
    selectedUnitIds.every((id) => units.find((unit) => unit.id === id)?.isHoldingPosition);
  const opponentDisconnected =
    !!playerColor &&
    !!teamSelections[opponentColor]?.socketId &&
    !teamSelections[opponentColor]?.isOnline;

  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      <BattlefieldTopOverlay
        isConnected={isConnected}
        notifications={notifications}
        onReset={() => socketRef.current?.emit("player:reset")}
        opponentDisconnected={opponentDisconnected}
        playerColor={playerColor}
      />

      <BattlefieldWorld
        camera={camera}
        hoveredUnitId={hoveredUnitId}
        isAttackMoveMode={isAttackMoveMode}
        obstacles={obstacles}
        onDoubleClick={handleMapDoubleClick}
        onPointerDown={handleMapPointerDown}
        onRightClick={handleMapRightClick}
        orderMarkers={orderMarkers}
        playerColor={playerColor}
        selectedUnitIds={selectedUnitIds}
        selectionBounds={selectionBounds}
        units={units}
        visualEffects={visualEffects}
        visualProjectiles={visualProjectiles}
      />

      <ControlGroupsOverlay
        controlGroups={controlGroups}
        onCenterGroup={(groupUnits, viewport) =>
          setCamera(centerCameraOnUnits(groupUnits, viewport))
        }
        onSelectGroup={setSelectedUnitIds}
        playerColor={playerColor}
        selectedUnitIds={selectedUnitIds}
        units={units}
        windowSize={windowSize}
      />

      <BottomHud
        allSelectedHoldingPosition={allSelectedHoldingPosition}
        camera={camera}
        hoveredTooltip={hoveredTooltip}
        isAttackMoveMode={isAttackMoveMode}
        obstacles={obstacles}
        onActivateAttackMove={() => {
          if (selectedUnitIds.length > 0) {
            setIsAttackMoveMode(true);
          }
        }}
        onHoldPosition={handleHoldPosition}
        onHoverTooltipChange={setHoveredTooltip}
        onIssueMinimapMove={handleIssueMinimapMove}
        onNavigateMinimap={handleNavigateMinimap}
        onSelectSingleUnit={(unitId) => setSelectedUnitIds([unitId])}
        onStop={handleStop}
        playerColor={playerColor}
        selectedUnit={selectedUnit}
        selectedUnitDisplay={selectedUnitDisplay}
        selectedUnitIds={selectedUnitIds}
        units={units}
        windowSize={windowSize}
      />

      <BattlefieldStyles />

      {!playerColor && <ColorChooserModal onJoin={handleJoinTeam} teamSelections={teamSelections} />}

      {playerColor && !teamSelections[playerColor]?.hasDeployed && (
        <UnitSelectionModal
          playerColor={playerColor}
          onDeploy={(manifest) => {
            socketRef.current?.emit("player:deploy", manifest);
          }}
        />
      )}

      {opponentDisconnected && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl border border-rose-500/50 bg-rose-500/10 backdrop-blur-md text-rose-400 text-sm font-bold flex items-center gap-3 animate-bounce">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          OPPONENT COMMANDER DISCONNECTED
        </div>
      )}
    </main>
  );
}
