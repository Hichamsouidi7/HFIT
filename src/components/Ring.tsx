interface RingProps {
  /** 0..1 (values above 1 are clamped, the caller decides what "over" means). */
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}

/** Bare progress ring. Everything that shows a proportion uses this one. */
export function Ring({
  progress,
  size = 56,
  stroke = 6,
  color = "var(--color-accent)",
  track = "var(--color-line)",
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, progress));

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: "stroke-dashoffset 550ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}

/**
 * The calorie ring on the home screen.
 *
 * Shows what is LEFT, not what has been eaten - that is the number he acts on
 * when deciding what to have for dinner. Going over flips it to red.
 */
export function CalorieRing({
  value,
  goal,
  size = 188,
}: {
  value: number;
  goal: number;
  size?: number;
}) {
  const remaining = goal - value;
  const over = remaining < 0;

  return (
    <Ring
      progress={goal > 0 ? value / goal : 0}
      size={size}
      stroke={13}
      color={over ? "var(--color-danger)" : "var(--color-accent)"}
    >
      <span
        className={`tnum display text-[2.75rem] ${over ? "text-danger" : "text-ink"}`}
      >
        {Math.abs(Math.round(remaining))}
      </span>
      <span className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted">
        {over ? "kcal en trop" : "kcal restantes"}
      </span>
      <span className="tnum mt-1.5 text-[11px] text-faint">
        {Math.round(value)} / {Math.round(goal)}
      </span>
    </Ring>
  );
}
