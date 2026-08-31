/**
 * src/hooks/useGenerateGraph.ts
 *
 * React Query mutation hook that CHAINS the two backend calls:
 * 1. POST /api/analyze (ingest GitHub or resume skills)
 * 2. POST /api/generate-path (LLM skill-gap DAG computation)
 *
 * Tracks granular multi-stage loading states and categorizes error types.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { analyzeProfile, generatePath } from "../api/devroute";
import {
  AnalyzeRequest,
  FullAnalysisResult,
  Skill,
} from "../api/types";

export type LoadingStage = "idle" | "analyzing" | "generating";

export type ErrorType =
  | "github_not_found"
  | "github_rate_limit"
  | "ai_rate_limit"
  | "general"
  | null;

export interface ErrorState {
  type: ErrorType;
  message: string;
  field?: "githubUsername" | "resumeText" | "general";
}

export interface GenerateGraphInput {
  targetRole: string;
  githubUsername?: string;
  resumeText?: string;
}

export function useGenerateGraph() {
  const [loadingStage, setLoadingStage] = useState<LoadingStage>("idle");
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  const mutation = useMutation<FullAnalysisResult, ErrorState, GenerateGraphInput>({
    mutationFn: async (input: GenerateGraphInput): Promise<FullAnalysisResult> => {
      setErrorState(null);

      // --- Stage 1: Analyze Skills ---
      setLoadingStage("analyzing");

      const analyzePayload: AnalyzeRequest = {
        targetRole: input.targetRole.trim(),
      };

      // If username provided, prioritize it
      if (input.githubUsername && input.githubUsername.trim()) {
        analyzePayload.githubUsername = input.githubUsername.trim();
      } else if (input.resumeText && input.resumeText.trim()) {
        analyzePayload.resumeText = input.resumeText.trim();
      }

      let knownSkills: Skill[] = [];
      let reposAnalyzed = 0;
      let sourceUsed: "github" | "resume" = "github";

      try {
        const analyzeRes = await analyzeProfile(analyzePayload);
        knownSkills = analyzeRes.knownSkills || [];
        reposAnalyzed = analyzeRes.reposAnalyzed || 0;
        sourceUsed = analyzeRes.sourceUsed || "github";
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const status = err.response?.status;
          const detail = err.response?.data?.detail;

          if (status === 404) {
            const errObj: ErrorState = {
              type: "github_not_found",
              message:
                typeof detail === "string"
                  ? detail
                  : `GitHub user '${input.githubUsername}' was not found. Please verify the username or use the resume option.`,
              field: "githubUsername",
            };
            setErrorState(errObj);
            throw errObj;
          }

          if (status === 429 || status === 403) {
            const errObj: ErrorState = {
              type: "github_rate_limit",
              message:
                "GitHub API rate limit reached. Paste your resume or LinkedIn experience below to continue immediately without waiting.",
              field: "general",
            };
            setErrorState(errObj);
            throw errObj;
          }
        }

        const fallbackErr: ErrorState = {
          type: "general",
          message:
            "Could not complete skill profiling. Please check your network connection and try again.",
          field: "general",
        };
        setErrorState(fallbackErr);
        throw fallbackErr;
      }

      // --- Stage 2: Generate Learning Path DAG ---
      setLoadingStage("generating");

      try {
        const pathData = await generatePath({
          targetRole: input.targetRole.trim(),
          knownSkills,
        });

        return {
          targetRole: input.targetRole.trim(),
          sourceUsed,
          reposAnalyzed,
          knownSkills,
          pathData,
          githubUsername: input.githubUsername?.trim(),
        };
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          const status = err.response?.status;

          if (status === 429) {
            const errObj: ErrorState = {
              type: "ai_rate_limit",
              message:
                "The AI analysis engine is currently experiencing high demand. Please wait a moment and try again.",
              field: "general",
            };
            setErrorState(errObj);
            throw errObj;
          }
        }

        const fallbackErr: ErrorState = {
          type: "general",
          message:
            "AI curriculum generation could not be completed. Please try again in a few moments.",
          field: "general",
        };
        setErrorState(fallbackErr);
        throw fallbackErr;
      }
    },
    onSettled: () => {
      setLoadingStage("idle");
    },
  });

  const clearError = () => setErrorState(null);

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    loadingStage,
    errorState,
    clearError,
    data: mutation.data,
    isSuccess: mutation.isSuccess,
  };
}
