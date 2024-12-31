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
      // Call our Python vector service that uses LangChain
      const response = await fetch("http://localhost:5001/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: topics.join(" and "),
          word_count: this.config.maxTokens,
          instructions: this.buildPromptInstructions(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Research failed: ${await response.text()}`);
      }

      const result = await response.json();

      return {
        title: this.extractTitle(result.content),
        content: result.content,
        wordCount: result.content.split(/\s+/).length,
        metadata: {
          status: "completed",
          generatedAt: new Date().toISOString(),
          topicFocus: topics,
          style: this.config.contentGeneration.style,
          generationTime: Date.now() - Date.now(), // Will be replaced with actual time
        },
      };
    } catch (error) {
      throw new Error(`Content generation failed: ${error}`);
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
