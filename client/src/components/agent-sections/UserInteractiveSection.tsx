import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, FileText, Book, Newspaper } from "lucide-react";
import type { UserInteractiveSectionProps } from "./types";
import ContentGenerationDialog from "@/components/ContentGenerationDialog";
import TopicSuggestionCard from "@/components/TopicSuggestionCard";
import TemplateManagementDialog from "@/components/TemplateManagementDialog";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Template } from "@db/schema";
import { Dialog } from "@/components/ui/dialog";

export default function UserInteractiveSection({
  onAction,
  supportedActions,
  agentId
}: UserInteractiveSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const contentGenerationDialogRef = useRef<HTMLButtonElement>(null);

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
    // If the template is already selected, unselect it
    if (selectedTemplate?.id === template.id) {
      setSelectedTemplate(null);
      toast({
        title: "Template Unselected",
        description: "Default parameters will be used for content generation.",
      });
    } else {
      setSelectedTemplate(template);
      toast({
        title: "Template Selected",
        description: `Using "${template.name}" template. Parameters will be pre-filled in the generation form.`,
      });
    }
  };

  // Research mutation
  const researchMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}`] });
      toast({
        title: "Research Started",
        description: "The agent has started gathering relevant information.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Research Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Optimization mutation
  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/agents/${agentId}/optimize`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}/posts`] });
      toast({
        title: "Optimization Started",
        description: "The agent is optimizing your content.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  // Handle user interactive section actions
  const handleAction = async (action: string, params: any) => {
    switch (action) {
      case 'generate':
        // Trigger the content generation dialog
        contentGenerationDialogRef.current?.click();
        break;
      case 'research':
        // Start research process
        await researchMutation.mutateAsync();
        break;
      case 'optimize':
        // Start optimization process
        await optimizeMutation.mutateAsync();
        break;
      default:
        console.warn('Unknown action:', action);
        toast({
          title: "Unknown Action",
          description: `The action "${action}" is not recognized.`,
          variant: "destructive",
        });
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
            triggerRef={contentGenerationDialogRef}
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
                    className={`relative p-4 cursor-pointer hover:bg-accent transition-colors ${
                      selectedTemplate?.id === template.id ? 'border-primary' : ''
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <TemplateManagementDialog
                        agentId={agentId}
                        template={template}
                        mode="edit"
                        iconOnly
                      />
                      <TemplateManagementDialog
                        agentId={agentId}
                        template={template}
                        mode="delete"
                        iconOnly
                      />
                    </div>
                    <div className="flex items-center gap-2 pr-16">
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
                onClick={() => handleAction(action, {})}
                className="flex items-center gap-2"
                disabled={
                  (action === 'research' && researchMutation.isPending) ||
                  (action === 'optimize' && optimizeMutation.isPending)
                }
              >
                <Zap className="w-4 h-4" />
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}