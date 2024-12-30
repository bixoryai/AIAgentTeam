import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import ResearchForm from "@/components/ResearchForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Agent, BlogPost } from "@db/schema";

export default function AgentView() {
  const { id } = useParams();
  
  const { data: agent } = useQuery<Agent>({
    queryKey: [`/api/agents/${id}`],
  });

  const { data: posts = [] } = useQuery<BlogPost[]>({
    queryKey: [`/api/agents/${id}/posts`],
  });

  if (!agent) return null;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">{agent.name}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Research & Generate</CardTitle>
            </CardHeader>
            <CardContent>
              <ResearchForm agentId={agent.id} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Generated Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="p-4 border rounded-lg">
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {post.wordCount} words
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
