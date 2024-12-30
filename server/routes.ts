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

pythonProcess.stdout.on("data", (data) => {
  console.log(`Vector service output: ${data}`);
});

pythonProcess.stderr.on("data", (data) => {
  console.error(`Vector service error: ${data}`);
});

pythonProcess.on("close", (code) => {
  if (code !== 0) {
    console.error(`Vector service exited with code ${code}`);
  }
});

// Check if vector service is healthy before making requests
async function isVectorServiceHealthy() {
  try {
    const response = await fetch("http://localhost:5001/health");
    return response.ok;
  } catch (error) {
    console.error("Vector service health check failed:", error);
    return false;
  }
}

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
      // Check vector service health
      if (!await isVectorServiceHealthy()) {
        throw new Error("Vector service is not available");
      }

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

      // Call vector service
      const response = await fetch("http://localhost:5001/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, word_count: wordCount, instructions }),
      });

      if (!response.ok) {
        throw new Error(`Vector service error: ${await response.text()}`);
      }

      const { content, vector_id, research_data } = await response.json();

      // Store research data
      await db.insert(researchData).values({
        topic,
        content: research_data,
        source: "web_search",
        vectorId: vector_id,
        blogPostId: post[0].id,
      });

      // Update blog post with generated content
      await db.update(blogPosts)
        .set({ content, updatedAt: new Date() })
        .where(eq(blogPosts.id, post[0].id));

      // Update agent status back to idle
      await db.update(agents)
        .set({ status: "idle" })
        .where(eq(agents.id, agentId));

      res.json(post[0]);
    } catch (error) {
      console.error("Research error:", error);

      // Update agent status to idle in case of error
      await db.update(agents)
        .set({ status: "idle" })
        .where(eq(agents.id, agentId));

      res.status(500).json({ 
        error: "Failed to start research",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}