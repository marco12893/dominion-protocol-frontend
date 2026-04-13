export default function PanelDivider() {
  return (
    <div className="flex-shrink-0 w-px relative my-2">
      <div className="absolute inset-0 bg-slate-600/50" />
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/30 via-cyan-400/10 to-cyan-500/30" />
      <div className="absolute -left-px inset-y-0 w-[3px] bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
      <div className="absolute left-px inset-y-0 w-[3px] bg-gradient-to-b from-transparent via-cyan-500/15 to-transparent" />
    </div>
  );
}

