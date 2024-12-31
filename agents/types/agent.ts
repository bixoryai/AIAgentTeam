import { z } from "zod";

// Core interfaces for all agents
export interface AgentCapabilities {
  initialize(): Promise<void>;
  research(topic: string): Promise<ResearchResult>;
  generate(prompt: string): Promise<GenerationResult>;
  analyze(data: any): Promise<AnalysisResult>;
  getStatus(): AgentStatus;
  updateConfig(config: Partial<AgentConfig>): Promise<void>;
}

export interface ResearchResult {
  content: string;
  sources: string[];
  relevance: number;
  vectorId: string;
}

export interface GenerationResult {
  content: string;
  metadata: {
    generatedAt: string;
    model: string;
    parameters: Record<string, any>;
  };
}

export interface AnalysisResult {
  insights: string[];
  confidence: number;
  recommendations: string[];
}

export interface AgentStatus {
  status: "initializing" | "ready" | "researching" | "generating" | "error" | "idle";
  lastError?: string;
  lastErrorTime?: string;
  currentOperation?: string;
}

// Base configuration schema that all agents must extend
export const baseAgentConfigSchema = z.object({
  model: z.string(),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().min(100).max(4000),
  researchEnabled: z.boolean(),
  vectorization: z.object({
    chunkSize: z.number(),
    overlap: z.number(),
    similarity: z.number(),
  }),
  research: z.object({
    depth: z.number().min(1).max(5),
    sourcesCount: z.number().min(1),
    timeout: z.number(),
  }),
});

export type BaseAgentConfig = z.infer<typeof baseAgentConfigSchema>;

// Analytics interface for tracking agent performance
export interface AgentAnalytics {
  operationCounts: Record<string, number>;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  lastUpdated: string;
}

// Events that agents can emit
export type AgentEvent = {
  type: "research_started" | "research_completed" | "generation_started" | "generation_completed" | "error";
  timestamp: string;
  agentId: number;
  data?: any;
  error?: string;
};

// Helper type for agent responses
export type AgentResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
};
