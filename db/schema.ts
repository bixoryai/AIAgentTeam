import { pgTable, text, serial, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Define LLM provider enum
const llmProviderSchema = z.enum(["openai", "anthropic"]);
type LLMProvider = z.infer<typeof llmProviderSchema>;

// Define provider-specific settings
const providerSettingsSchema = z.object({
  openai: z.object({
    model: z.enum(["gpt-4o"]).default("gpt-4o"), 
    temperature: z.number().min(0).max(2).default(0.7),
  }).optional(),
  anthropic: z.object({
    model: z.enum(["claude-3-5-sonnet-20241022"]).default("claude-3-5-sonnet-20241022"), 
    temperature: z.number().min(0).max(1).default(0.7),
  }).optional(),
});

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

// Define the AI config schema with LLM provider support
const aiConfigSchema = z.object({
  provider: llmProviderSchema.default("openai"),
  providerSettings: providerSettingsSchema.default({}),
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
  averageGenerationTime: z.number(),
  topicDistribution: z.record(z.string(), z.number()),
  lastUpdateTime: z.string(),
});

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Teams/Organizations for collaboration
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Team members junction table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("member").notNull(), // 'owner', 'admin', 'member'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  status: text("status").default("idle").notNull(),
  isRegistered: boolean("is_registered").default(false).notNull(),
  registrationDate: timestamp("registration_date"),
  ownerId: integer("owner_id").references(() => users.id), // Owner of the agent
  teamId: integer("team_id").references(() => teams.id), // Team that has access to this agent
  aiConfig: jsonb("ai_config").$type<z.infer<typeof aiConfigSchema>>().notNull().default({
    provider: "openai",
    providerSettings: {
      openai: {
        model: "gpt-4o",
        temperature: 0.7,
      }
    },
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
    generationTime?: number; 
    researchTime?: number; 
    errorCount?: number;
  }>(),
  agentId: integer("agent_id").references(() => agents.id),
  authorId: integer("author_id").references(() => users.id), // User who created the post
  teamId: integer("team_id").references(() => teams.id), // Team context for the post
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Comments for collaborative feedback
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  blogPostId: integer("blog_post_id").references(() => blogPosts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
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

// Define all relations
export const userRelations = relations(users, ({ many }) => ({
  ownedTeams: many(teams),
  teamMemberships: many(teamMembers),
  agents: many(agents),
  blogPosts: many(blogPosts),
  comments: many(comments),
}));

export const teamRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  agents: many(agents),
  blogPosts: many(blogPosts),
}));

export const teamMemberRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

export const agentRelations = relations(agents, ({ one, many }) => ({
  owner: one(users, {
    fields: [agents.ownerId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [agents.teamId],
    references: [teams.id],
  }),
  blogPosts: many(blogPosts),
}));

export const blogPostRelations = relations(blogPosts, ({ one, many }) => ({
  agent: one(agents, {
    fields: [blogPosts.agentId],
    references: [agents.id],
  }),
  author: one(users, {
    fields: [blogPosts.authorId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [blogPosts.teamId],
    references: [teams.id],
  }),
  research: many(researchData),
  comments: many(comments),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  blogPost: one(blogPosts, {
    fields: [comments.blogPostId],
    references: [blogPosts.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// Create schemas for insert and select operations
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTeamSchema = createInsertSchema(teams);
export const selectTeamSchema = createSelectSchema(teams);
export const insertCommentSchema = createInsertSchema(comments);
export const selectCommentSchema = createSelectSchema(comments);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
export type Agent = typeof agents.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type ResearchData = typeof researchData.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

export type { LLMProvider };
export { llmProviderSchema, providerSettingsSchema };