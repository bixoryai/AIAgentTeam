import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Agent, BlogPost } from "@db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BlogPostCard from "@/components/BlogPostCard";
import BlogPostView from "@/components/BlogPostView";
import { Button } from "@/components/ui/button";
import { Play, Pause, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AgentView() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const { data: agent } = useQuery<Agent>({
    queryKey: [`/api/agents/${id}`],
  });

  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: [`/api/agents/${id}/posts`],
    refetchInterval: agent?.status === "researching" ? 5000 : false,
  });

  const toggleMutation = useMutation({
    mutationFn: async (action: "start" | "pause") => {
      const res = await fetch(`/api/agents/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${id}/posts`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!agent) return null;

  const handleToggle = () => {
    const action = agent.status === "idle" ? "start" : "pause";
    toggleMutation.mutate(action);
  };

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
          <Button
            variant="outline"
            disabled={agent.status === "initializing" || toggleMutation.isPending}
            onClick={handleToggle}
          >
            {agent.status === "initializing" || toggleMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : agent.status === "idle" ? (
              <Play className="h-4 w-4 mr-2" />
            ) : (
              <Pause className="h-4 w-4 mr-2" />
            )}
            {agent.status === "initializing" ? "Initializing..." :
              agent.status === "researching" ? "Researching..." :
                agent.status === "idle" ? "Start" : "Pause"}
          </Button>
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
                  {agent.aiConfig.contentGeneration.preferredStyle}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium">Focus Topics</dt>
                <dd className="text-sm text-muted-foreground">
                  {agent.aiConfig.contentGeneration.topicFocus.join(", ")}
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