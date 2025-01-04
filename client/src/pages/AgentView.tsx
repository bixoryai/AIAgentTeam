import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Agent, BlogPost } from "@db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import BlogPostView from "@/components/BlogPostView";
import { useToast } from "@/hooks/use-toast";
import { useLLMProvider } from "@/hooks/use-llm-provider";
import { ChevronLeft, AlertCircle } from "lucide-react";
import AgentInfoSection from "@/components/agent-sections/AgentInfoSection";
import UserInteractiveSection from "@/components/agent-sections/UserInteractiveSection";
import AgentOutputSection from "@/components/agent-sections/AgentOutputSection";
import type { AgentMetadata } from "@/components/agent-sections/types";

export default function AgentView() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const { getProviderInfo, getModelInfo } = useLLMProvider();

  // Fetch agent data
  const { data: agent } = useQuery<Agent>({
    queryKey: [`/api/agents/${id}`],
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (data) => {
      if (!data) return false;
      return ["researching", "generating", "initializing"].includes(data.status) ? 1000 : false;
    },
  });

  // Fetch posts data
  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: [`/api/agents/${id}/posts`],
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (data) => {
      if (!agent) return false;
      return ["researching", "generating", "initializing"].includes(agent.status) ? 1000 : false;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/agents/${id}/register`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: "Success",
        description: "Agent has been registered successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle user interactive section actions
  const handleAction = async (action: string, params: any) => {
    switch (action) {
      case 'generate':
        // Implement content generation logic
        break;
      case 'useTemplate':
        // Implement template usage logic
        break;
      case 'useFavorite':
        // Implement favorite usage logic
        break;
      default:
        console.warn('Unknown action:', action);
    }
  };

  // Handle output section actions
  const handleOutputAction = (action: string, outputId: string) => {
    switch (action) {
      case 'view':
        const post = posts.find(p => p.id.toString() === outputId);
        if (post) setSelectedPost(post);
        break;
      case 'download':
        // Implement download logic
        break;
      case 'delete':
        // Implement delete logic
        break;
    }
  };

  if (!agent) return null;

  // Transform agent data into metadata format
  const agentMetadata: AgentMetadata = {
    version: "1.0.0",
    lastUpdated: agent.aiConfig?.lastUpdateTime || new Date().toISOString(),
    capabilities: [
      "Content Generation",
      "Topic Research",
      "SEO Optimization"
    ],
    configurationOptions: {
      provider: agent.aiConfig?.provider || "openai",
      model: agent.aiConfig?.providerSettings?.[agent.aiConfig.provider]?.model,
      temperature: agent.aiConfig?.providerSettings?.[agent.aiConfig.provider]?.temperature,
      researchEnabled: agent.aiConfig?.researchEnabled || false,
      maxTokens: agent.aiConfig?.maxTokens || 4000,
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Link href="/agents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to All Agents
      </Link>

      {/* Agent Info Section */}
      <AgentInfoSection
        name={agent.name}
        description={agent.description}
        metadata={agentMetadata}
        status={agent.status}
        isRegistered={agent.isRegistered}
        onRegister={() => registerMutation.mutate()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Interactive Section */}
        <UserInteractiveSection
          onAction={handleAction}
          supportedActions={["generate", "research", "optimize"]}
          templates={[
            {
              id: "blog-post",
              name: "Blog Post",
              description: "Generate a well-structured blog post",
              parameters: {
                wordCount: 1000,
                style: "balanced",
                tone: "professional"
              }
            }
          ]}
          favorites={[
            {
              id: "tech-trends",
              name: "Tech Trends",
              type: "template"
            }
          ]}
        />

        {/* Agent Output Section */}
        <AgentOutputSection
          outputs={posts.map(post => ({
            id: post.id.toString(),
            title: post.title,
            description: `${post.content.substring(0, 100)}...`,
            format: "blog-post",
            metadata: post.metadata
          }))}
          onOutputAction={handleOutputAction}
          supportedFormats={["blog-post", "summary", "outline"]}
          filterOptions={[
            {
              key: "format",
              label: "Format",
              options: ["blog-post", "summary", "outline"]
            }
          ]}
          sortOptions={[
            {
              key: "createdAt",
              label: "Creation Date"
            },
            {
              key: "title",
              label: "Title"
            }
          ]}
        />
      </div>

      {selectedPost && (
        <BlogPostView
          post={selectedPost}
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
        />
      )}

      {/* Error Display */}
      {agent?.status === "error" && agent.aiConfig?.lastError && (
        <Card className="border-destructive shadow-md mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Error occurred:</p>
            </div>
            <p className="mt-2">{agent.aiConfig.lastError}</p>
            {agent.aiConfig.lastErrorTime && (
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(agent.aiConfig.lastErrorTime).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}