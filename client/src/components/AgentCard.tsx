import { type Agent } from "@db/schema";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Pause, Settings, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (action: "start" | "pause") => {
      const res = await fetch(`/api/agents/${agent.id}/toggle`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agent.id}/posts`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const getStatusIcon = (status: string) => {
    if (status === "initializing" || status === "researching") {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return status === "idle" ? (
      <Play className="h-4 w-4 mr-2" />
    ) : (
      <Pause className="h-4 w-4 mr-2" />
    );
  };

  const handleToggle = () => {
    const action = agent.status === "idle" ? "start" : "pause";
    toggleMutation.mutate(action);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{agent.name}</h3>
          <Badge variant={getStatusColor(agent.status)}>
            {agent.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{agent.description}</p>
        {agent.status === "error" && agent.aiConfig?.lastError && (
          <div className="mb-4 p-2 bg-destructive/10 rounded-md border border-destructive">
            <p className="text-xs text-destructive">
              Error: {agent.aiConfig.lastError}
              {agent.aiConfig.lastErrorTime && (
                <span className="block mt-1 text-muted-foreground">
                  {new Date(agent.aiConfig.lastErrorTime).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        )}
        {agent.aiConfig && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-3 w-3" />
              <span>AI Configuration:</span>
            </div>
            <ul className="list-disc list-inside pl-5">
              <li>Model: {agent.aiConfig.model}</li>
              <li>Style: {agent.aiConfig.contentGeneration?.preferredStyle}</li>
              {agent.aiConfig.contentGeneration?.topicFocus?.map((topic: string) => (
                <li key={topic}>Focus: {topic}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={agent.status === "initializing" || toggleMutation.isPending}
          onClick={handleToggle}
        >
          {getStatusIcon(agent.status)}
          {agent.status === "initializing" ? "Initializing..." :
            agent.status === "researching" ? "Researching..." :
              agent.status === "idle" ? "Start" : "Pause"}
        </Button>

        <Link href={`/agent/${agent.id}`}>
          <Button variant="outline" size="sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}