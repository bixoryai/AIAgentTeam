import { type Agent } from "@db/schema";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Settings, AlertCircle, RefreshCw, Bot } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLLMProvider } from "@/hooks/use-llm-provider";

interface AgentCardProps {
  agent: Agent;
}

function truncateDescription(description: string, maxWords: number = 25): string {
  const words = description.split(/\s+/).filter(word => word.length > 0);
  if (words.length <= maxWords) return description;
  return words.slice(0, maxWords).join(" ") + "...";
}

function formatErrorMessage(error: string): string {
  // Handle rate limit errors specifically
  if (error.includes("Ratelimit") || error.includes("403")) {
    return "Rate limit reached. Please wait a moment and try again.";
  }

  // Handle web research failures
  if (error.includes("Web research failed")) {
    return "Unable to fetch research data. The system will use expert knowledge instead.";
  }

  // Extract message from JSON-like error strings
  try {
    const matches = error.match(/\{.*?\}/);
    if (matches) {
      const parsed = JSON.parse(matches[0]);
      return parsed.detail || error;
    }
  } catch {
    // If parsing fails, return a cleaned up version of the original message
  }

  return error.replace(/[{}"]/g, '').split(":").pop()?.trim() || "An error occurred";
}

export default function AgentCard({ agent }: AgentCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getProviderInfo, getModelInfo } = useLLMProvider();

  const provider = getProviderInfo(agent.aiConfig.provider);
  const providerSettings = agent.aiConfig.providerSettings?.[agent.aiConfig.provider];
  const modelInfo = providerSettings?.model ? getModelInfo(agent.aiConfig.provider, providerSettings.model) : null;

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/agents/${agent.id}/reset`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Agent Reset",
        description: "The agent has been reset and is ready to try again.",
      });
    },
    onError: (error) => {
      toast({
        title: "Reset Failed",
        description: error instanceof Error ? error.message : "Failed to reset agent",
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

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{agent.name}</h3>
            {provider && (
              <Badge variant="outline" className="text-xs">
                <Bot className="w-3 h-3 mr-1" />
                {provider.name}
              </Badge>
            )}
          </div>
          <Badge 
            variant={getStatusColor(agent.status)}
            className={agent.status === "ready" || agent.status === "idle" ? "bg-green-500 hover:bg-green-600" : ""}
          >
            {agent.status === "ready" || agent.status === "idle" ? "READY" :
             agent.status === "error" ? "ERROR" :
             agent.status === "researching" ? "BUSY" :
             agent.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {truncateDescription(agent.description)}
        </p>

        {agent.status === "error" && agent.aiConfig?.lastError && (
          <div className="mb-4 p-3 bg-destructive/10 rounded-md border border-destructive">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  {formatErrorMessage(agent.aiConfig.lastError)}
                </p>
                {agent.aiConfig.lastErrorTime && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(agent.aiConfig.lastErrorTime).toLocaleString()}
                  </p>
                )}
                {agent.aiConfig.lastError.includes("Ratelimit") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => resetMutation.mutate()}
                    disabled={resetMutation.isPending}
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    {resetMutation.isPending ? "Resetting..." : "Try Again"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {agent.aiConfig && (
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="h-3 w-3" />
              <span>Configuration:</span>
            </div>
            <ul className="list-disc list-inside pl-5">
              {modelInfo && <li>Model: {modelInfo.name}</li>}
              <li>Style: {agent.aiConfig.contentGeneration?.style}</li>
              {agent.aiConfig.contentGeneration?.topics?.map((topic: string) => (
                <li key={topic}>Focus: {topic}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Link href={`/agent/${agent.id}`} className="w-full">
          <Button 
            variant="default" 
            size="lg" 
            className="w-full bg-orange-500 hover:bg-orange-600 font-semibold"
            disabled={agent.status === "error" && agent.aiConfig?.lastError?.includes("Ratelimit")}
          >
            {agent.status === "error" ? 
              agent.aiConfig?.lastError?.includes("Ratelimit") ? 
                "Rate Limited" : "View Error" 
              : agent.status === "ready" ? "Start" 
              : agent.status === "researching" ? "View Progress" 
              : "Start"}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}