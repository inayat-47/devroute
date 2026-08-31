/**
 * src/components/SkillGraph.tsx
 *
 * Interactive dependency graph built on React Flow + dagre auto-layout.
 * Converts the API's SkillNode[]/Edge[] into React Flow format, runs dagre
 * for a clean top-to-bottom DAG layout, and renders with Background,
 * Controls, MiniMap, and a status legend overlay.
 */

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge as RFEdge,
  type NodeTypes,
  MarkerType,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";

import { SkillNodeCard, type SkillNodeData } from "./SkillNodeCard";
import type { SkillNode, Edge as ApiEdge } from "../api/types";

/* ─── dagre layout helper ──────────────────────────────────────────── */

const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;

function layoutGraph(
  apiNodes: SkillNode[],
  apiEdges: ApiEdge[]
): { nodes: Node<SkillNodeData>[]; edges: RFEdge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",       // top-to-bottom
    nodesep: 60,         // horizontal spacing
    ranksep: 100,        // vertical spacing between ranks
    marginx: 40,
    marginy: 40,
  });

  apiNodes.forEach((n) => {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  apiEdges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  Dagre.layout(g);

  const nodes: Node<SkillNodeData>[] = apiNodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: "skillNode",
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        label: n.label,
        category: n.category,
        status: n.status,
        difficulty: n.difficulty,
        whyItMatters: n.whyItMatters,
        selected: false,
      },
    };
  });

  const edges: RFEdge[] = apiEdges
    .filter((e) => g.hasNode(e.source) && g.hasNode(e.target))
    .map((e) => {
      const isCompleted = apiNodes.find((n) => n.id === e.source)?.status === "completed";
      return {
        id: e.id || `e-${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        animated: !isCompleted,
        style: {
          stroke: isCompleted ? "#22c55e" : "#64748b",
          strokeWidth: isCompleted ? 2 : 1.5,
          opacity: isCompleted ? 0.6 : 0.8,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color: isCompleted ? "#22c55e" : "#64748b",
        },
      };
    });

  return { nodes, edges };
}

/* ─── node type registry (must be stable ref) ──────────────────────── */

const nodeTypes: NodeTypes = {
  skillNode: SkillNodeCard,
};

/* ─── Legend ───────────────────────────────────────────────────────── */

function Legend() {
  return (
    <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-xl">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Node Status Legend
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 shrink-0" />
          <span className="text-emerald-300 font-medium">Mastered</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm bg-amber-500 shrink-0" />
          <span className="text-amber-300 font-medium">In Progress</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm bg-rose-500 shrink-0" />
          <span className="text-rose-300 font-medium">Missing / Gap</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */

interface SkillGraphProps {
  apiNodes: SkillNode[];
  apiEdges: ApiEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string | null) => void;
}

export function SkillGraph({
  apiNodes,
  apiEdges,
  selectedNodeId,
  onNodeSelect,
}: SkillGraphProps) {
  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(
    () => layoutGraph(apiNodes, apiEdges),
    [apiNodes, apiEdges]
  );

  // Apply selected state into node data
  const nodesWithSelection = useMemo(
    () =>
      layoutNodes.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedNodeId },
      })),
    [layoutNodes, selectedNodeId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesWithSelection);
  const [edges, , onEdgesChange] = useEdgesState(layoutEdges);

  // Sync selection changes into node state
  useMemo(() => {
    setNodes(
      layoutNodes.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === selectedNodeId },
      }))
    );
  }, [selectedNodeId, layoutNodes, setNodes]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const newId = node.id === selectedNodeId ? null : node.id;
      onNodeSelect(newId);
    },
    [selectedNodeId, onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div className="relative w-full h-full">
      <Legend />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        className="bg-slate-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#1e293b"
        />
        <Controls
          className="!bg-slate-900 !border-slate-700 !rounded-lg !shadow-xl [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-300 [&>button:hover]:!bg-slate-700"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            const status = (node.data as SkillNodeData)?.status;
            if (status === "completed") return "#22c55e";
            if (status === "in-progress") return "#eab308";
            return "#ef4444";
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
          className="!bg-slate-900 !border-slate-700 !rounded-lg !shadow-xl"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}
