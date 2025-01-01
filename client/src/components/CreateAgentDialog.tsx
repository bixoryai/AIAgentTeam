import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useLLMProvider } from "@/hooks/use-llm-provider";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  contentGeneration: z.object({
    topics: z.array(z.string()).min(1, "At least one topic is required"),
    wordCountMin: z.number().min(100).max(5000),
    wordCountMax: z.number().min(100).max(5000),
    style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
    tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
    instructions: z.string(),
    researchDepth: z.number().min(1).max(5),
  }),
  provider: z.enum(["openai", "anthropic"]).default("openai"),
  providerSettings: z.object({
    openai: z.object({
      model: z.enum(["gpt-4o"]),
      temperature: z.number().min(0).max(2),
    }).optional(),
    anthropic: z.object({
      model: z.enum(["claude-3-5-sonnet-20241022"]),
      temperature: z.number().min(0).max(1),
    }).optional(),
  }).optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateAgentDialog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const { providers, getProviderInfo, getDefaultSettings } = useLLMProvider();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      contentGeneration: {
        topics: [],
        wordCountMin: 500,
        wordCountMax: 1500,
        style: "balanced",
        tone: "professional",
        instructions: "",
        researchDepth: 3,
      },
      provider: "openai",
      providerSettings: {
        openai: {
          model: "gpt-4o",
          temperature: 0.7,
        }
      },
    },
  });

  const currentProvider = form.watch("provider");
  const providerInfo = getProviderInfo(currentProvider);

  const mutation = useMutation({
    mutationFn: async (values: FormData) => {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      toast({
        title: "Success",
        description: "Agent created successfully. You can now complete the registration in the agent view.",
      });
      form.reset();
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddTopic = () => {
    if (!newTopic.trim()) return;

    const currentTopics = form.getValues("contentGeneration.topics");
    if (!currentTopics.includes(newTopic.trim())) {
      form.setValue("contentGeneration.topics", [...currentTopics, newTopic.trim()]);
    }
    setNewTopic("");
  };

  const handleRemoveTopic = (topicToRemove: string) => {
    const currentTopics = form.getValues("contentGeneration.topics");
    form.setValue(
      "contentGeneration.topics",
      currentTopics.filter(topic => topic !== topicToRemove)
    );
  };

  const handleProviderChange = (provider: "openai" | "anthropic") => {
    form.setValue("provider", provider);

    // Set default settings based on the selected provider
    const defaultSettings = getDefaultSettings(provider);
    form.setValue("providerSettings", defaultSettings);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New AI Content Agent</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Blog Writing Assistant" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your AI agent a descriptive name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="An AI agent that writes engaging blog posts about technology..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what kind of content this agent will generate
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LLM Provider</FormLabel>
                  <Select onValueChange={handleProviderChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an LLM provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the AI model provider for content generation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {providerInfo && (
              <FormField
                control={form.control}
                name={`providerSettings.${currentProvider}.model`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providerInfo.models.map(model => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the specific model for content generation
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name={`providerSettings.${currentProvider}.temperature`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temperature ({field.value})</FormLabel>
                  <FormControl>
                    <Input
                      type="range"
                      min={currentProvider === "openai" ? 0 : 0}
                      max={currentProvider === "openai" ? 2 : 1}
                      step={0.1}
                      {...field}
                      onChange={e => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Adjust the creativity level of the AI model
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentGeneration.topics"
              render={() => (
                <FormItem>
                  <FormLabel>Topics</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add a topic (e.g., Technology, AI, Business)"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTopic();
                            }
                          }}
                        />
                        <Button type="button" onClick={handleAddTopic}>Add</Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {form.watch("contentGeneration.topics").map((topic) => (
                          <Badge key={topic} variant="secondary" className="px-3 py-1">
                            {topic}
                            <button
                              type="button"
                              onClick={() => handleRemoveTopic(topic)}
                              className="ml-2 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Add topics that the agent should focus on
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentGeneration.style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Writing Style</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the writing style for your content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentGeneration.tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Tone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="authoritative">Authoritative</SelectItem>
                      <SelectItem value="conversational">Conversational</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Set the tone for your content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentGeneration.researchDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Research Depth (1-5)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      {...field}
                      onChange={e => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Higher values mean more thorough research but slower generation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentGeneration.instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Include case studies, focus on latest trends..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide any specific instructions for content generation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}