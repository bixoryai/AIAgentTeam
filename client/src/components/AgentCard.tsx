import { type Agent } from "@db/schema";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Pause, Settings, Loader2 } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const getStatusColor = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "initializing":
        return "secondary";
      case "ready":
        return "default";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === "initializing") {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    return status === "idle" ? (
      <Play className="h-4 w-4 mr-2" />
    ) : (
      <Pause className="h-4 w-4 mr-2" />
    );
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
          disabled={agent.status === "initializing"}
        >
          {getStatusIcon(agent.status)}
          {agent.status === "initializing" ? "Initializing..." : 
           agent.status === "idle" ? "Start" : "Pause"}
        </Button>

        <Link href={`/agent/${agent.id}`}>
          <Button variant="outline" size="sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}