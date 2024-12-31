import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Agent, BlogPost } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BlogPostCard from "@/components/BlogPostCard";
import BlogPostView from "@/components/BlogPostView";
import AgentAnalytics from "@/components/AgentAnalytics";
import ContentGenerationDialog from "@/components/ContentGenerationDialog";
import GenerationProgress from "@/components/GenerationProgress";
import { useToast } from "@/hooks/use-toast";

export default function AgentView() {
  const { id } = useParams();
  const { toast } = useToast();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const { data: agent } = useQuery<Agent>({
    queryKey: [`/api/agents/${id}`],
  });

  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: [`/api/agents/${id}/posts`],
    refetchInterval: agent?.status === "researching" ? 5000 : false,
  });

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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground mt-1">{agent.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={getStatusColor(agent.status)}>{agent.status}</Badge>
          <ContentGenerationDialog agentId={parseInt(id)} />
        </div>
      </div>

      {agent.status === "error" && agent.aiConfig?.lastError && (
        <Card className="mb-8 border-destructive">
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

      <GenerationProgress status={agent.status} />

      <div className="space-y-6">
        <AgentAnalytics agent={agent} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                <div>
                  <dt className="text-sm font-medium">Model</dt>
                  <dd className="text-sm text-muted-foreground">{agent.aiConfig.model}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Style</dt>
                  <dd className="text-sm text-muted-foreground">
                    {agent.aiConfig.contentGeneration?.style || "Not set"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Topics</dt>
                  <dd className="text-sm text-muted-foreground">
                    {agent.aiConfig.contentGeneration?.topics?.length
                      ? agent.aiConfig.contentGeneration.topics.join(", ")
                      : "No topics set"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
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