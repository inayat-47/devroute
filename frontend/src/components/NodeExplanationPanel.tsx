/**
 * src/components/NodeExplanationPanel.tsx
 *
 * Side panel displaying detailed skill node explanation, related resources,
 * and a per-node scoped contextual chat assistant.
 */

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { explainNode, askQuestion } from "../api/devroute";
import type { SkillNode, Message } from "../api/types";
import { isAxiosError } from "axios";

interface NodeExplanationPanelProps {
  nodeId: string | null;
  nodeContext: SkillNode | null;
  targetRole: string;
  onClose?: () => void;
}

export function NodeExplanationPanel({
  nodeId,
  nodeContext,
  targetRole,
  onClose,
}: NodeExplanationPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Reset conversation history when nodeId changes
  useEffect(() => {
    setConversationHistory([]);
    setChatInput("");
  }, [nodeId]);

  // Scroll to bottom of chat when history updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationHistory]);

  // Fetch explanation (cached indefinitely by React Query)
  const {
    data: explanationData,
    isLoading: isExplaining,
    error: explainError,
    refetch: refetchExplanation,
  } = useQuery({
    queryKey: ["explain-node", nodeId, targetRole],
    queryFn: () =>
      explainNode({
        nodeId: nodeId!,
        nodeContext: {
          label: nodeContext!.label,
          status: nodeContext!.status,
          category: nodeContext!.category,
          difficulty: nodeContext!.difficulty,
        },
        targetRole,
      }),
    enabled: !!nodeId && !!nodeContext,
    staleTime: Infinity, // Keep cached explanations instant
  });

  // Mutation for sending chat questions
  const {
    mutate: sendQuestion,
    isPending: isAsking,
    error: askError,
    reset: resetAskError,
  } = useMutation({
    mutationFn: async (payload: { nodeId: string; question: string; history: Message[] }) => {
      return askQuestion({
        nodeId: payload.nodeId,
        question: payload.question,
        conversationHistory: payload.history,
      });
    },
    onSuccess: (data, variables) => {
      // Append user question and assistant answer
      setConversationHistory((prev) => [
        ...prev,
        { role: "user", content: variables.question },
        { role: "assistant", content: data.answer },
      ]);
      setChatInput("");
    },
  });

  if (!nodeId || !nodeContext) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-slate-500">
        <div className="space-y-3">
          <div className="text-4xl opacity-20">💬</div>
          <p className="text-xs font-medium max-w-[220px] mx-auto leading-relaxed">
            Click any skill node on the graph to view details, explanations, and ask questions.
          </p>
        </div>
      </div>
    );
  }

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAsking) return;

    resetAskError();
    sendQuestion({
      nodeId,
      question: chatInput.trim(),
      history: conversationHistory,
    });
  };

  // Status tag styling
  const statusStyles = {
    completed: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    "in-progress": "bg-amber-500/20 text-amber-300 border-amber-500/30",
    missing: "bg-rose-500/20 text-rose-300 border-rose-500/30",
  }[nodeContext.status] || "bg-slate-800 text-slate-300";

  const statusLabel = {
    completed: "Mastered",
    "in-progress": "In Progress",
    missing: "Gap",
  }[nodeContext.status] || nodeContext.status;

  return (
    <div className="h-full flex flex-col justify-between bg-slate-900/40 backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Header Info */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${statusStyles}`}
            >
              {statusLabel}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50 uppercase tracking-wider">
              {nodeContext.difficulty}
            </span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 transition-colors text-sm font-semibold p-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <h3 className="text-base font-extrabold text-white leading-snug">
          {nodeContext.label}
        </h3>

        <div className="text-[10px] text-brand-400 font-semibold tracking-wider uppercase mt-1">
          {nodeContext.category}
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        {/* Rationale / Explanation */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Why this matters
          </h4>

          {isExplaining ? (
            /* Skeleton loader */
            <div className="space-y-2 animate-pulse">
              <div className="h-3.5 bg-slate-800 rounded w-full" />
              <div className="h-3.5 bg-slate-800 rounded w-11/12" />
              <div className="h-3.5 bg-slate-800 rounded w-10/12" />
            </div>
          ) : explainError ? (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <p className="mb-2">Failed to load explanation.</p>
              <button
                onClick={() => refetchExplanation()}
                className="text-xs font-semibold text-brand-400 hover:underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-300 leading-relaxed">
              {explanationData?.explanation}
            </p>
          )}
        </div>

        {/* Resources */}
        {nodeContext.resources && nodeContext.resources.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Learning Materials
            </h4>
            <div className="space-y-1.5">
              {nodeContext.resources.map((res, i) => (
                <a
                  key={i}
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-brand-500/40 hover:bg-slate-800/50 transition-all group"
                >
                  <div className="truncate pr-2">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-brand-300 truncate transition-colors leading-tight">
                      {res.title}
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase font-medium mt-0.5">
                      {res.type}
                    </span>
                  </div>
                  <span className="text-slate-600 group-hover:text-brand-400 transition-colors text-xs shrink-0 font-bold">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Chat Scoped to Node */}
        <div className="pt-2 border-t border-slate-800/60 space-y-3">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Ask Mentor</span>
            <span className="text-[9px] text-slate-600 font-normal">
              Contextual Chat
            </span>
          </h4>

          {/* Chat Bubble List */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {/* Initial Prompt bubble */}
            <div className="flex gap-2">
              <div className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                M
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-850 border border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
                Ask me anything about learning <strong>{nodeContext.label}</strong> for your target role.
              </div>
            </div>

            {/* Conversation list */}
            {conversationHistory.map((msg, index) => (
              <div key={index} className="flex gap-2 animate-fadeIn">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                    msg.role === "user"
                      ? "bg-slate-700 text-slate-200"
                      : "bg-brand-500/20 text-brand-400"
                  }`}
                >
                  {msg.role === "user" ? "U" : "M"}
                </div>
                <div
                  className={`p-2.5 rounded-2xl text-[11px] leading-relaxed border ${
                    msg.role === "user"
                      ? "bg-slate-800/50 border-slate-750 text-slate-300"
                      : "bg-slate-850 border-slate-800 text-slate-300"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isAsking && (
              <div className="flex gap-2 animate-pulse">
                <div className="h-5 w-5 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  M
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-850 border border-slate-800/60 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce" />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Inline Chat Error Banner */}
          {askError && (
            <div className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 animate-fadeIn">
              {isAxiosError(askError) && askError.response?.status === 429
                ? "AI provider is busy, please wait a moment and try again shortly."
                : "Unable to reach mentor. Check connection and retry."}
            </div>
          )}
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 sticky bottom-0 z-10 shrink-0">
        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={isAsking}
            placeholder={`Ask about ${nodeContext.label}...`}
            className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAsking || !chatInput.trim()}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              isAsking || !chatInput.trim()
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-brand-600 hover:bg-brand-500 text-white cursor-pointer"
            }`}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
