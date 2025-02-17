import { type LLMProvider, llmProviderSchema, providerSettingsSchema } from "@db/schema";

interface ProviderInfo {
  id: LLMProvider;
  name: string;
  description: string;
  models: {
    id: string;
    name: string;
    description: string;
    maxTokens: number;
  }[];
}

const providerInfo: ProviderInfo[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "Advanced language model with strong general capabilities",
    models: [
      {
        id: "gpt-4o",
        name: "gpt-4o",
        description: "Latest and most capable OpenAI model",
        maxTokens: 4096,
      },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Powerful model with enhanced analysis capabilities",
    models: [
      {
        id: "claude-3-5-sonnet-20241022",
        name: "claude-3-5-sonnet-20241022",
        description: "Latest Anthropic model with improved capabilities",
        maxTokens: 4096,
      },
    ],
  },
];

export function useLLMProvider() {
  const getProviderInfo = (providerId: LLMProvider) => {
    return providerInfo.find(p => p.id === providerId);
  };

  const getModelInfo = (providerId: LLMProvider, modelId: string) => {
    const provider = getProviderInfo(providerId);
    return provider?.models.find(m => m.id === modelId);
  };

  const getDefaultSettings = (providerId: LLMProvider) => {
    switch (providerId) {
      case "openai":
        return {
          openai: {
            model: "gpt-4o",
            temperature: 0.7,
          },
        };
      case "anthropic":
        return {
          anthropic: {
            model: "claude-3-5-sonnet-20241022",
            temperature: 0.7,
          },
        };
      default:
        return {};
    }
  };

  return {
    providers: providerInfo,
    getProviderInfo,
    getModelInfo,
    getDefaultSettings,
    llmProviderSchema,
    providerSettingsSchema,
  };
}