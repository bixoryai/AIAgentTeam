import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
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

interface TopicResponse {
  topics: TopicSuggestion[];
}

export default function TopicSuggestionCard({ agentId, onSelectTopic }: TopicSuggestionCardProps) {
  const [seedTopic, setSeedTopic] = useState("");
  const { toast } = useToast();

  const { data: response, refetch, isLoading } = useQuery<TopicResponse>({
    queryKey: [`/api/agents/${agentId}/suggest-topics`, seedTopic],
    queryFn: async () => {
      if (!seedTopic.trim()) return { topics: [] };

      const res = await fetch(`/api/agents/${agentId}/suggest-topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed_topic: seedTopic,
          style: "balanced",
          count: 5,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    enabled: false, // Don't auto-fetch, we'll control this with the Generate button
  });

  const suggestions = response?.topics || [];

  const handleGenerate = () => {
    if (!seedTopic.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a topic to get suggestions.",
        variant: "destructive",
      });
      return;
    }
    refetch();
  };

  const handleRefresh = () => {
    if (!seedTopic.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a topic to get suggestions.",
        variant: "destructive",
      });
      return;
    }
    refetch();
  };

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter a topic to get suggestions..."
              value={seedTopic}
              onChange={(e) => setSeedTopic(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={isLoading || !seedTopic.trim()}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate
            </Button>
            <Button 
              onClick={handleRefresh} 
              disabled={isLoading || !seedTopic.trim() || suggestions.length === 0}
              variant="outline"
              size="icon"
              title="Refresh suggestions"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <Card 
                  key={index} 
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onSelectTopic(suggestion.title)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <h4 className="font-medium">{suggestion.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {suggestion.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {isLoading 
                ? "Generating suggestions..." 
                : seedTopic.trim() 
                  ? "Click Generate to get topic suggestions" 
                  : "Enter a topic above to get suggestions"}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}