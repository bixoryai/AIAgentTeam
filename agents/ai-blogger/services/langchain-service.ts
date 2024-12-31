import { AIConfig } from "../config/agent-config";
import { type BlogPost } from "@db/schema";
import { ResearchService } from "./research-service";
import { promises as fs } from 'fs';

export class LangChainService {
  private config: AIConfig;
  private researchService: ResearchService;
  private baseUrl: string | null = null;

  constructor(config: AIConfig) {
    this.config = config;
    this.researchService = new ResearchService();
  }

  private async getVectorServiceUrl(): Promise<string> {
    if (this.baseUrl) return this.baseUrl;

    try {
      // First try environment variable
      if (process.env.VECTOR_SERVICE_URL) {
        this.baseUrl = process.env.VECTOR_SERVICE_URL;
        return this.baseUrl;
      }

      // Then try reading from the port file
      try {
        const port = await fs.readFile('/tmp/vector_service_port', 'utf-8');
        this.baseUrl = `http://localhost:${port.trim()}`;
        return this.baseUrl;
      } catch (err) {
        console.warn("Could not read vector service port file, using default port 5001");
        this.baseUrl = "http://localhost:5001";
        return this.baseUrl;
      }
    } catch (error) {
      console.error("Error getting vector service URL:", error);
      throw new Error("Could not determine vector service URL");
    }
  }

  async generateContent(topics: string[]): Promise<Partial<BlogPost>> {
    try {
      const topic = topics.join(" and ");
      const baseUrl = await this.getVectorServiceUrl();
      console.log("Attempting to connect to vector service at:", baseUrl);

      // Call our Python vector service that uses LangChain
      const response = await fetch(`${baseUrl}/api/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          word_count: this.config.maxTokens,
          instructions: this.buildPromptInstructions(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Vector service error:", errorText);
        throw new Error(`Research failed: ${errorText}`);
      }

      const result = await response.json();
      console.log("Vector service response:", result);

      if (!result.content) {
        throw new Error("No content received from research service");
      }

      return {
        title: this.extractTitle(result.content),
        content: result.content,
        wordCount: result.content.split(/\s+/).length,
        metadata: {
          status: "completed",
          generatedAt: new Date().toISOString(),
          topicFocus: topics,
          style: this.config.contentGeneration.style,
          vectorId: result.vector_id,
          researchData: result.research_data,
        },
      };
    } catch (error) {
      console.error("Content generation error:", error);
      throw error;
    }
  }

  private buildPromptInstructions(): string {
    const { style, tone, instructions, researchDepth } = this.config.contentGeneration;
    return `
      Style: Generate content in ${style} style
      Tone: Maintain a ${tone} tone throughout
      Research Depth: ${researchDepth}/5 - ${this.getResearchDepthDescription(researchDepth)}

      Additional Instructions:
      ${instructions}

      Requirements:
      1. Make the content SEO-friendly with proper headings
      2. Include relevant statistics and data
      3. Break down complex topics into digestible sections
      4. Add compelling introduction and conclusion
      5. Format in markdown
    `;
  }

  private getResearchDepthDescription(depth: number): string {
    const descriptions = {
      1: "Basic overview with main points",
      2: "Standard research with key facts",
      3: "Detailed analysis with supporting data",
      4: "Comprehensive research with multiple sources",
      5: "Expert-level analysis with extensive citations",
    };
    return descriptions[depth as keyof typeof descriptions] || descriptions[3];
  }

  private extractTitle(content: string): string {
    // Extract first sentence or h1 heading
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1];

    const firstSentence = content.split(/[.!?]/)[0];
    return firstSentence.length > 50
      ? firstSentence.substring(0, 47) + "..."
      : firstSentence;
  }
}