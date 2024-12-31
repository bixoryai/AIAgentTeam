import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define the AI config schema
const aiConfigSchema = z.object({
  model: z.string(),
  temperature: z.number(),
  maxTokens: z.number(),
  researchEnabled: z.boolean(),
  contentGeneration: z.object({
    enabled: z.boolean(),
    preferredStyle: z.string(),
    topicFocus: z.array(z.string()),
  }),
  lastError: z.string().nullable().optional(),
  lastErrorTime: z.string().nullable().optional(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").default("idle").notNull(),
  aiConfig: jsonb("ai_config").$type<z.infer<typeof aiConfigSchema>>().notNull().default({
    model: "gpt-4",
    temperature: 0.7,
    maxTokens: 2000,
    researchEnabled: true,
    contentGeneration: {
      enabled: true,
      preferredStyle: "balanced",
      topicFocus: ["general"],
    },
    lastError: null,
    lastErrorTime: null,
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull(),
  metadata: jsonb("metadata"),
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