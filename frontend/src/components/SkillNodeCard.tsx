/**
 * src/components/SkillNodeCard.tsx
 *
 * Custom React Flow node component for rendering individual skill nodes
 * in the dependency graph. Displays skill label, category tag, difficulty
 * badge, and uses strong status-based coloring for projector-safe contrast.
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export interface SkillNodeData {
  label: string;
  category: string;
  status: "completed" | "in-progress" | "missing";
  difficulty: "beginner" | "intermediate" | "advanced";
  whyItMatters?: string;
  selected?: boolean;
  [key: string]: unknown;
}

const STATUS_STYLES: Record<
  string,
  { border: string; bg: string; glow: string; badge: string; badgeText: string; icon: string }
> = {
  completed: {
    border: "border-emerald-500",
    bg: "bg-emerald-950/60",
    glow: "shadow-emerald-500/20",
    badge: "bg-emerald-500/20",
    badgeText: "text-emerald-300",
    icon: "✓",
  },
  "in-progress": {
    border: "border-amber-500",
    bg: "bg-amber-950/50",
    glow: "shadow-amber-500/15",
    badge: "bg-amber-500/20",
    badgeText: "text-amber-300",
    icon: "◔",
  },
  missing: {
    border: "border-rose-500",
    bg: "bg-rose-950/40",
    glow: "shadow-rose-500/15",
    badge: "bg-rose-500/20",
    badgeText: "text-rose-300",
    icon: "○",
  },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "text-sky-400 bg-sky-500/15 border-sky-500/30",
  intermediate: "text-violet-400 bg-violet-500/15 border-violet-500/30",
  advanced: "text-orange-400 bg-orange-500/15 border-orange-500/30",
};

function SkillNodeCardInner({ data }: NodeProps) {
  const nodeData = data as SkillNodeData;
  const style = STATUS_STYLES[nodeData.status] || STATUS_STYLES.missing;
  const diffStyle = DIFFICULTY_COLORS[nodeData.difficulty] || DIFFICULTY_COLORS.intermediate;
  const isSelected = !!nodeData.selected;

  return (
    <>
      {/* Target handle (top — receives prerequisite edges) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-slate-500 !border-slate-600"
      />

      <div
        className={`
          relative rounded-xl border-2 px-4 py-3 min-w-[180px] max-w-[220px]
          backdrop-blur-sm shadow-lg transition-all duration-200
          ${style.border} ${style.bg} ${style.glow}
          ${isSelected ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-slate-950 scale-105 shadow-xl shadow-brand-500/20" : ""}
        `}
      >
        {/* Status icon (top-right) */}
        <span
          className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-slate-950 ${style.badge} ${style.badgeText}`}
        >
          {style.icon}
        </span>

        {/* Skill Label */}
        <div className="font-bold text-sm text-white leading-tight mb-2 pr-4">
          {nodeData.label}
        </div>

        {/* Tags Row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Category Tag */}
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/50 uppercase tracking-wider">
            {nodeData.category}
          </span>

          {/* Difficulty Tag */}
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider ${diffStyle}`}
          >
            {nodeData.difficulty}
          </span>
        </div>
      </div>

      {/* Source handle (bottom — sends edges to dependents) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-slate-500 !border-slate-600"
      />
    </>
  );
}

export const SkillNodeCard = memo(SkillNodeCardInner);
