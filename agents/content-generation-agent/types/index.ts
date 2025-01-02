import type { BlogPost } from "@db/schema";
import type { AIConfig } from "../config/agent-config";

export interface AgentMetadata {
  totalPosts: number;
  totalWordCount: number;
  averageWordCount: number;
  successRate: number;
  averageGenerationTime: number; // in seconds
  topicDistribution: Record<string, number>;
  lastUpdateTime: string;
}

export interface AgentStatus {
  status: "initializing" | "ready" | "researching" | "generating" | "completed" | "error" | "idle";
  lastError?: string;
  lastErrorTime?: string;
}

export interface ContentAgent {
  id: number;
  name: string;
  description: string;
  config: AIConfig;
  metadata: AgentMetadata;
  status: AgentStatus;
  posts: BlogPost[];
}

export type AgentEvent = {
  type: "research_started" | "research_completed" | "content_generated" | "error";
  timestamp: string;
  data?: any;
  error?: string;
};