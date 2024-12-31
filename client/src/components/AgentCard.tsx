import { type Agent } from "@db/schema";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Settings } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
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
              <li>Style: {agent.aiConfig.contentGeneration?.style}</li>
              {agent.aiConfig.contentGeneration?.topics?.map((topic: string) => (
                <li key={topic}>Focus: {topic}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Link href={`/agent/${agent.id}`}>
          <Button variant="default" size="sm">
            Start
          </Button>
        </Link>

        <Link href={`/agent/${agent.id}`}>
          <Button variant="outline" size="sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}