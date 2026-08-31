/**
 * src/components/MilestoneList.tsx
 *
 * Groups nodes by category and shows per-category completion progress.
 * Each category displays a progress bar and its node labels with status dots.
 */

import type { SkillNode } from "../api/types";

interface MilestoneListProps {
  nodes: SkillNode[];
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-500",
  "in-progress": "bg-amber-500",
  missing: "bg-rose-500",
};

export function MilestoneList({ nodes }: MilestoneListProps) {
  // Group nodes by category
  const categories = new Map<string, SkillNode[]>();
  for (const n of nodes) {
    const list = categories.get(n.category) || [];
    list.push(n);
    categories.set(n.category, list);
  }

  // Sort categories: least complete first (most work remaining at top)
  const sorted = [...categories.entries()].sort((a, b) => {
    const pctA = a[1].filter((n) => n.status === "completed").length / a[1].length;
    const pctB = b[1].filter((n) => n.status === "completed").length / b[1].length;
    return pctA - pctB;
  });

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Milestones by Category
      </h3>

      <div className="space-y-3">
        {sorted.map(([category, catNodes]) => {
          const done = catNodes.filter((n) => n.status === "completed").length;
          const total = catNodes.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <div
              key={category}
              className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4 space-y-3"
            >
              {/* Category header row */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{category}</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {done}/{total} complete
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${pct}%`,
                    background:
                      pct === 100
                        ? "#22c55e"
                        : pct >= 50
                        ? "#eab308"
                        : pct > 0
                        ? "#f97316"
                        : "#334155",
                  }}
                />
              </div>

              {/* Node labels with status dots */}
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {catNodes.map((n) => (
                  <div key={n.id} className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        STATUS_DOT[n.status] || STATUS_DOT.missing
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium ${
                        n.status === "completed"
                          ? "text-slate-400"
                          : "text-slate-300"
                      }`}
                    >
                      {n.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
