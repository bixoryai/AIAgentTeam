import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ThumbsUp, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TopicSuggestionCardProps {
  agentId: number;
  onSelectTopic: (topic: string) => void;
}

interface TopicSuggestion {
  title: string;
  description: string;
}

export default function TopicSuggestionCard({ agentId, onSelectTopic }: TopicSuggestionCardProps) {
  const [seedTopic, setSeedTopic] = useState("");
  const { toast } = useToast();

  const { data: suggestions = [], refetch, isLoading } = useQuery<TopicSuggestion[]>({
    queryKey: [`/api/agents/${agentId}/suggest-topics`, seedTopic],
    enabled: false,
  });

  const handleRefresh = () => {
    refetch().catch((error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch suggestions",
        variant: "destructive",
      });
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Topic Suggestions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a topic to get related suggestions..."
              value={seedTopic}
              onChange={(e) => setSeedTopic(e.target.value)}
            />
            <Button onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Card key={index} className="cursor-pointer hover:bg-accent" onClick={() => onSelectTopic(suggestion.title)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{suggestion.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="ml-2">
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isLoading ? "Generating suggestions..." : "Click refresh to get topic suggestions"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
