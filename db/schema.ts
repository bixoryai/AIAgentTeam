import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define the content generation config schema
const contentGenerationConfigSchema = z.object({
  topics: z.array(z.string()),
  wordCountMin: z.number(),
  wordCountMax: z.number(),
  style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
  tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
  instructions: z.string(),
  researchDepth: z.number().min(1).max(5),
});

// Define the AI config schema
const aiConfigSchema = z.object({
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  researchEnabled: z.boolean(),
  contentGeneration: contentGenerationConfigSchema,
  lastError: z.string().nullable().optional(),
  lastErrorTime: z.string().nullable().optional(),
});

// Define analytics metadata schema
const analyticsMetadataSchema = z.object({
  totalPosts: z.number(),
  totalWordCount: z.number(),
  averageWordCount: z.number(),
  successRate: z.number(),
  averageGenerationTime: z.number(), // in seconds
  topicDistribution: z.record(z.string(), z.number()),
  lastUpdateTime: z.string(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").default("idle").notNull(),
  isRegistered: boolean("is_registered").default(false).notNull(),
  registrationDate: timestamp("registration_date"),
  aiConfig: jsonb("ai_config").$type<z.infer<typeof aiConfigSchema>>().notNull().default({
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
    lastError: null,
    lastErrorTime: null,
  }),
  analyticsMetadata: jsonb("analytics_metadata").$type<z.infer<typeof analyticsMetadataSchema>>().notNull().default({
    totalPosts: 0,
    totalWordCount: 0,
    averageWordCount: 0,
    successRate: 100,
    averageGenerationTime: 0,
    topicDistribution: {},
    lastUpdateTime: new Date().toISOString(),
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull(),
  metadata: jsonb("metadata").$type<{
    status: string;
    generatedAt?: string;
    topicFocus?: string[];
    style?: string;
    generationTime?: number; // in seconds
    researchTime?: number; // in seconds
    errorCount?: number;
  }>(),
  agentId: integer("agent_id").references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const researchData = pgTable("research_data", {
  id: serial("id").primaryKey(),
  topic: text("topic").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  vectorId: text("vector_id").notNull(),
  blogPostId: integer("blog_post_id").references(() => blogPosts.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agentRelations = relations(agents, ({ many }) => ({
  blogPosts: many(blogPosts),
}));

export const blogPostRelations = relations(blogPosts, ({ one, many }) => ({
  agent: one(agents, {
    fields: [blogPosts.agentId],
    references: [agents.id],
  }),
  research: many(researchData),
}));

export type Agent = typeof agents.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type ResearchData = typeof researchData.$inferSelect;