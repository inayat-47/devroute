/**
 * src/pages/GraphPage.tsx
 *
 * Phases 4–6: Interactive dependency graph + Dashboard tab.
 * A single tab toggle switches between the React Flow graph view and a
 * dashboard summary view — both read the exact same in-memory data, so
 * there is zero drift between the two.
 */

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SkillGraph } from "../components/SkillGraph";
import { NodeExplanationPanel } from "../components/NodeExplanationPanel";
import { ReadinessRing } from "../components/ReadinessRing";
import { MilestoneList } from "../components/MilestoneList";
import { NextActionsCard } from "../components/NextActionsCard";
import type { FullAnalysisResult } from "../api/types";

type ViewTab = "graph" | "dashboard";

export function GraphPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("graph");

  const result = location.state as FullAnalysisResult | undefined;

  /* ── No data: redirect prompt ─────────────────────────────────── */
  if (!result || !result.pathData) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-white">No Path Data Found</h2>
          <p className="text-slate-400 text-sm">
            Please enter your target role and profile on the home screen to
            generate your personalized learning path.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  const { targetRole, sourceUsed, reposAnalyzed, pathData, githubUsername } = result;
  const { nodes, edges, summary, readinessPercent } = pathData;

  const completedCount = nodes.filter((n) => n.status === "completed").length;
  const missingCount = nodes.filter((n) => n.status === "missing").length;

  /* ── Empty graph fallback ─────────────────────────────────────── */
  if (!nodes.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <GraphHeader
          targetRole={targetRole}
          readinessPercent={readinessPercent}
          githubUsername={githubUsername}
          sourceUsed={sourceUsed}
          reposAnalyzed={reposAnalyzed}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onStartOver={() => navigate("/")}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg text-center p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-2xl">
              ⚠
            </div>
            <h2 className="text-lg font-bold text-white">
              Unable to Build a Complete Path
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              The AI engine didn&apos;t return enough skill data to construct a
              meaningful dependency graph this time. Try a different target role
              or provide more skill context.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              ← Try a Different Role
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* Find the selected node for the aside panel */
  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  /** When a NextActionsCard is clicked, switch to graph tab and select the node */
  const handleActionSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab("graph");
  };

  /* ── Main layout ──────────────────────────────────────────────── */
  return (
    <div className="h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden">
      <GraphHeader
        targetRole={targetRole}
        readinessPercent={readinessPercent}
        githubUsername={githubUsername}
        sourceUsed={sourceUsed}
        reposAnalyzed={reposAnalyzed}
        completedCount={completedCount}
        missingCount={missingCount}
        totalCount={nodes.length}
        summary={summary}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onStartOver={() => navigate("/")}
      />

      {activeTab === "graph" ? (
        /* ── Graph View ──────────────────────────────────────────── */
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 relative">
            <SkillGraph
              apiNodes={nodes}
              apiEdges={edges}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          </div>

          <aside className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/60 backdrop-blur-sm flex flex-col">
            <NodeExplanationPanel
              nodeId={selectedNodeId}
              nodeContext={selectedNode}
              targetRole={targetRole}
              onClose={() => setSelectedNodeId(null)}
            />
          </aside>
        </div>
      ) : (
        /* ── Dashboard View ──────────────────────────────────────── */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 animate-fadeIn">
            {/* Top row: Ring + Summary */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="shrink-0">
                <ReadinessRing percent={readinessPercent} />
              </div>

              <div className="flex-1 space-y-4 text-center md:text-left">
                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    Your Path to {targetRole}
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {completedCount} skill{completedCount !== 1 ? "s" : ""} mastered
                    {" · "}
                    {missingCount} gap{missingCount !== 1 ? "s" : ""} remaining
                    {" · "}
                    {nodes.length} total skills
                  </p>
                </div>

                {summary && (
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 rounded-lg px-4 py-3 border border-slate-800/80">
                    <span className="text-brand-400 font-semibold">AI Summary: </span>
                    {summary}
                  </p>
                )}

                {/* Quick stats row */}
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-black text-emerald-400">{completedCount}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Mastered</div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="text-center">
                    <div className="text-2xl font-black text-amber-400">
                      {nodes.filter((n) => n.status === "in-progress").length}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">In Progress</div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="text-center">
                    <div className="text-2xl font-black text-rose-400">{missingCount}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Gaps</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Two-column: Milestones + Next Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3">
                <MilestoneList nodes={nodes} />
              </div>
              <div className="lg:col-span-2">
                <NextActionsCard
                  nodes={nodes}
                  edges={edges}
                  onSelectNode={handleActionSelect}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Header sub-component ─────────────────────────────────────────── */

interface GraphHeaderProps {
  targetRole: string;
  readinessPercent: number;
  githubUsername?: string;
  sourceUsed: string;
  reposAnalyzed: number;
  completedCount?: number;
  missingCount?: number;
  totalCount?: number;
  summary?: string;
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onStartOver: () => void;
}

function GraphHeader({
  targetRole,
  readinessPercent,
  githubUsername,
  sourceUsed,
  reposAnalyzed,
  completedCount,
  missingCount,
  totalCount,
  summary,
  activeTab,
  onTabChange,
  onStartOver,
}: GraphHeaderProps) {
  const [showSummary, setShowSummary] = useState(false);

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md z-20 shrink-0">
      <div className="px-5 h-14 flex items-center justify-between gap-4">
        {/* Left section */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onStartOver}
            className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-all hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            ← Start Over
          </button>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-black text-xs shrink-0">
              D
            </div>
            <h1 className="font-bold text-sm text-white truncate">
              {targetRole}
            </h1>
          </div>

          {/* ── Tab Toggle ───────────────────────────────────────── */}
          <div className="h-4 w-px bg-slate-800 shrink-0 hidden sm:block" />
          <div className="hidden sm:flex items-center bg-slate-900 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => onTabChange("graph")}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "graph"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Graph
            </button>
            <button
              onClick={() => onTabChange("dashboard")}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Dashboard
            </button>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Source badge */}
          <span className="text-[10px] text-slate-500 hidden lg:inline-block">
            {sourceUsed === "github"
              ? `@${githubUsername} · ${reposAnalyzed} repos`
              : "Resume text"}
          </span>

          {/* Completion stats */}
          {totalCount !== undefined && (
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-medium">
              <span className="text-emerald-400">{completedCount} mastered</span>
              <span className="text-slate-600">·</span>
              <span className="text-rose-400">{missingCount} gaps</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">{totalCount} total</span>
            </div>
          )}

          {/* Readiness badge */}
          <div className="px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 font-bold text-xs">
            {readinessPercent}% Ready
          </div>

          {/* Summary toggle */}
          {summary && (
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              title="Toggle AI Summary"
            >
              {showSummary ? "▲" : "▼"} Summary
            </button>
          )}
        </div>
      </div>

      {/* Collapsible summary band */}
      {showSummary && summary && (
        <div className="px-5 pb-3 animate-fadeIn">
          <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/60 rounded-lg px-4 py-2.5 border border-slate-800/80">
            <span className="text-brand-400 font-semibold">AI Summary: </span>
            {summary}
          </p>
        </div>
      )}
    </header>
  );
}
