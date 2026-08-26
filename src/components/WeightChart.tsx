interface Point {
  day: string;
  weightKg: number;
  trendKg: number;
}

/**
 * Weight over time: raw weigh-ins as faint dots, the smoothed trend as the solid
 * line. The trend is the thing being read - the dots are only there to show how
 * much noise it is filtering out, which is the whole argument for using it.
 */
export function WeightChart({
  points,
  targetKg,
  height = 190,
}: {
  points: Point[];
  targetKg: number;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <div className="card flex items-center justify-center p-8 text-center">
        <p className="text-[13px] text-muted">
          Deux pesées minimum pour tracer la courbe.
          <br />
          Reviens demain matin.
        </p>
      </div>
    );
  }

  const W = 320;
  const H = height;
  const PAD = { top: 14, right: 10, bottom: 20, left: 30 };

  const weights = points.flatMap((p) => [p.weightKg, p.trendKg]);
  const min = Math.min(...weights, targetKg) - 0.4;
  const max = Math.max(...weights) + 0.4;
  const span = Math.max(0.8, max - min);

  const x = (i: number) =>
    PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (kg: number) =>
    PAD.top + (1 - (kg - min) / span) * (H - PAD.top - PAD.bottom);

  const trendPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.trendKg)}`).join(" ");
  const areaPath = `${trendPath} L${x(points.length - 1)},${H - PAD.bottom} L${x(0)},${H - PAD.bottom} Z`;

  const targetVisible = targetKg >= min && targetKg <= max;
  const ticks = [max - 0.4, (max + min) / 2, min + 0.4];

  return (
    <div className="card p-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe de poids">
        {ticks.map((kg) => (
          <g key={kg}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(kg)}
              y2={y(kg)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 5}
              y={y(kg) + 3}
              textAnchor="end"
              className="tnum"
              fontSize="8"
              fill="var(--color-faint)"
            >
              {kg.toFixed(1)}
            </text>
          </g>
        ))}

        {targetVisible && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(targetKg)}
            y2={y(targetKg)}
            stroke="var(--color-accent)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.6"
          />
        )}

        <path d={areaPath} fill="var(--color-accent)" opacity="0.07" />

        {points.map((p, i) => (
          <circle key={p.day} cx={x(i)} cy={y(p.weightKg)} r="2.2" fill="var(--color-faint)" />
        ))}

        <path
          d={trendPath}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx={x(points.length - 1)}
          cy={y(points[points.length - 1].trendKg)}
          r="4"
          fill="var(--color-accent)"
          stroke="var(--color-card)"
          strokeWidth="2"
        />
      </svg>

      <div className="mt-1 flex items-center justify-center gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-accent" /> tendance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-faint" /> pesées
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-accent" /> objectif
        </span>
      </div>
    </div>
  );
}
