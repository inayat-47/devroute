/**
 * src/api/types.ts
 *
 * TypeScript types mirroring the backend Pydantic models exactly.
 * Matches requirements.md specification for consistency across frontend & backend.
 */

export interface Skill {
  name: string;
  evidence?: string;
  confidence: "high" | "medium" | "low";
}

export interface AnalyzeRequest {
  githubUsername?: string;
  targetRole?: string;
  resumeText?: string;
}

export interface AnalyzeResponse {
  knownSkills: Skill[];
  reposAnalyzed: number;
  sourceUsed: "github" | "resume";
  note?: string | null;
}

export interface Resource {
  title: string;
  url: string;
  type: "course" | "doc" | "project";
}

export interface SkillNode {
  id: string;
  label: string;
  category: string;
  status: "completed" | "in-progress" | "missing";
  difficulty: "beginner" | "intermediate" | "advanced";
  whyItMatters?: string;
  prerequisites: string[];
  resources: Resource[];
}

export interface Edge {
  id?: string;
  source: string;
  target: string;
}

export interface GeneratePathRequest {
  knownSkills: Skill[];
  targetRole: string;
}

export interface GeneratePathResponse {
  nodes: SkillNode[];
  edges: Edge[];
  summary: string;
  readinessPercent: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ExplainNodeRequest {
  nodeId: string;
  nodeContext: Record<string, any>;
  targetRole: string;
}

export interface ExplainNodeResponse {
  explanation: string;
}

export interface AskRequest {
  nodeId: string;
  question: string;
  conversationHistory: Message[];
}

export interface AskResponse {
  answer: string;
}

export interface FullAnalysisResult {
  targetRole: string;
  sourceUsed: "github" | "resume";
  reposAnalyzed: number;
  knownSkills: Skill[];
  pathData: GeneratePathResponse;
  githubUsername?: string;
}
