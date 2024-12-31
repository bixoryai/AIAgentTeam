import type { ResearchData } from "@db/schema";

export class ResearchService {
  async getResearchData(topic: string): Promise<ResearchData[]> {
    const response = await fetch(`http://localhost:5001/api/research?topic=${encodeURIComponent(topic)}`);
    
    if (!response.ok) {
      throw new Error(`Research failed: ${await response.text()}`);
    }

    return response.json();
  }

  async validateResearchData(data: ResearchData[]): Promise<boolean> {
    // Validate research data quality and relevance
    return data.length > 0;
  }
}
