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

// Input validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  type: z.string().min(1, "Type is required"),
});

const toggleAgentSchema = z.object({
  action: z.enum(["start", "pause"])
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

// Check if vector service is healthy
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
  // Create new agent
  app.post("/api/agents", async (req, res) => {
    try {
      const data = createAgentSchema.parse(req.body);

      const aiConfig = {
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
        researchEnabled: true,
        contentGeneration: {
          enabled: true,
          preferredStyle: detectStyleFromDescription(data.description),
          topicFocus: extractTopicsFromDescription(data.description),
        },
      };

      const result = await db.insert(agents).values({
        ...data,
        status: "initializing",
        aiConfig,
      }).returning();

      // Start agent initialization
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

  // Toggle agent status (start/pause)
  app.post("/api/agents/:id/toggle", async (req, res) => {
    try {
      const { action } = toggleAgentSchema.parse(req.body);
      const agentId = parseInt(req.params.id);

      // Check if agent exists first
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });

      if (!agent) {
        throw new Error("Agent not found");
      }

      if (action === "start") {
        console.log("Checking vector service health...");
        // Check vector service health before starting
        const isHealthy = await isVectorServiceHealthy();
        if (!isHealthy) {
          console.error("Vector service health check failed");
          throw new Error("Vector service is not available");
        }
        console.log("Vector service is healthy");

        await db.update(agents)
          .set({ 
            status: "researching",
            // Add metadata to track error details
            aiConfig: {
              ...agent.aiConfig,
              lastError: null,
              lastErrorTime: null
            }
          })
          .where(eq(agents.id, agentId));

        // Start the research process
        console.log("Starting research process for agent:", agentId);
        await startResearchProcess(agent);
      } else {
        await db.update(agents)
          .set({ status: "idle" })
          .where(eq(agents.id, agentId));
      }

      res.json({ status: "success" });
    } catch (error) {
      console.error("Toggle error:", error);
      // Update agent status to error if something goes wrong
      if (req.params.id) {
        try {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Setting agent ${req.params.id} to error state with message: ${errorMessage}`);

          await db.update(agents)
            .set({ 
              status: "error",
              aiConfig: {
                ...(await db.query.agents.findFirst({
                  where: eq(agents.id, parseInt(req.params.id)),
                }))?.aiConfig,
                lastError: errorMessage,
                lastErrorTime: new Date().toISOString()
              }
            })
            .where(eq(agents.id, parseInt(req.params.id)));
        } catch (updateError) {
          console.error("Failed to update agent status to error:", updateError);
        }
      }

      res.status(500).json({
        error: "Failed to toggle agent status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
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
  const topics = [];
  const commonTopics = ["technology", "business", "science", "health", "education", "blog", "content", "seo"];

  for (const topic of commonTopics) {
    if (description.toLowerCase().includes(topic)) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ["general"];
}

async function initializeAgent(agent: any) {
  try {
    if (!await isVectorServiceHealthy()) {
      throw new Error("Vector service not available");
    }

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

async function startResearchProcess(agent: any) {
  try {
    // Create initial blog post
    const post = await db.insert(blogPosts).values({
      title: "Generating content...",
      content: "The AI agent is researching and generating content...",
      wordCount: 0,
      agentId: agent.id,
      metadata: { status: "researching" },
    }).returning();

    // Start the research process
    const response = await fetch("http://localhost:5001/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "Latest trends in " + agent.aiConfig.contentGeneration.topicFocus.join(" and "),
        word_count: agent.aiConfig.maxTokens / 2,
        instructions: `Generate content in ${agent.aiConfig.contentGeneration.preferredStyle} style with SEO optimization`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Vector service error: ${await response.text()}`);
    }

    const { content, vector_id, research_data } = await response.json();

    // Store research data
    await db.insert(researchData).values({
      topic: agent.aiConfig.contentGeneration.topicFocus.join(" and "),
      content: research_data,
      source: "web_search",
      vectorId: vector_id,
      blogPostId: post[0].id,
    });

    // Update blog post with generated content
    await db.update(blogPosts)
      .set({
        content,
        title: generateTitle(content),
        wordCount: content.split(/\s+/).length,
        updatedAt: new Date(),
        metadata: { status: "completed" },
      })
      .where(eq(blogPosts.id, post[0].id));

    // Update agent status
    await db.update(agents)
      .set({ status: "idle" })
      .where(eq(agents.id, agent.id));

  } catch (error) {
    console.error("Research process failed:", error);
    await db.update(agents)
      .set({ status: "error" })
      .where(eq(agents.id, agent.id));
  }
}

function generateTitle(content: string): string {
  // Extract first sentence and use it as title
  const firstSentence = content.split(/[.!?]/, 1)[0];
  return firstSentence.length > 50
    ? firstSentence.substring(0, 47) + "..."
    : firstSentence;
}