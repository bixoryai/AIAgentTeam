import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { agents, blogPosts, researchData } from "@db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input validation schema
const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.string().min(1, "Type is required"),
});

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
  // Create new agent with AI configuration
  app.post("/api/agents", async (req, res) => {
    try {
      const data = createAgentSchema.parse(req.body);

      // Analyze description to configure AI settings
      const aiConfig = {
        model: "gpt-4", // Default to GPT-4 for high-quality responses
        temperature: 0.7, // Balance between creativity and consistency
        maxTokens: 1000,
        researchEnabled: true,
        contentGeneration: {
          enabled: true,
          preferredStyle: detectStyleFromDescription(data.description),
          topicFocus: extractTopicsFromDescription(data.description),
        },
      };

      const result = await db.insert(agents).values({
        ...data,
        status: "initializing", // Changed from 'idle' to show setup process
        aiConfig,
      }).returning();

      // Start agent initialization in background
      initializeAgent(result[0]);

      res.json(result[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({ error: "Failed to create agent" });
    }
  });

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

// Helper functions for AI configuration
function detectStyleFromDescription(description: string): string {
  const description_lower = description.toLowerCase();
  if (description_lower.includes("formal") || description_lower.includes("professional")) {
    return "formal";
  } else if (description_lower.includes("casual") || description_lower.includes("friendly")) {
    return "casual";
  }
  return "balanced";
}

function extractTopicsFromDescription(description: string): string[] {
  // Extract key topics using simple keyword analysis
  const topics = [];
  const commonTopics = ["technology", "business", "science", "health", "education"];

  for (const topic of commonTopics) {
    if (description.toLowerCase().includes(topic)) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ["general"];
}

async function initializeAgent(agent: any) {
  try {
    // Verify vector service health
    if (!await isVectorServiceHealthy()) {
      throw new Error("Vector service not available");
    }

    // Initialize agent's AI components
    await db.update(agents)
      .set({
        status: "ready",
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agent.id));

  } catch (error) {
    console.error("Agent initialization failed:", error);
    await db.update(agents)
      .set({
        status: "error",
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agent.id));
  }
}