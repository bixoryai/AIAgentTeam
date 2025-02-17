import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { agents, blogPosts, researchData, templates } from "@db/schema";
import { eq } from "drizzle-orm";
import { spawn } from "child_process";
import path from "path";
import { z } from "zod";
import fs from "fs/promises";

// Add template schema validation
const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  parameters: z.object({
    wordCount: z.coerce.number().min(100).max(5000),
    style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
    tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
  }),
});

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
  provider: z.enum(["openai", "anthropic"]).default("openai"),
  providerSettings: z.object({
    openai: z.object({
      model: z.enum(["gpt-4o"]),
      temperature: z.number().min(0).max(2),
    }).optional(),
    anthropic: z.object({
      model: z.enum(["claude-3-5-sonnet-20241022"]),
      temperature: z.number().min(0).max(1),
    }).optional(),
  }).optional(),
});

// Add new schema for content generation
const generateContentSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  wordCount: z.number().min(100).max(5000),
  style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
  tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
});

// Global vector service process reference
let pythonProcess: ReturnType<typeof spawn> | null = null;

// Cleanup function for vector service
function cleanupVectorService() {
  if (pythonProcess && pythonProcess.pid !== undefined) {
    console.log("Cleaning up existing vector service process...");
    try {
      process.kill(-pythonProcess.pid);
    } catch (error) {
      console.error("Error cleaning up vector service:", error);
    }
    pythonProcess = null;
  }
}

// Initialize Python vector service
function startVectorService() {
  if (pythonProcess) {
    console.log("Vector service already running");
    return;
  }

  console.log("Starting vector service...");
  cleanupVectorService(); // Ensure cleanup before starting

  pythonProcess = spawn("python3", [path.join(process.cwd(), "server", "vector_service.py")], {
    detached: true,
    stdio: 'pipe'
  });

  pythonProcess.stdout?.on("data", (data: Buffer) => {
    console.log(`Vector service output: ${data}`);
  });

  pythonProcess.stderr?.on("data", (data: Buffer) => {
    console.error(`Vector service error: ${data}`);
  });

  pythonProcess.on("close", (code: number) => {
    console.log(`Vector service exited with code ${code}`);
    pythonProcess = null;
  });

  // Ensure cleanup on process exit
  process.on('exit', cleanupVectorService);
  process.on('SIGINT', cleanupVectorService);
  process.on('SIGTERM', cleanupVectorService);
}

// Start vector service immediately
startVectorService();

// Check if vector service is healthy
async function isVectorServiceHealthy() {
  try {
    console.log("Checking vector service health...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch("http://localhost:5001/health", {
      signal: controller.signal,
      headers: { "Accept": "application/json" }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("Vector service health check failed with status:", response.status);
      return false;
    }

    const health = await response.json();
    console.log("Vector service health check response:", health);

    // Verify all required services are connected
    if (!health.services?.vector_store || !health.services?.llm) {
      console.error("Vector service is missing required services:", health.services);
      return false;
    }

    return true;
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
        provider: data.provider,
        providerSettings: data.providerSettings || {
          openai: {
            model: "gpt-4o",
            temperature: 0.7,
          }
        },
        maxTokens: Math.max(data.contentGeneration.wordCountMax * 2, 2000),
        researchEnabled: true,
        contentGeneration: {
          ...data.contentGeneration,
        },
      };

      const result = await db.insert(agents).values({
        name: data.name,
        description: data.description,
        type: "content",
        status: "ready",
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
          const agentId = parseInt(req.params.id);
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`Setting agent ${agentId} to error state with message: ${errorMessage}`);

          // Get the current agent to preserve config
          const agent = await db.query.agents.findFirst({
            where: eq(agents.id, agentId),
          });

          if (agent) {
            await db.update(agents)
              .set({
                status: "error",
                aiConfig: {
                  ...agent.aiConfig,
                  lastError: errorMessage,
                  lastErrorTime: new Date().toISOString()
                }
              })
              .where(eq(agents.id, agentId));
          }
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

  // Update the content generation mutation handler
  app.post("/api/agents/:id/generate", async (req, res) => {
    const startTime = Date.now();
    try {
      const data = generateContentSchema.parse(req.body);
      const agentId = parseInt(req.params.id);

      console.log(`Starting content generation for agent ${agentId} with topic: ${data.topic}`);

      // Get agent configuration
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });

      if (!agent) {
        console.error(`Agent ${agentId} not found`);
        res.status(404).send("Agent not found");
        return;
      }

      // First update agent status to researching
      await db.update(agents)
        .set({
          status: "researching",
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      // Create initial blog post entry
      const [post] = await db.insert(blogPosts).values({
        title: "Researching and generating content...",
        content: "The AI agent is currently researching and gathering information...",
        wordCount: 0,
        agentId: agent.id,
        metadata: {
          status: "researching",
          generatedAt: new Date().toISOString()
        },
      }).returning();

      console.log(`Created initial blog post ${post.id} for agent ${agentId}`);

      // Only respond after status is updated but before starting generation
      res.json({ status: "success" });

      // Now start the actual generation process
      try {
        console.log('Making request to vector service...');
        const response = await fetch("http://localhost:5001/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: data.topic,
            word_count: data.wordCount,
            instructions: `
              Generate content about ${data.topic} in ${data.style} style with a ${data.tone} tone.
              Focus on providing valuable insights about AI and technology trends.
              Include specific points about:
              - Current state and developments
              - Future implications and predictions
              - Industry impact and adoption
              - Technical considerations
              - Practical applications
            `,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Vector service error for agent ${agentId}:`, errorText);
          throw new Error(errorText);
        }

        const result = await response.json();
        console.log(`Successfully received response from vector service for post ${post.id}`);

        // Update agent status to generating
        await db.update(agents)
          .set({
            status: "generating",
            updatedAt: new Date(),
          })
          .where(eq(agents.id, agentId));

        // Generate title from topic
        const title = `The Complete Guide to ${data.topic.split(/\s+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ")}`;

        // Update blog post with generated content
        await db.update(blogPosts)
          .set({
            title,
            content: result.content,
            wordCount: result.content.split(/\s+/).length,
            updatedAt: new Date(),
            metadata: {
              status: "completed",
              generatedAt: new Date().toISOString(),
              topicFocus: [data.topic],
              style: data.style,
              generationTime: (Date.now() - startTime) / 1000,
            },
          })
          .where(eq(blogPosts.id, post.id));

        // Store research data
        if (result.research_data) {
          await db.insert(researchData).values({
            topic: data.topic,
            content: result.research_data,
            source: "web_search",
            vectorId: result.vector_id,
            blogPostId: post.id,
          });
        }

        // Update analytics
        const currentAnalytics = agent.analyticsMetadata;
        const generationTime = (Date.now() - startTime) / 1000; // Convert to seconds
        const wordCount = result.content.split(/\s+/).length;

        const newTotalPosts = currentAnalytics.totalPosts + 1;
        const newTotalWordCount = currentAnalytics.totalWordCount + wordCount;
        const newAverageWordCount = Math.round(newTotalWordCount / newTotalPosts);
        const newAverageGenerationTime = (
          (currentAnalytics.averageGenerationTime * currentAnalytics.totalPosts + generationTime) /
          newTotalPosts
        );

        // Update topic distribution
        const topicDistribution = { ...currentAnalytics.topicDistribution };
        topicDistribution[data.topic] = (topicDistribution[data.topic] || 0) + 1;

        // First update analytics
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
          .where(eq(agents.id, agentId));

        // Finally update agent status to ready
        await db.update(agents)
          .set({
            status: "ready",
            updatedAt: new Date(),
            aiConfig: {
              ...agent.aiConfig,
              lastError: null,
              lastErrorTime: null,
              lastUpdateTime: new Date().toISOString()
            }
          })
          .where(eq(agents.id, agentId));

        console.log(`Successfully completed content generation for agent ${agentId}`);

      } catch (error) {
        console.error(`Content generation failed for agent ${agentId}:`, error);

        // Update both agent and blog post status to error
        await db.update(agents)
          .set({
            status: "error",
            updatedAt: new Date(),
            aiConfig: {
              ...agent.aiConfig,
              lastError: error instanceof Error ? error.message : "Unknown error",
              lastErrorTime: new Date().toISOString()
            }
          })
          .where(eq(agents.id, agentId));

        await db.update(blogPosts)
          .set({
            metadata: {
              status: "error",
              error: error instanceof Error ? error.message : "Unknown error",
              errorTime: new Date().toISOString()
            }
          })
          .where(eq(blogPosts.id, post.id));

        throw error;
      }

    } catch (error) {
      console.error("Generate content error:", error);
      res.status(500).json({
        error: "Failed to generate content",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });


  // Add optimization endpoint right after the research endpoint
  app.post("/api/agents/:id/optimize", async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);

      // Get the agent
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });

      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }

      // Get the latest blog post
      const [latestPost] = await db.query.blogPosts.findMany({
        where: eq(blogPosts.agentId, agentId),
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
        limit: 1,
      });

      if (!latestPost) {
        res.status(400).send("No content available to optimize");
        return;
      }

      // Update agent status to optimizing
      await db.update(agents)
        .set({
          status: "optimizing",
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      // Start optimization process (non-blocking)
      fetch("http://localhost:5001/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: latestPost.content,
          style: agent.aiConfig.contentGeneration.style,
          tone: agent.aiConfig.contentGeneration.tone,
        }),
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }

        const result = await response.json();

        // Update the blog post with optimized content
        await db.update(blogPosts)
          .set({
            content: result.optimized_content,
            metadata: {
              ...latestPost.metadata,
              optimized: true,
              optimizedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(blogPosts.id, latestPost.id));

        // Update agent status back to ready
        await db.update(agents)
          .set({
            status: "ready",
            updatedAt: new Date(),
          })
          .where(eq(agents.id, agentId));

      }).catch(async (error) => {
        console.error("Optimization failed:", error);

        // Update agent status to error
        await db.update(agents)
          .set({
            status: "error",
            aiConfig: {
              ...agent.aiConfig,
              lastError: error.message,
              lastErrorTime: new Date().toISOString()
            }
          })
          .where(eq(agents.id, agentId));
      });

      // Respond immediately while optimization runs in background
      res.json({ status: "Optimization started" });

    } catch (error) {
      console.error("Failed to start optimization:", error);
      res.status(500).json({ error: "Failed to start optimization" });
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

  // Add template routes
  app.post("/api/agents/:id/templates", async (req, res) => {
    try {
      const data = templateSchema.parse(req.body);
      const agentId = parseInt(req.params.id);

      // Create the template
      const [template] = await db.insert(templates)
        .values({
          name: data.name,
          description: data.description,
          agentId,
          parameters: data.parameters,
        })
        .returning();

      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Failed to create template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.get("/api/agents/:id/templates", async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const templatesList = await db.query.templates.findMany({
        where: eq(templates.agentId, agentId),
        orderBy: (templates, { desc }) => [desc(templates.createdAt)],
      });

      res.json(templatesList);
    } catch (error) {
      console.error("Failed to fetch templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  // Add delete template endpoint
  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      await db.delete(templates).where(eq(templates.id, templateId));
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete template:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Add edit template endpoint
  app.put("/api/templates/:id", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const data = templateSchema.parse(req.body);

      const [updatedTemplate] = await db.update(templates)
        .set({
          name: data.name,
          description: data.description,
          parameters: data.parameters,
          updatedAt: new Date(),
        })
        .where(eq(templates.id, templateId))
        .returning();

      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      console.error("Failed to update template:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Add new route for topic suggestions
  app.post("/api/agents/:id/suggest-topics", async (req, res) => {
    try {
      // Get agent details to use its style
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, parseInt(req.params.id)),
      });

      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }

      const response = await fetch("http://localhost:5001/api/suggest-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed_topic: req.body.seed_topic,
          style: agent.aiConfig.contentGeneration.style || req.body.style || "balanced",
          count: req.body.count || 5,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const suggestions = await response.json();
      res.json(suggestions);
    } catch (error) {
      console.error("Failed to get topic suggestions:", error);
      res.status(500).json({ error: "Failed to get topic suggestions" });
    }
  });

  // Add new route for agent registration
  app.post("/api/agents/:id/register", async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);

      // Get the agent
      const agent = await db.query.agents.findFirst({
        where: eq(agents.id, agentId),
      });

      if (!agent) {
        res.status(404).send("Agent not found");
        return;
      }

      // Update agent registration status
      await db.update(agents)
        .set({
          isRegistered: true,
          registrationDate: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agentId));

      res.json({ status: "success" });
    } catch (error) {
      console.error("Failed to register agent:", error);
      res.status(500).json({ error: "Failed to register agent" });
    }
  });

  // Add new delete blog post endpoint
  app.delete("/api/posts/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);

      // Delete associated research data first
      await db.delete(researchData)
        .where(eq(researchData.blogPostId, postId));

      // Then delete the blog post
      await db.delete(blogPosts)
        .where(eq(blogPosts.id, postId));

      res.json({ status: "success" });
    } catch (error) {
      console.error("Failed to delete blog post:", error);
      res.status(500).json({ error: "Failed to delete blog post" });
    }
  });

  // Add download endpoint for Word document
  app.get("/api/posts/:id/download", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);

      // Get the blog post
      const post = await db.query.blogPosts.findFirst({
        where: eq(blogPosts.id, postId),
      });

      if (!post) {
        res.status(404).send("Blog post not found");
        return;
      }

      // Convert markdown content to docx format
      const docx = await fetch("http://localhost:5001/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: post.title,
          content: post.content,
        }),
      });

      if (!docx.ok) {
        throw new Error("Failed to convert blog post to Word format");
      }

      const buffer = await docx.arrayBuffer();

      // Send the Word document
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${post.title.replace(/[^a-z0-9]/gi, '_')}.docx"`);
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("Failed to download blog post:", error);
      res.status(500).json({ error: "Failed to download blog post" });
    }
  });

  // Reset agent state
  app.post("/api/agents/:id/reset", async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);

      console.log(`Resetting agent ${agentId} state...`);

      // Update directly to ready state
      await db.update(agents)
        .set({
          status: "ready",
          updatedAt: new Date(),
          aiConfig: {
            model: "gpt-4",
            temperature: 0.7,
            maxTokens: 2000,
            researchEnabled: true,
            contentGeneration: {
              style: "balanced",
              tone: "professional",
              instructions: "",
              researchDepth: 3,
              topics: [],
              wordCountMin: 1000,
              wordCountMax: 2000
            },
            lastError: null,
            lastErrorTime: null
          }
        })
        .where(eq(agents.id, agentId));

      console.log(`Agent ${agentId} reset successful`);
      res.json({ status: "success" });
    } catch (error) {
      console.error("Reset agent failed:", error);
      res.status(500).json({ error: "Failed to reset agent" });
    }
  });

  app.get("/api/theme", async (_req, res) => { //Added Theme API endpoint
    try {
      const themeFile = await fs.readFile(path.join(process.cwd(), "theme.json"), "utf-8");
      res.json(JSON.parse(themeFile));
    } catch (error) {
      console.error("Failed to read theme:", error);
      res.status(500).json({ error: "Failed to read theme" });
    }
  });

  app.post("/api/theme", async (req, res) => { //Added Theme API endpoint
    try {
      await fs.writeFile(
        path.join(process.cwd(), "theme.json"),
        JSON.stringify(req.body, null, 2)
      );
      res.json(req.body);
    } catch (error) {
      console.error("Failed to update theme:", error);
      res.status(500).json({ error: "Failed to update theme" });
    }
  });

  async function initializeAgent(agent: any) {
    try {
      console.log(`Initializing agent ${agent.id}...`);

      // First update to initializing state
      await db.update(agents)
        .set({
          status: "initializing",
          updatedAt: new Date(),
        })
        .where(eq(agents.id, agent.id));

      // Add retries for vector service health check
      let isHealthy = false;
      let retryCount = 0;
      const maxRetries = 3;

      while (!isHealthy && retryCount < maxRetries) {
        try {
          console.log(`Attempt ${retryCount + 1} to check vector service health...`);
          isHealthy = await isVectorServiceHealthy();
          if (!isHealthy) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`Waiting 2 seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else {
            console.log('Vector service health check passed');
          }
        } catch (error) {
          console.error(`Health check attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!isHealthy) {
        console.error(`Vector service health check failed after ${maxRetries} attempts`);
        throw new Error("Vector service not available after retries");
      }

      // Initialize the agent with ready status
      console.log(`Setting agent ${agent.id} to ready state...`);
      await db.update(agents)
        .set({
          status: "ready",
          updatedAt: new Date(),
          aiConfig: {
            ...agent.aiConfig,
            lastError: null,
            lastErrorTime: null
          }
        })
        .where(eq(agents.id, agent.id));

      console.log(`Agent ${agent.id} initialized successfully`);

    } catch (error) {
      console.error(`Agent ${agent.id} initialization failed:`, error);
      // Update agent status to error with details
      await db.update(agents)
        .set({
          status: "error",
          updatedAt: new Date(),
          aiConfig: {
            ...agent.aiConfig,
            lastError: error instanceof Error ? error.message : "Unknown initialization error",
            lastErrorTime: new Date().toISOString()
          }
        })
        .where(eq(agents.id, agent.id));

      throw error;
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
    for (const topic of agent.aiConfig.contentGeneration.topics) {
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
      .where(eq(agents.id,agent.id));
  }

  async function startResearchProcess(agent: any) {    const startTime = Date.now();
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
      const title = generateTitle(content, topic);      console.log(`Generated title for agent ${agent.id}: ${title}`);

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
              (currentAnalytics.totalPosts + 1)            ),
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

  app.get("/api/health", async (_req, res) => {
    try {
      // Check vector service health
      let vectorServiceStatus = "disconnected";
      try {
        const response = await fetch("http://localhost:5001/health", {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        vectorServiceStatus = response.ok ? "connected" : "disconnected";
      } catch (error) {
        console.error("Vector service health check failed:", error);
      }

      // Check database health
      let databaseStatus = "disconnected";
      try {
        await db.query.agents.findFirst();
        databaseStatus = "connected";
      } catch (error) {
        console.error("Database health check failed:", error);
      }

      // Send health status
      res.json({
        services: {
          vector_service: vectorServiceStatus,
          database: databaseStatus,
          llm: process.env.OPENAI_API_KEY ? "connected" : "disconnected"
        }
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({ error: "Failed to check system health" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}