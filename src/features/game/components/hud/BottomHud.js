import CommandPanel from "@/features/game/components/hud/CommandPanel";
import MinimapPanel from "@/features/game/components/hud/MinimapPanel";
import PanelDivider from "@/features/game/components/hud/PanelDivider";
import SelectionPanel from "@/features/game/components/hud/SelectionPanel";

export default function BottomHud(props) {
  const {
    allSelectedHoldingPosition,
    camera,
    obstacles,
    onActivateAttackMove,
    onHoldPosition,
    onHoverTooltipChange,
    onIssueMinimapMove,
    onNavigateMinimap,
    onSelectSingleUnit,
    onStop,
    hoveredTooltip,
    isAttackMoveMode,
    selectedUnit,
    selectedUnitDisplay,
    selectedUnitIds,
    units,
    windowSize,
  } = props;

  return (
    <div
      id="bottom-hud"
      className="absolute bottom-0 left-0 right-0 z-50 pointer-events-auto"
      style={{ height: 180 }}
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.stopPropagation()}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#080c14] via-[#0a1018]/98 to-[#0d1520]/90 border-t border-cyan-900/40" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      <div className="absolute top-[1px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent" />

      <div className="relative h-full flex">
        <MinimapPanel
          camera={camera}
          obstacles={obstacles}
          onIssueMove={onIssueMinimapMove}
          onNavigate={onNavigateMinimap}
          selectedUnitIds={selectedUnitIds}
          units={units}
          windowSize={windowSize}
        />

        <PanelDivider />

        <SelectionPanel
          hoveredTooltip={hoveredTooltip}
          onHoverTooltipChange={onHoverTooltipChange}
          onSelectSingleUnit={onSelectSingleUnit}
          selectedUnit={selectedUnit}
          selectedUnitDisplay={selectedUnitDisplay}
          selectedUnitIds={selectedUnitIds}
          units={units}
        />

        <PanelDivider />

        <CommandPanel
          allSelectedHoldingPosition={allSelectedHoldingPosition}
          isAttackMoveMode={isAttackMoveMode}
          onActivateAttackMove={onActivateAttackMove}
          onHoldPosition={onHoldPosition}
          onStop={onStop}
          selectedUnitIds={selectedUnitIds}
        />
      </div>
    </div>
  );
}
