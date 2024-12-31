import { AIConfig } from "../config/agent-config";
import { type BlogPost } from "@db/schema";
import { ResearchService } from "./research-service";

export class LangChainService {
  private config: AIConfig;
  private researchService: ResearchService;

  constructor(config: AIConfig) {
    this.config = config;
    this.researchService = new ResearchService();
  }

  async generateContent(topics: string[]): Promise<Partial<BlogPost>> {
    try {
      const topic = topics.join(" and ");
      // Call our Python vector service that uses LangChain
      const response = await fetch("http://localhost:5001/api/research", {
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
        throw new Error(`Research failed: ${errorText}`);
      }

      const result = await response.json();

      if (!result.content) {
        throw new Error("No content received from research service");
      }

      return {
        title: this.generateTitle(topic, result.content),
        content: result.content,
        wordCount: result.content.split(/\s+/).length,
        metadata: {
          status: "completed",
          generatedAt: new Date().toISOString(),
          topicFocus: topics,
          style: this.config.contentGeneration.style,
          generationTime: Date.now(),
          vectorId: result.vector_id,
        },
      };
    } catch (error) {
      console.error("Content generation failed:", error);
      throw new Error(error instanceof Error ? error.message : "Unknown error occurred");
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

  private generateTitle(topic: string, content: string): string {
    // First, try to find an h1 heading in the content
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
}