import type { AIConfig } from "../config/agent-config";
import type { BlogPost } from "@db/schema";
import { LangChainService } from "../services/langchain-service";

export class ContentGenerationHandler {
  private config: AIConfig;
  private langchainService: LangChainService;
  private currentOperation?: string;
  private lastError?: string;

  constructor(config: AIConfig) {
    this.config = config;
    this.langchainService = new LangChainService(config);
  }

  async generateContent(topic: string): Promise<BlogPost> {
    try {
      console.log("[ContentHandler] Starting content generation for topic:", topic);
      this.currentOperation = "Generating content";
      const topics = Array.isArray(topic) ? topic : [topic];

      console.log("[ContentHandler] Calling LangChain service with topics:", topics);
      const content = await this.langchainService.generateContent(topics);
      console.log("[ContentHandler] Content generation successful:", content ? "Content received" : "No content");

      if (!content) {
        throw new Error("Failed to generate content - no content received");
      }

      return content as BlogPost;
    } catch (error) {
      console.error("[ContentHandler] Content generation failed:", error);
      this.lastError = error instanceof Error ? error.message : "Unknown error";
      throw error;
    } finally {
      this.currentOperation = undefined;
    }
  }

  async updateConfig(newConfig: Partial<AIConfig>) {
    console.log("[ContentHandler] Updating config:", newConfig);
    this.config = {
      ...this.config,
      ...newConfig,
    };
    this.langchainService = new LangChainService(this.config);
  }

  getStatus(): {
    isReady: boolean;
    lastError?: string;
    currentOperation?: string;
  } {
    return {
      isReady: !this.currentOperation,
      lastError: this.lastError,
      currentOperation: this.currentOperation,
    };
  }
}

export const createContentHandler = (config: AIConfig) => {
  return new ContentGenerationHandler(config);
};