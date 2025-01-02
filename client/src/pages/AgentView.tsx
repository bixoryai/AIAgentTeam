import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Agent, BlogPost } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BlogPostCard from "@/components/BlogPostCard";
import BlogPostView from "@/components/BlogPostView";
import AgentAnalytics from "@/components/AgentAnalytics";
import ContentGenerationDialog from "@/components/ContentGenerationDialog";
import GenerationProgress from "@/components/GenerationProgress";
import { useToast } from "@/hooks/use-toast";
import { useLLMProvider } from "@/hooks/use-llm-provider";
import TopicSuggestionCard from "@/components/TopicSuggestionCard";
import { CheckCircle, ChevronLeft } from "lucide-react";

export default function AgentView() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const { getProviderInfo, getModelInfo } = useLLMProvider();

  const { data: agent } = useQuery<Agent>({
    queryKey: [`/api/agents/${id}`],
    refetchInterval: (data) => {
      // Always refetch while any generation-related activity is happening
      if (data?.status === "researching" || 
          data?.status === "generating" || 
          data?.status === "initializing") {
        return 1000; // Poll every second during active states
      }
      return false; // Don't poll during idle states
    },
    enabled: !!id,
  });

  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: [`/api/agents/${id}/posts`],
    refetchInterval: (data) => ["researching", "generating"].includes(agent?.status || "") ? 1000 : false,
    enabled: !!id,
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

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    toast({
      title: "Topic Selected",
      description: "Click 'Generate Content' to create a blog post with this topic.",
    });
  };

  if (!agent) return null;

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "initializing":
      case "researching":
        return "secondary";
      case "ready":
      case "idle":
        return "default";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const provider = agent.aiConfig?.provider ? getProviderInfo(agent.aiConfig.provider) : null;
  const providerSettings = agent.aiConfig?.provider ?
    agent.aiConfig.providerSettings?.[agent.aiConfig.provider] : null;
  const modelInfo = providerSettings?.model ?
    getModelInfo(agent.aiConfig.provider, providerSettings.model) : null;
  const modelDisplay = provider && modelInfo ?
    `${provider.name} - ${modelInfo.name}` : "Not set";

  // Show progress indicator for active states
  const showProgress = agent.status === "researching" ||
                      agent.status === "generating" ||
                      agent.status === "initializing";

  return (
    <div className="container mx-auto p-6 space-y-8">
      <Link href="/agents" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Back to All Agents
      </Link>

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{agent.name}</h1>
              {agent.isRegistered ? (
                <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-500">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Registered
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => registerMutation.mutate()}
                  disabled={registerMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {registerMutation.isPending ? "Completing..." : "Complete"}
                </Button>
              )}
              <Badge
                variant={getStatusColor(agent.status)}
                className={agent.status === "ready" || agent.status === "idle"
                  ? "bg-green-500 hover:bg-green-600"
                  : ""}
              >
                {agent.status}
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl">{agent.description}</p>
          </div>

          <div className="flex-shrink-0">
            <ContentGenerationDialog
              agentId={parseInt(id)}
              preselectedTopic={selectedTopic}
            />
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      {showProgress && (
        <GenerationProgress
          status={agent.status}
          lastUpdateTime={agent.aiConfig?.lastUpdateTime}
        />
      )}

      {/* Error Display */}
      {agent.status === "error" && agent.aiConfig?.lastError && (
        <Card className="border-destructive shadow-md">
          <CardContent className="pt-6">
            <div className="text-sm text-destructive">
              <p className="font-medium">Error occurred:</p>
              <p className="mt-1">{agent.aiConfig.lastError}</p>
              {agent.aiConfig.lastErrorTime && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(agent.aiConfig.lastErrorTime).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <Card className="h-[400px] shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle>Topic Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] overflow-y-auto">
              <TopicSuggestionCard
                agentId={parseInt(id)}
                onSelectTopic={handleTopicSelect}
              />
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle>Generated Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No posts generated yet.</p>
                ) : (
                  posts.map((post) => (
                    <BlogPostCard
                      key={post.id}
                      post={post}
                      onView={() => setSelectedPost(post)}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="h-[400px] shadow-md hover:shadow-lg transition-all duration-200">
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] overflow-y-auto">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium">Default Model</dt>
                  <dd className="text-sm text-muted-foreground">{modelDisplay}</dd>
                </div>
                {providerSettings && (
                  <div>
                    <dt className="text-sm font-medium">Default Temperature</dt>
                    <dd className="text-sm text-muted-foreground">
                      {providerSettings.temperature || 0.7}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium">Research Enabled</dt>
                  <dd className="text-sm text-muted-foreground">
                    {agent.aiConfig?.researchEnabled ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Max Tokens</dt>
                  <dd className="text-sm text-muted-foreground">
                    {agent.aiConfig?.maxTokens || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Default Word Count</dt>
                  <dd className="text-sm text-muted-foreground">
                    {agent.aiConfig?.contentGeneration?.wordCountMin} - {agent.aiConfig?.contentGeneration?.wordCountMax} words
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Default Research Depth</dt>
                  <dd className="text-sm text-muted-foreground">
                    Level {agent.aiConfig?.contentGeneration?.researchDepth || 3}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card className="shadow-md hover:shadow-lg transition-all duration-200">
            <CardContent className="pt-6">
              <AgentAnalytics agent={agent} />
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedPost && (
        <BlogPostView
          post={selectedPost}
          open={!!selectedPost}
          onOpenChange={(open) => !open && setSelectedPost(null)}
        />
      )}
    </div>
  );
}