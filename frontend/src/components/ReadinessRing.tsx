/**
 * src/components/ReadinessRing.tsx
 *
 * Large circular SVG progress ring showing readinessPercent.
 * Projector-safe contrast with a bold percentage number in the center.
 */

interface ReadinessRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
}

export function ReadinessRing({
  percent,
  size = 220,
  strokeWidth = 14,
}: ReadinessRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percent / 100) * circumference;
  const gap = circumference - filled;

  // Color gradient based on readiness level
  const ringColor =
    percent >= 75
      ? "#22c55e"   // emerald
      : percent >= 40
      ? "#eab308"   // amber
      : "#ef4444";  // rose

  const glowColor =
    percent >= 75
      ? "rgba(34,197,94,0.25)"
      : percent >= 40
      ? "rgba(234,179,8,0.2)"
      : "rgba(239,68,68,0.2)";

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Glow backdrop */}
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: size * 0.8,
          height: size * 0.8,
          background: glowColor,
        }}
      />

      <svg
        width={size}
        height={size}
        className="relative -rotate-90"
        style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${gap}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-black tracking-tight"
          style={{ fontSize: size * 0.22, color: ringColor }}
        >
          {percent}%
        </span>
        <span className="text-slate-500 font-semibold text-xs uppercase tracking-widest mt-0.5">
          Ready
        </span>
      </div>
    </div>
  );
}
