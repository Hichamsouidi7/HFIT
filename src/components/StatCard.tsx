import Link from "next/link";
import { Ring } from "@/components/Ring";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  progress?: number;
  ringColor?: string;
  href?: string;
  children?: React.ReactNode;
}

/**
 * Small white tile from the reference grid: label on top, big number, and
 * either a ring or a custom graphic on the right.
 */
export function StatCard({
  label,
  value,
  unit,
  sub,
  progress,
  ringColor,
  href,
  children,
}: StatCardProps) {
  const body = (
    <div className="card flex h-full flex-col justify-between p-4">
      <span className="text-[12px] font-medium text-muted">{label}</span>

      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="tnum display text-[1.7rem]">{value}</span>
            {unit && <span className="text-xs font-medium text-muted">{unit}</span>}
          </div>
          {sub && <p className="mt-0.5 truncate text-[11px] text-faint">{sub}</p>}
        </div>

        {children ??
          (progress !== undefined && (
            <Ring progress={progress} size={40} stroke={5} color={ringColor} />
          ))}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block transition active:scale-[0.98]">
      {body}
    </Link>
  ) : (
    body
  );
}

/**
 * Tiny bar chart of the last N days of steps, as in the reference.
 * Today's bar is the dark one so the comparison is immediate.
 */
export function StepsSparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-9 items-end gap-[3px]">
      {values.map((v, i) => {
        const isToday = i === values.length - 1;
        return (
          <span
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${Math.max(8, (v / max) * 100)}%`,
              background: isToday ? "var(--color-ink)" : "var(--color-line)",
            }}
          />
        );
      })}
    </div>
  );
}
