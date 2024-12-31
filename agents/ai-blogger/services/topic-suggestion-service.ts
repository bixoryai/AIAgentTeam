import type { AIConfig } from "../config/agent-config";
import { type TopicSuggestion } from "@db/schema";

export class TopicSuggestionService {
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  async suggestTopics(seedTopic?: string): Promise<TopicSuggestion[]> {
    try {
      const response = await fetch("http://localhost:5001/api/suggest-topics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seed_topic: seedTopic,
          style: this.config.contentGeneration.style,
          count: 5, // Number of suggestions to generate
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic suggestion failed: ${await response.text()}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`Failed to suggest topics: ${error}`);
    }
  }

  async validateTopic(topic: string): Promise<{
    isValid: boolean;
    feedback?: string;
  }> {
    try {
      const response = await fetch("http://localhost:5001/api/validate-topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          style: this.config.contentGeneration.style,
        }),
      });

      if (!response.ok) {
        throw new Error(`Topic validation failed: ${await response.text()}`);
      }

      return response.json();
    } catch (error) {
      throw new Error(`Failed to validate topic: ${error}`);
    }
  }
}
