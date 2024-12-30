import { type Agent } from "@db/schema";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Play, Pause } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{agent.name}</h3>
          <Badge variant={agent.status === "idle" ? "secondary" : "default"}>
            {agent.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-sm text-muted-foreground">{agent.description}</p>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="ghost" size="sm">
          {agent.status === "idle" ? (
            <Play className="h-4 w-4 mr-2" />
          ) : (
            <Pause className="h-4 w-4 mr-2" />
          )}
          {agent.status === "idle" ? "Start" : "Pause"}
        </Button>
        
        <Link href={`/agent/${agent.id}`}>
          <Button variant="outline" size="sm">View Details</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
