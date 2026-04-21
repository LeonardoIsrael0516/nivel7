export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span>Etapa {current} de {total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-[2px] w-full bg-border/40 overflow-hidden rounded-full">
        <div
          className="h-full bg-gradient-blood transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
