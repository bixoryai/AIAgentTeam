import { z } from "zod";

// Content generation configuration schema
export const contentGenerationConfigSchema = z.object({
  topics: z.array(z.string()).min(1, "At least one topic is required"),
  wordCountMin: z.number().min(100).max(5000),
  wordCountMax: z.number().min(100).max(5000),
  style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
  tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
  instructions: z.string(),
  researchDepth: z.number().min(1).max(5),
});

export type ContentGenerationConfig = z.infer<typeof contentGenerationConfigSchema>;

// AI configuration for the content generation agent
export const aiConfigSchema = z.object({
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  researchEnabled: z.boolean(),
  contentGeneration: contentGenerationConfigSchema,
});

export type AIConfig = z.infer<typeof aiConfigSchema>;

// Default configuration values
export const defaultConfig: AIConfig = {
  model: "gpt-4",
  temperature: 0.7,
  maxTokens: 2000,
  researchEnabled: true,
  contentGeneration: {
    topics: [],
    wordCountMin: 500,
    wordCountMax: 1500,
    style: "balanced",
    tone: "professional",
    instructions: "",
    researchDepth: 3,
  },
};
