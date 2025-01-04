// Base interfaces for agent sections

export interface AgentMetadata {
  version: string;
  lastUpdated: string;
  capabilities: string[];
  configurationOptions: Record<string, any>;
}

export interface AgentInfoSectionProps {
  name: string;
  description: string;
  metadata: AgentMetadata;
  status: string;
  isRegistered: boolean;
  onRegister: () => void;
}

export interface UserInteractiveSectionProps {
  onAction: (action: string, params: any) => void;
  supportedActions: string[];
  templates?: {
    id: string;
    name: string;
    description: string;
    parameters: Record<string, any>;
  }[];
  favorites?: {
    id: string;
    name: string;
    type: string;
  }[];
  agentId: number;  // Added this property
}

export interface AgentOutputSectionProps {
  outputs: any[];
  onOutputAction: (action: string, outputId: string) => void;
  supportedFormats: string[];
  filterOptions?: {
    key: string;
    label: string;
    options: string[];
  }[];
  sortOptions?: {
    key: string;
    label: string;
  }[];
}