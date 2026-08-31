/**
 * src/api/devroute.ts
 *
 * API client module for DevRoute endpoints.
 * Handles requests to /api/analyze and /api/generate-path.
 */

import axios, { AxiosInstance } from "axios";
import {
  AnalyzeRequest,
  AnalyzeResponse,
  GeneratePathRequest,
  GeneratePathResponse,
  ExplainNodeRequest,
  ExplainNodeResponse,
  AskRequest,
  AskResponse,
} from "./types";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export const devrouteClient: AxiosInstance = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000, // 60s for LLM processing
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Stage 1: Ingest GitHub profile or resume text to extract verified skills.
 */
export async function analyzeProfile(
  payload: AnalyzeRequest
): Promise<AnalyzeResponse> {
  const response = await devrouteClient.post<AnalyzeResponse>(
    "/api/analyze",
    payload
  );
  return response.data;
}

/**
 * Stage 2: Generate personalized learning path and skill gap DAG with AI.
 */
export async function generatePath(
  payload: GeneratePathRequest
): Promise<GeneratePathResponse> {
  const response = await devrouteClient.post<GeneratePathResponse>(
    "/api/generate-path",
    payload
  );
  return response.data;
}

/**
 * Stage 3: Explain a specific skill node in detail.
 */
export async function explainNode(
  payload: ExplainNodeRequest
): Promise<ExplainNodeResponse> {
  const response = await devrouteClient.post<ExplainNodeResponse>(
    "/api/explain-node",
    payload
  );
  return response.data;
}

/**
 * Stage 4: Ask follow-up question scoped to a specific node.
 */
export async function askQuestion(
  payload: AskRequest
): Promise<AskResponse> {
  const response = await devrouteClient.post<AskResponse>(
    "/api/ask",
    payload
  );
  return response.data;
}
