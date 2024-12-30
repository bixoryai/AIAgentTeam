import { useQuery } from "@tanstack/react-query";
import AgentCard from "@/components/AgentCard";
import { Agent } from "@db/schema";
import CreateAgentDialog from "@/components/CreateAgentDialog";

export default function Dashboard() {
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">AI Agent Dashboard</h1>
        <CreateAgentDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}