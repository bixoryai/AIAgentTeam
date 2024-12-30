import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { agents, blogPosts, researchData } from "@db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Python vector service
const pythonProcess = spawn("python3", [path.join(__dirname, "vector_service.py")]);

pythonProcess.stderr.on("data", (data) => {
  console.error(`Vector service error: ${data}`);
});

export function registerRoutes(app: Express): Server {
  // Get all agents
  app.get("/api/agents", async (_req, res) => {
    const result = await db.query.agents.findMany();
    res.json(result);
  });

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
    const result = await db.query.agents.findFirst({
      where: eq(agents.id, parseInt(req.params.id)),
    });

    if (!result) {
      res.status(404).send("Agent not found");
      return;
    }

    res.json(result);
  });

  // Get agent's blog posts
  app.get("/api/agents/:id/posts", async (req, res) => {
    const result = await db.query.blogPosts.findMany({
      where: eq(blogPosts.agentId, parseInt(req.params.id)),
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });

    res.json(result);
  });

  // Start research and blog generation
  app.post("/api/agents/:id/research", async (req, res) => {
    const { topic, wordCount, instructions } = req.body;
    const agentId = parseInt(req.params.id);

    try {
      // Create blog post
      const post = await db.insert(blogPosts).values({
        title: `Research on: ${topic}`,
        content: "Researching...",
        wordCount: parseInt(wordCount),
        agentId,
        metadata: { instructions },
      }).returning();

      // Update agent status
      await db.update(agents)
        .set({ status: "researching" })
        .where(eq(agents.id, agentId));

      res.json(post[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to start research" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}