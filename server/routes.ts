import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { agents, blogPosts, researchData } from "@db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import path from "path";
import { z } from "zod";

// Input validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  contentGeneration: z.object({
    topics: z.array(z.string()).min(1, "At least one topic is required"),
    wordCountMin: z.number().min(100).max(5000),
    wordCountMax: z.number().min(100).max(5000),
    style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
    tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
    instructions: z.string(),
    researchDepth: z.number().min(1).max(5),
  }),
});

// Add new schema for content generation
const generateContentSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  wordCount: z.number().min(100).max(5000),
  style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
  tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
});

// Initialize Python vector service
const pythonProcess = spawn("python3", [path.join(process.cwd(), "server", "vector_service.py")]);

pythonProcess.stdout.on("data", (data: Buffer) => {
  console.log(`Vector service output: ${data}`);
});

pythonProcess.stderr.on("data", (data: Buffer) => {
  console.error(`Vector service error: ${data}`);
});

pythonProcess.on("close", (code: number) => {
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
        maxTokens: Math.max(data.contentGeneration.wordCountMax * 2, 2000), // Ensure enough tokens for generation
        researchEnabled: true,
        contentGeneration: {
          ...data.contentGeneration,
        },
      };

      const result = await db.insert(agents).values({
        name: data.name,
        description: data.description,
        type: "content",
        status: "initializing",
        aiConfig,
        analyticsMetadata: {
          totalPosts: 0,
          totalWordCount: 0,
          averageWordCount: 0,
          successRate: 100,
          averageGenerationTime: 0,
          topicDistribution: {},
          lastUpdateTime: new Date().toISOString(),
        },
      }).returning();

      // Start agent initialization
      await initializeAgent(result[0]);

      res.json(result[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Failed to create agent:", error);
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
    try {
      const result = await db.query.agents.findMany();
      res.json(result);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const result = await db.query.agents.findFirst({
        where: eq(agents.id, parseInt(req.params.id)),
      });

      if (!result) {
        res.status(404).send("Agent not found");
        return;
      }

      res.json(result);
    } catch (error) {
      console.error("Failed to fetch agent:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // Get agent's blog posts
  app.get("/api/agents/:id/posts", async (req, res) => {
    try {
      const result = await db.query.blogPosts.findMany({
        where: eq(blogPosts.agentId, parseInt(req.params.id)),
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      });

      res.json(result);
    } catch (error) {
      console.error("Failed to fetch blog posts:", error);
      res.status(500).json({ error: "Failed to fetch blog posts" });
    }
  });

  // Add new route for content generation
  app.post("/api/agents/:id/generate", async (req, res) => {
    try {
      const data = generateContentSchema.parse(req.body);
      const agentId = parseInt(req.params.id);

      // Get agent configuration
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });

      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }

      // Update agent configuration with user preferences
      await db.update(agents)
        .set({
          status: "researching",
          aiConfig: {
            ...agent.aiConfig,
            contentGeneration: {
              ...agent.aiConfig.contentGeneration,
              topics: [data.topic],
              wordCountMin: data.wordCount,
              wordCountMax: data.wordCount,
              style: data.style,
              tone: data.tone,
            },
          },
        })
        .where(eq(agents.id, agentId));

      // Start the research process with the user-provided topic
      await startResearchProcess({
        ...agent,
        aiConfig: {
          ...agent.aiConfig,
          contentGeneration: {
            ...agent.aiConfig.contentGeneration,
            topics: [data.topic], // Use the topic from the dialog
          },
        },
      });

      res.json({ status: "success" });
    } catch (error) {
      console.error("Generate content error:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      res.status(500).json({
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
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

async function updateAgentAnalytics(agent: any, post: any, startTime: number) {
  const generationTime = (Date.now() - startTime) / 1000; // Convert to seconds
  const currentAnalytics = agent.analyticsMetadata;

  // Calculate new analytics
  const newTotalPosts = currentAnalytics.totalPosts + 1;
  const newTotalWordCount = currentAnalytics.totalWordCount + post.wordCount;
  const newAverageWordCount = Math.round(newTotalWordCount / newTotalPosts);
  const newAverageGenerationTime = (
    (currentAnalytics.averageGenerationTime * currentAnalytics.totalPosts + generationTime) /
    newTotalPosts
  );

  // Update topic distribution
  const topicDistribution = { ...currentAnalytics.topicDistribution };
  for (const topic of agent.aiConfig.contentGeneration.topicFocus) {
    topicDistribution[topic] = (topicDistribution[topic] || 0) + 1;
  }

  // Update analytics in database
  await db.update(agents)
    .set({
      analyticsMetadata: {
        totalPosts: newTotalPosts,
        totalWordCount: newTotalWordCount,
        averageWordCount: newAverageWordCount,
        successRate: Math.round((currentAnalytics.successRate * (newTotalPosts - 1) + 100) / newTotalPosts),
        averageGenerationTime: Number(newAverageGenerationTime.toFixed(2)),
        topicDistribution,
        lastUpdateTime: new Date().toISOString(),
      },
    })
    .where(eq(agents.id, agent.id));
}

async function startResearchProcess(agent: any) {
  const startTime = Date.now();
  try {
    if (!agent.aiConfig?.contentGeneration) {
      throw new Error("Agent configuration is missing contentGeneration settings");
    }

    // Update agent status to researching
    await db.update(agents)
      .set({
        status: "researching",
        aiConfig: {
          ...agent.aiConfig,
          lastError: null,
          lastErrorTime: null
        }
      })
      .where(eq(agents.id, agent.id));

    // Create initial blog post
    const post = await db.insert(blogPosts).values({
      title: "Researching and generating content...",
      content: "The AI agent is currently researching and generating content...",
      wordCount: 0,
      agentId: agent.id,
      metadata: { status: "researching" },
    }).returning();

    // Get the exact topic provided by the user
    const topic = agent.aiConfig.contentGeneration.topics[0];
    console.log(`Starting research process for agent ${agent.id} with topic: ${topic}`);

    const response = await fetch("http://localhost:5001/api/research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        word_count: agent.aiConfig.maxTokens / 2,
        instructions: `
          Generate content in ${agent.aiConfig.contentGeneration.style} style.
          Focus on providing valuable insights and actionable information.
          Ensure content is SEO-optimized and engaging.
          Include relevant statistics and data where applicable.
          Structure the content with proper headings and sections.
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Vector service error response for agent ${agent.id}:`, errorText);
      throw new Error(`Content generation failed: ${errorText}`);
    }

    const { content, vector_id, research_data } = await response.json();
    console.log(`Successfully generated content for agent ${agent.id}. Vector ID: ${vector_id}`);

    // Store research data
    await db.insert(researchData).values({
      topic,
      content: research_data,
      source: "web_search",
      vectorId: vector_id,
      blogPostId: post[0].id,
    });

    // Generate title from the topic and content
    const title = generateTitle(content, topic);
    console.log(`Generated title for agent ${agent.id}: ${title}`);

    // Update blog post with generated content
    await db.update(blogPosts)
      .set({
        title,
        content,
        wordCount: content.split(/\s+/).length,
        updatedAt: new Date(),
        metadata: {
          status: "completed",
          generatedAt: new Date().toISOString(),
          topicFocus: [topic],
          style: agent.aiConfig.contentGeneration.style
        },
      })
      .where(eq(blogPosts.id, post[0].id));

    // Update agent status to idle
    await db.update(agents)
      .set({
        status: "idle",
        aiConfig: {
          ...agent.aiConfig,
          lastError: null,
          lastErrorTime: null,
        }
      })
      .where(eq(agents.id, agent.id));

    // Update analytics
    await updateAgentAnalytics(agent, post[0], startTime);

    console.log(`Content generation completed successfully for agent ${agent.id}`);

  } catch (error) {
    console.error(`Research process failed for agent ${agent.id}:`, error);

    // Update analytics with error
    const currentAnalytics = agent.analyticsMetadata;
    await db.update(agents)
      .set({
        status: "error",
        aiConfig: {
          ...agent.aiConfig,
          lastError: error instanceof Error ? error.message : "Unknown error occurred",
          lastErrorTime: new Date().toISOString(),
        },
        analyticsMetadata: {
          ...currentAnalytics,
          successRate: Math.round(
            (currentAnalytics.successRate * currentAnalytics.totalPosts) /
            (currentAnalytics.totalPosts + 1)
          ),
          lastUpdateTime: new Date().toISOString(),
        },
      })
      .where(eq(agents.id, agent.id));

    throw error;
  }
}

function generateTitle(content: string, topic: string): string {
  // First try to find an h1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match && h1Match[1].length <= 100) {
    return h1Match[1];
  }

  // If no suitable h1 found, generate a title from the topic
  const words = topic.split(/\s+/);
  const capitalizedWords = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );

  let title = `The Complete Guide to ${capitalizedWords.join(" ")}`;

  // Ensure the title isn't too long
  if (title.length > 100) {
    title = title.substring(0, 97) + "...";
  }

  return title;
}

const toggleAgentSchema = z.object({
  action: z.enum(["start", "pause"])
});