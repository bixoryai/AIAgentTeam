import { useQuery } from "@tanstack/react-query";
import AgentCard from "@/components/AgentCard";
import { Agent } from "@db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

export default function AllAgents() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: agents = [] } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">All AI Agents</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-[300px]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-8">
            {searchQuery ? "No agents found matching your search." : "No agents registered yet."}
          </p>
        ) : (
          filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))
        )}
      </div>
    </div>
  );
}
