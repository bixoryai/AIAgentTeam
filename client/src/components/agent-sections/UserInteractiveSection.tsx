import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, FileText, Book, Newspaper } from "lucide-react";
import type { UserInteractiveSectionProps } from "./types";
import ContentGenerationDialog from "@/components/ContentGenerationDialog";
import TopicSuggestionCard from "@/components/TopicSuggestionCard";
import TemplateManagementDialog from "@/components/TemplateManagementDialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { Template } from "@db/schema";

export default function UserInteractiveSection({
  onAction,
  supportedActions,
  agentId
}: UserInteractiveSectionProps) {
  const { toast } = useToast();
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<Template[]>({
    queryKey: [`/api/agents/${agentId}/templates`],
    refetchInterval: false,
  });

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    toast({
      title: "Topic Selected",
      description: "Click 'Generate Content' to create a blog post with this topic.",
    });
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    toast({
      title: "Template Selected",
      description: `Using "${template.name}" template. Parameters will be pre-filled in the generation form.`,
    });
  };

  // Get icon based on template type
  const getTemplateIcon = (templateName: string) => {
    switch (templateName.toLowerCase()) {
      case "blog post":
        return <FileText className="w-4 h-4" />;
      case "tutorial":
        return <Book className="w-4 h-4" />;
      case "article":
        return <Newspaper className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <CardTitle>Interactive Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Topic Suggestions */}
        <div>
          <h3 className="text-sm font-medium mb-2">Topic Suggestions</h3>
          <TopicSuggestionCard
            agentId={agentId}
            onSelectTopic={handleTopicSelect}
          />
        </div>

        {/* Content Generation */}
        <div>
          <ContentGenerationDialog
            agentId={agentId}
            preselectedTopic={selectedTopic}
            defaultSettings={selectedTemplate?.parameters}
          />
        </div>

        {/* Templates Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Templates</h3>
            <TemplateManagementDialog agentId={agentId} />
          </div>
          <ScrollArea className="h-[200px] rounded-md border p-4">
            {isLoadingTemplates ? (
              <p className="text-sm text-muted-foreground">Loading templates...</p>
            ) : templates.length > 0 ? (
              <div className="space-y-4">
                {templates.map((template) => (
                  <Card 
                    key={template.id} 
                    className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                      selectedTemplate?.id === template.id ? 'border-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center gap-2">
                      {getTemplateIcon(template.name)}
                      <div>
                        <h4 className="font-medium">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Word Count: {template.parameters.wordCount}</p>
                      <p>Style: {template.parameters.style}</p>
                      <p>Tone: {template.parameters.tone}</p>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No templates available. Create one to get started!</p>
            )}
          </ScrollArea>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-medium mb-2">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {supportedActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                onClick={() => onAction(action, {})}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {action}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}