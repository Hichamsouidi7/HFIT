interface MacroBarProps {
  label: string;
  value: number;
  goal: number;
  unit?: string;
  color: "protein" | "fat" | "carbs" | "steps";
  /** The hero bar gets a heavier label, a taller track and a "done" state. */
  hero?: boolean;
}

const COLORS = {
  protein: "var(--color-protein)",
  fat: "var(--color-fat)",
  carbs: "var(--color-carbs)",
  steps: "var(--color-steps)",
} as const;

export function MacroBar({ label, value, goal, unit = "g", color, hero = false }: MacroBarProps) {
  const pct = goal > 0 ? Math.min(1, value / goal) : 0;
  const done = goal > 0 && value >= goal;
  const remaining = Math.max(0, goal - value);

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className={hero ? "text-[15px] font-semibold" : "text-[13px] font-medium text-ink-soft"}>
          {label}
          {/* Protein is the macro he has to HIT, not stay under, so its label
              says what is still missing rather than only drawing a ratio. */}
          {hero && !done && (
            <span className="tnum ml-2 font-normal text-muted">
              encore {Math.round(remaining)}
              {unit}
            </span>
          )}
          {hero && done && <span className="ml-2 font-semibold text-accent">bouclé ✓</span>}
        </span>
        <span className="tnum shrink-0 text-xs text-muted">
          {Math.round(value)} / {Math.round(goal)}
          {unit}
        </span>
      </div>

      <div className={`w-full overflow-hidden rounded-full bg-sunken ${hero ? "h-2.5" : "h-1.5"}`}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct * 100}%`,
            background: COLORS[color],
            transition: "width 450ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        />
      </div>
    </div>
  );
}
