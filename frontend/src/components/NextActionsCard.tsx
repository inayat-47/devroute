/**
 * src/components/NextActionsCard.tsx
 *
 * Computes the top 3 most immediately actionable missing nodes—sorted by
 * ascending unmet-prerequisite count—and renders them as small cards.
 * Clicking a card switches back to the Graph tab with that node pre-selected.
 */

import type { SkillNode, Edge } from "../api/types";

interface NextActionsCardProps {
  nodes: SkillNode[];
  edges: Edge[];
  onSelectNode: (nodeId: string) => void;
}

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  intermediate: "text-violet-400 bg-violet-500/15 border-violet-500/30",
  advanced: "text-orange-400 bg-orange-500/15 border-orange-500/30",
};

export function NextActionsCard({
  nodes,
  edges,
  onSelectNode,
}: NextActionsCardProps) {
  // Build a set of completed node IDs for prerequisite checking
  const completedIds = new Set(
    nodes.filter((n) => n.status === "completed").map((n) => n.id)
  );

  // For each missing node, count how many of its prerequisites are NOT completed
  const missingNodes = nodes.filter((n) => n.status === "missing");

  const scored = missingNodes.map((n) => {
    // Get prerequisite IDs from edges where this node is the target
    const prereqIds = edges
      .filter((e) => e.target === n.id)
      .map((e) => e.source);

    const unmetCount = prereqIds.filter((pid) => !completedIds.has(pid)).length;

    return { node: n, unmetCount };
  });

  // Sort ascending by unmet prerequisite count (most actionable first)
  scored.sort((a, b) => a.unmetCount - b.unmetCount);

  const top3 = scored.slice(0, 3);

  if (top3.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Next Recommended Actions
        </h3>
        <div className="p-6 rounded-xl bg-slate-900/70 border border-slate-800/80 text-center">
          <div className="text-2xl mb-2">🎉</div>
          <p className="text-sm font-semibold text-emerald-400">
            All skills mastered!
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Nothing left to learn for this role.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Next 3 Recommended Actions
      </h3>

      <div className="space-y-2">
        {top3.map(({ node, unmetCount }, i) => {
          const firstResource = node.resources?.[0];
          const diffStyle =
            DIFFICULTY_STYLE[node.difficulty] || DIFFICULTY_STYLE.intermediate;

          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id)}
              className="w-full text-left p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-brand-500/40 hover:bg-slate-800/50 transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-3">
                {/* Priority number */}
                <div className="h-7 w-7 rounded-lg bg-brand-500/15 text-brand-400 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Skill name */}
                  <div className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors leading-tight">
                    {node.label}
                  </div>

                  {/* Tags row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${diffStyle}`}
                    >
                      {node.difficulty}
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50 uppercase tracking-wider">
                      {node.category}
                    </span>
                    {unmetCount === 0 ? (
                      <span className="text-[9px] font-bold text-emerald-400">
                        ✓ Ready to start
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">
                        {unmetCount} prerequisite{unmetCount > 1 ? "s" : ""} remaining
                      </span>
                    )}
                  </div>

                  {/* First resource link */}
                  {firstResource && (
                    <a
                      href={firstResource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[10px] text-brand-400 hover:text-brand-300 font-semibold transition-colors"
                    >
                      📘 {firstResource.title}
                      <span className="text-slate-600">↗</span>
                    </a>
                  )}
                </div>

                {/* Arrow hint */}
                <span className="text-slate-600 group-hover:text-brand-400 transition-colors text-sm mt-1 shrink-0">
                  →
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-600 text-center">
        Click any card to view it on the graph
      </p>
    </div>
  );
}
