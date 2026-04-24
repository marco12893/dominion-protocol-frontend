"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import BattlefieldStyles from "@/features/game/components/BattlefieldStyles";
import BattlefieldTopOverlay from "@/features/game/components/BattlefieldTopOverlay";
import BattlefieldWorld from "@/features/game/components/BattlefieldWorld";
import HexGridWorld from "@/features/game/components/HexGridWorld";
import ControlGroupsOverlay from "@/features/game/components/ControlGroupsOverlay";
import BottomHud from "@/features/game/components/hud/BottomHud";
import ColorChooserModal from "@/features/game/components/modals/ColorChooserModal";
import {
  INITIAL_LAYER3_BATTLE,
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
  applyWorldDelta,
  centerCameraOnUnits,
  clampCamera,
  getUnitDisplay,
  getUnitsInSelection,
  getVisibleUnitsOfVariant,
  normalizeSelection,
  normalizeLayer3BattleState,
  normalizeWorldUnit,
  toMapPoint,
} from "@/features/game/utils/gameHelpers";

const POST_BATTLE_RETURN_DELAY_MS = 3000;

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
  const unitsByIdRef = useRef(new Map());
  const activeBattleIdRef = useRef(null);
  const centeredBattleIdRef = useRef(null);
  const postBattleReturnTimeoutRef = useRef(null);
  const worldTickRef = useRef(0);

  // High-frequency refs for rendering loop
  const unitsRef = useRef(INITIAL_UNITS);
  const visualProjectilesRef = useRef([]);
  const visualEffectsRef = useRef([]);
  const cameraRef = useRef({ x: 0, y: 0 });
  const selectedUnitIdsRef = useRef([]);

  // Throttled UI state (updated at lower frequency)
  const [uiTick, setUiTick] = useState(0);

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
  const [layer3Battle, setLayer3Battle] = useState(INITIAL_LAYER3_BATTLE);
  const [units, setUnits] = useState(INITIAL_UNITS);
  const [visualEffects, setVisualEffects] = useState([]);
  const [visualProjectiles, setVisualProjectiles] = useState([]);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeLayer, setActiveLayer] = useState(2);
  const [worldTick, setWorldTick] = useState(0);
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(0);
  const [postBattleReturnDeadline, setPostBattleReturnDeadline] = useState(null);
  const [preparationDeadline, setPreparationDeadline] = useState(null);

  const unitsById = new Map(units.map((unit) => [unit.id, unit]));

  const opponentColor = playerColor === "blue" ? "red" : "blue";

  const clearPostBattleReturnTimeout = useCallback(() => {
    if (postBattleReturnTimeoutRef.current !== null) {
      window.clearTimeout(postBattleReturnTimeoutRef.current);
      postBattleReturnTimeoutRef.current = null;
    }
  }, []);

  const handleReturnToMap = useCallback(() => {
    clearPostBattleReturnTimeout();
    setPostBattleReturnDeadline(null);
    setActiveLayer(2);
  }, [clearPostBattleReturnTimeout]);

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

  // Sync refs with state
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  useEffect(() => {
    selectedUnitIdsRef.current = selectedUnitIds;
  }, [selectedUnitIds]);

  useEffect(() => {
    unitsRef.current = units;
  }, [units]);

  useEffect(() => {
    visualProjectilesRef.current = visualProjectiles;
  }, [visualProjectiles]);

  useEffect(() => {
    visualEffectsRef.current = visualEffects;
  }, [visualEffects]);

  // Throttled UI state update (10fps for HUD/Overlays)
  useEffect(() => {
    const interval = window.setInterval(() => {
      setUiTick((tick) => tick + 1);
    }, 100);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    unitsByIdRef.current = new Map(units.map((unit) => [unit.id, unit]));
  }, [units]);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  const addNotification = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).slice(2, 11);

    setNotifications((current) =>
      [{ id, message, type, timestamp: Date.now() }, ...current].slice(0, 5),
    );

    window.setTimeout(() => {
      setNotifications((current) => current.filter((entry) => entry.id !== id));
    }, 5000);
  }, []);

  const handleLayer3BattleUpdate = useCallback((nextLayer3Battle, nextUnits = unitsRef.current) => {
    const previousBattleId = activeBattleIdRef.current;
    const nextBattleId = nextLayer3Battle?.battleId ?? null;

    if (previousBattleId !== nextBattleId) {
      setSelectedUnitIds([]);
      selectedUnitIdsRef.current = [];
      setControlGroups({});
      setOrderMarkers([]);
      setIsAttackMoveMode(false);
      setHoveredUnitId(null);
      setSelectionBox(null);
      setVisualProjectiles([]);
      visualProjectilesRef.current = [];
      setVisualEffects([]);
      visualEffectsRef.current = [];

      if (nextBattleId) {
        clearPostBattleReturnTimeout();
        setPostBattleReturnDeadline(null);
        if (
          nextLayer3Battle?.status === "countdown" &&
          nextLayer3Battle.countdownEndsAtTick !== null
        ) {
          const countdownTicksRemaining = Math.max(
            0,
            nextLayer3Battle.countdownEndsAtTick - worldTickRef.current,
          );
          setPreparationDeadline(
            Date.now() + countdownTicksRemaining * (1000 / 60),
          );
        } else {
          setPreparationDeadline(null);
        }
        const battleHexLabel = nextLayer3Battle?.hex
          ? `HEX ${nextLayer3Battle.hex.col},${nextLayer3Battle.hex.row}`
          : "CONTESTED HEX";
        addNotification(`LAYER 3 ENGAGEMENT | ${battleHexLabel}`, "info");
        setActiveLayer(3);
        centeredBattleIdRef.current = null;
      } else if (previousBattleId) {
        addNotification("LAYER 3 ENGAGEMENT RESOLVED", "info");
        centeredBattleIdRef.current = null;
        setPreparationDeadline(null);
        clearPostBattleReturnTimeout();
        const nextDeadline = Date.now() + POST_BATTLE_RETURN_DELAY_MS;
        setPostBattleReturnDeadline(nextDeadline);
        postBattleReturnTimeoutRef.current = window.setTimeout(() => {
          postBattleReturnTimeoutRef.current = null;
          setPostBattleReturnDeadline(null);
          setActiveLayer(2);
        }, POST_BATTLE_RETURN_DELAY_MS);
      }

      activeBattleIdRef.current = nextBattleId;
    } else if (
      nextBattleId &&
      nextLayer3Battle?.status === "active" &&
      preparationDeadline !== null
    ) {
      setPreparationDeadline(null);
    }

    if (
      !nextBattleId ||
      centeredBattleIdRef.current === nextBattleId ||
      !playerColorRef.current
    ) {
      return;
    }

    const viewport = latestStateRef.current.windowSize;
    if (!viewport?.width || !viewport?.height || !Array.isArray(nextUnits) || nextUnits.length === 0) {
      return;
    }

    const ownUnits = nextUnits.filter(
      (unit) => unit.owner === playerColorRef.current && unit.health > 0,
    );
    const focusUnits = ownUnits.length > 0 ? ownUnits : nextUnits;
    setCamera(centerCameraOnUnits(focusUnits, viewport));
    centeredBattleIdRef.current = nextBattleId;
  }, [addNotification, clearPostBattleReturnTimeout, preparationDeadline]);

  useEffect(() => () => {
    clearPostBattleReturnTimeout();
  }, [clearPostBattleReturnTimeout]);

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
    function onFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        addNotification(`Error enabling fullscreen: ${err.message}`, "red");
      });
    } else {
      document.exitFullscreen();
    }
  }, [addNotification]);

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

      if (key === "f") {
        toggleFullscreen();
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
  }, [toggleFullscreen]);

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
      const current = visualEffectsRef.current;
      const now = Date.now();
      const next = current.filter(
        (effect) => now - effect.timestamp < (effect.duration ?? 250),
      );
      if (next.length !== current.length) {
        visualEffectsRef.current = next;
        setVisualEffects(next);
      }
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
        const current = visualProjectilesRef.current;
        if (current.length > 0) {
          const next = [];

          for (const projectile of current) {
            const hasFixedTarget =
              typeof projectile.targetX === "number" &&
              typeof projectile.targetY === "number";
            const target = hasFixedTarget
              ? null
              : unitsByIdRef.current.get(projectile.targetId) ?? null;
            const targetX = hasFixedTarget
              ? projectile.targetX
              : target
                ? target.x
                : (projectile.lastTargetPos?.x ?? projectile.currentX);
            const targetY = hasFixedTarget
              ? projectile.targetY
              : target
                ? target.y
                : (projectile.lastTargetPos?.y ?? projectile.currentY);
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

          visualProjectilesRef.current = next;
          setVisualProjectiles(next);
        }
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
      clearPostBattleReturnTimeout();
      setPreparationDeadline(null);
      setPlayerColor(null);
      setSelectedUnitIds([]);
      selectedUnitIdsRef.current = [];
      setControlGroups({});
      setUnits(INITIAL_UNITS);
      unitsRef.current = INITIAL_UNITS;
      setObstacles(INITIAL_OBSTACLES);
      setTeamSelections(INITIAL_TEAM_SELECTIONS);
      setLayer3Battle(INITIAL_LAYER3_BATTLE);
      setNotifications([]);
      setHoveredTooltip(null);
      setHoveredUnitId(null);
      setOrderMarkers([]);
      setSelectionBox(null);
      setVisualProjectiles([]);
      visualProjectilesRef.current = [];
      setVisualEffects([]);
      visualEffectsRef.current = [];
      activeBattleIdRef.current = null;
      centeredBattleIdRef.current = null;
      worldTickRef.current = 0;
      setPostBattleReturnDeadline(null);
      setActiveLayer(2);
      setWorldTick(0);
    });
    socket.on("unit:attack", (data) => {
      if (data.variantId === "lightTank" || data.variantId === "heavyTank") {
        const newEffect = {
          id: `${data.id}-flash`,
          type: "flash",
          shooterId: data.unitId,
          timestamp: Date.now(),
        };
        visualEffectsRef.current = [...visualEffectsRef.current, newEffect];
        setVisualEffects((current) => [...current, newEffect]);
      } else if (data.variantId === "bomber" && data.targetPos) {
        const newEffect = {
          id: `${data.id}-explosion`,
          type: "explosion",
          x: data.targetPos.x,
          y: data.targetPos.y,
          radius: data.splashRadius ?? 95,
          timestamp: Date.now(),
          duration: 450,
        };
        visualEffectsRef.current = [...visualEffectsRef.current, newEffect];
        setVisualEffects((current) => [...current, newEffect]);
      }
    });
    socket.on("unit:shootProjectile", (projectile) => {
      const newProjectile = {
        ...projectile,
        currentX: projectile.startX,
        currentY: projectile.startY,
      };
      visualProjectilesRef.current = [...visualProjectilesRef.current, newProjectile];
      setVisualProjectiles((current) => [...current, newProjectile]);
    });
    function applyTeamSelections(nextTeamSelections) {
      if (!nextTeamSelections) {
        return;
      }
      setTeamSelections(nextTeamSelections);
    }

    socket.on("world:snapshot", (snapshot) => {
      applyTeamSelections(snapshot?.teamSelections);
      const nextLayer3Battle = normalizeLayer3BattleState(snapshot?.layer3Battle);
      setLayer3Battle(nextLayer3Battle);
      if (typeof snapshot?.tick === "number") {
        worldTickRef.current = snapshot.tick;
        setWorldTick(snapshot.tick);
      }

      if (Array.isArray(snapshot?.obstacles)) {
        setObstacles(snapshot.obstacles);
      }
      if (Array.isArray(snapshot?.units)) {
        const timestamp = Date.now();
        setLastUpdateTimestamp(timestamp);
        const normalizedUnits = snapshot.units.map((unit) => ({
          ...normalizeWorldUnit(unit),
          _timestamp: timestamp,
        }));
        setUnits(normalizedUnits);
        unitsRef.current = normalizedUnits;
        handleLayer3BattleUpdate(nextLayer3Battle, normalizedUnits);
      } else {
        handleLayer3BattleUpdate(nextLayer3Battle, []);
      }
    });

    socket.on("world:delta", (delta) => {
      applyTeamSelections(delta?.teamSelections);
      const nextLayer3Battle = delta?.layer3Battle
        ? normalizeLayer3BattleState(delta.layer3Battle)
        : null;
      if (delta?.layer3Battle) {
        setLayer3Battle(nextLayer3Battle);
      }
      if (typeof delta?.tick === "number") {
        worldTickRef.current = delta.tick;
        setWorldTick(delta.tick);
      }

      if (Array.isArray(delta?.obstacles)) {
        setObstacles(delta.obstacles);
      }
      if (Array.isArray(delta?.units) || Array.isArray(delta?.removedUnitIds)) {
        const timestamp = Date.now();
        setLastUpdateTimestamp(timestamp);
        setUnits((currentUnits) => {
          const nextUnits = applyWorldDelta(currentUnits, delta);
          // Attach timestamp to updated units
          const updatedUnits = nextUnits.map((unit) => {
            const wasUpdated = delta.units?.some((u) => u.id === unit.id);
            return wasUpdated ? { ...unit, _timestamp: timestamp } : unit;
          });
          unitsRef.current = updatedUnits;
          if (nextLayer3Battle) {
            handleLayer3BattleUpdate(nextLayer3Battle, updatedUnits);
          }
          return updatedUnits;
        });
      } else if (nextLayer3Battle) {
        handleLayer3BattleUpdate(nextLayer3Battle, unitsRef.current);
      }
    });

    return () => {
      clearPostBattleReturnTimeout();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [clearPostBattleReturnTimeout, handleLayer3BattleUpdate]);

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

    if (layer3Battle.status !== "active") {
      return;
    }

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

      setOrderMarkers((current) => [
        ...current,
        {
          x: clickedEnemy.x,
          y: clickedEnemy.y,
          type: "attack",
          targetId: clickedEnemy.id,
          id: Math.random(),
          timestamp: Date.now(),
        },
      ]);
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
    if (layer3Battle.status !== "active") {
      return;
    }

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
    if (layer3Battle.status !== "active") {
      return;
    }

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
    if (layer3Battle.status !== "active") {
      return;
    }

    if (isAttackMoveMode) {
      setIsAttackMoveMode(false);
    }

    socketRef.current?.emit("unit:move", {
      unitIds: selectedUnitIds,
      position: point,
    });
  }

  function handleStop(event) {
    if (layer3Battle.status !== "active") {
      return;
    }

    setIsAttackMoveMode(false);
    if (selectedUnitIds.length > 0) {
      socketRef.current?.emit("unit:stop", {
        unitIds: selectedUnitIds,
        isQueued: event.shiftKey,
      });
    }
  }

  function handleHoldPosition(event) {
    if (layer3Battle.status !== "active") {
      return;
    }

    setIsAttackMoveMode(false);
    if (selectedUnitIds.length > 0) {
      socketRef.current?.emit("unit:holdPosition", {
        unitIds: selectedUnitIds,
        isQueued: event.shiftKey,
      });
    }
  }

  const selectionBounds = selectionBox ? normalizeSelection(selectionBox) : null;
  const selectedUnit = selectedUnitIds.length === 1 ? unitsById.get(selectedUnitIds[0]) : null;
  const selectedUnitDisplay = getUnitDisplay(selectedUnit);
  const allSelectedHoldingPosition =
    selectedUnitIds.length > 0 &&
    selectedUnitIds.every((id) => unitsById.get(id)?.isHoldingPosition);
  const opponentDisconnected =
    !!playerColor &&
    !!teamSelections[opponentColor]?.socketId &&
    !teamSelections[opponentColor]?.isOnline;
  const remainingPreparationSeconds =
    layer3Battle.status === "countdown" && preparationDeadline !== null
      ? Math.max(0, Math.ceil((preparationDeadline - Date.now()) / 1000))
      : 0;
  const remainingBattleSeconds =
    layer3Battle.status === "active" && layer3Battle.endsAtTick !== null
      ? Math.max(0, Math.ceil((layer3Battle.endsAtTick - worldTick) / 60))
      : 0;
  const postBattleReturnSeconds = postBattleReturnDeadline
    ? Math.max(0, Math.ceil((postBattleReturnDeadline - Date.now()) / 1000))
    : 0;
  const battleClockLabel =
    layer3Battle.status === "active"
      ? `${String(Math.floor(remainingBattleSeconds / 60)).padStart(2, "0")}:${String(
        remainingBattleSeconds % 60,
      ).padStart(2, "0")}`
      : layer3Battle.status === "countdown"
        ? `${String(remainingPreparationSeconds).padStart(2, "0")}s`
      : "--:--";

  return (
    <main className="fixed inset-0 overflow-hidden bg-slate-950 font-sans text-slate-100 select-none">
      <BattlefieldTopOverlay
        isConnected={isConnected}
        notifications={notifications}
        onReset={() => socketRef.current?.emit("player:reset")}
        opponentDisconnected={opponentDisconnected}
        playerColor={playerColor}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        activeLayer={activeLayer}
        layer3Battle={layer3Battle}
        battleClockLabel={battleClockLabel}
      />

      {activeLayer === 3 ? (
        <>
          <BattlefieldWorld
            camera={camera}
            cameraRef={cameraRef}
            hoveredUnitId={hoveredUnitId}
            isAttackMoveMode={isAttackMoveMode}
            obstacles={obstacles}
            onDoubleClick={handleMapDoubleClick}
            onPointerDown={handleMapPointerDown}
            onRightClick={handleMapRightClick}
            orderMarkers={orderMarkers}
            playerColor={playerColor}
            selectedUnitIds={selectedUnitIds}
            selectedUnitIdsRef={selectedUnitIdsRef}
            selectionBounds={selectionBounds}
            units={units}
            unitsRef={unitsRef}
            lastUpdateTimestamp={lastUpdateTimestamp}
            visualEffects={visualEffects}
            visualEffectsRef={visualEffectsRef}
            visualProjectiles={visualProjectiles}
            visualProjectilesRef={visualProjectilesRef}
            windowSize={windowSize}
          />

          {layer3Battle.status === "active" && (
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
          )}

          {layer3Battle.status === "active" && (
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
              selectedUnit={selectedUnit}
              selectedUnitDisplay={selectedUnitDisplay}
              selectedUnitIds={selectedUnitIds}
              units={units}
              windowSize={windowSize}
            />
          )}

          {!playerColor && <ColorChooserModal onJoin={handleJoinTeam} teamSelections={teamSelections} />}

          {opponentDisconnected && (
            <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-xl border border-rose-500/50 bg-rose-500/10 backdrop-blur-md text-rose-400 text-sm font-bold flex items-center gap-3 animate-bounce">
              <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              OPPONENT COMMANDER DISCONNECTED
            </div>
          )}

          {postBattleReturnDeadline && (
            <div className="fixed right-4 top-24 z-[96] rounded-full border border-cyan-300/20 bg-[#09111acc]/92 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100 shadow-[0_16px_36px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              Auto-return in {postBattleReturnSeconds}s
            </div>
          )}

          {layer3Battle.status === "countdown" ? (
            <div className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-none">
              <div className="mx-6 max-w-xl rounded-[28px] border border-white/10 bg-[#09111acc]/92 px-8 py-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <div className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300/70">
                  Engagement Countdown
                </div>
                <div className="mt-4 text-6xl font-black text-white">
                  {remainingPreparationSeconds}
                </div>
                <div className="mt-3 text-sm text-slate-300/80">
                  Troops are deployed in opposite corners and will hold position until the
                  countdown ends. Layer 3 command input unlocks when the engagement begins.
                </div>
              </div>
            </div>
          ) : postBattleReturnDeadline ? (
            <div className="fixed inset-0 z-[95] flex items-center justify-center">
              <div className="mx-6 w-full max-w-xl rounded-[28px] border border-cyan-300/15 bg-[#09111acc]/94 px-8 py-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <div className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300/70">
                  Engagement Complete
                </div>
                <div className="mt-3 text-2xl font-black text-white">
                  Return to the strategic map
                </div>
                <div className="mt-3 text-sm text-slate-300/80">
                  Surviving units have been written back to Layer 2. You can return now, or
                  the map will open automatically in a few seconds.
                </div>
                <button
                  type="button"
                  onClick={handleReturnToMap}
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-6 py-3 text-xs font-black uppercase tracking-[0.28em] text-slate-950 shadow-[0_18px_36px_rgba(34,211,238,0.2)] transition-transform hover:-translate-y-0.5 hover:bg-cyan-200"
                >
                  Return to Map
                </button>
              </div>
            </div>
          ) : layer3Battle.status === "idle" ? (
            <div className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-none">
              <div className="mx-6 max-w-xl rounded-[28px] border border-white/10 bg-[#09111acc]/92 px-8 py-7 text-center shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                <div className="text-[10px] font-black uppercase tracking-[0.34em] text-cyan-300/70">
                  Layer 3 Standby
                </div>
                <div className="mt-3 text-2xl font-black text-white">
                  No active hex engagement
                </div>
                <div className="mt-3 text-sm text-slate-300/80">
                  Move a blue army and a red army into the same hex on Layer 2 to start a
                  three-minute battle here. Surviving units will be written back to the
                  strategic map when the fight ends.
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <HexGridWorld
            windowSize={windowSize}
            playerColor={playerColor}
            socketRef={socketRef}
            isSocketReady={isConnected}
          />
          {!playerColor && <ColorChooserModal onJoin={handleJoinTeam} teamSelections={teamSelections} />}
        </>
      )}

      <BattlefieldStyles />
    </main>
  );
}
