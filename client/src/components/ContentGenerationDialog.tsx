import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useState, useEffect } from "react";
import { useLLMProvider } from "@/hooks/use-llm-provider";
import { Bot } from "lucide-react";

const contentGenerationSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  wordCount: z.coerce
    .number()
    .min(100, "Minimum word count is 100")
    .max(5000, "Maximum word count is 5000"),
  style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
  tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
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

type ContentGenerationForm = z.infer<typeof contentGenerationSchema>;

interface ContentGenerationDialogProps {
  agentId: number;
  preselectedTopic?: string;
}

export default function ContentGenerationDialog({ agentId, preselectedTopic }: ContentGenerationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { providers, getProviderInfo, getModelInfo, getDefaultSettings } = useLLMProvider();

  const form = useForm<ContentGenerationForm>({
    resolver: zodResolver(contentGenerationSchema),
    defaultValues: {
      topic: preselectedTopic || "",
      wordCount: 1000,
      style: "balanced",
      tone: "professional",
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
  const currentModel = currentProvider === "openai" ? "gpt-4o" : "claude-3-5-sonnet-20241022";
  const modelInfo = getModelInfo(currentProvider, currentModel);

  useEffect(() => {
    if (preselectedTopic) {
      form.setValue("topic", preselectedTopic);
    }
  }, [preselectedTopic, form]);

  const generateMutation = useMutation({
    mutationFn: async (values: ContentGenerationForm) => {
      const res = await fetch(`/api/agents/${agentId}/generate`, {
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
      // Force an immediate refetch of the agent data
      queryClient.invalidateQueries({
        queryKey: [`/api/agents/${agentId}`],
        refetchType: 'active',
      });

      // Invalidate posts query as well
      queryClient.invalidateQueries({
        queryKey: [`/api/agents/${agentId}/posts`],
        refetchType: 'active',
      });

      toast({
        title: "Content Generation Started",
        description: "The agent will begin researching and generating content shortly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setOpen(true); // Reopen dialog on error
    },
  });

  const handleProviderChange = (provider: "openai" | "anthropic") => {
    form.setValue("provider", provider);
    form.setValue("providerSettings", getDefaultSettings(provider));
  };

  const handleSubmit = async (values: ContentGenerationForm) => {
    setOpen(false); // Close dialog immediately
    await generateMutation.mutateAsync(values);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentProvider}
        onValueChange={handleProviderChange}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue>
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              {modelInfo ? `${providerInfo?.name} - ${modelInfo.name}` : "Select Model"}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {providers.map(provider => (
            <SelectItem key={provider.id} value={provider.id}>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                {provider.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Generate Content</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Content</DialogTitle>
            <DialogDescription>
              Configure content generation settings for your AI agent.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter the topic for content generation" {...field} />
                    </FormControl>
                    <FormDescription>
                      What would you like the agent to write about?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="wordCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Word Count</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={100}
                        max={5000}
                        placeholder="Enter desired word count"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Target word count (100-5000 words)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Writing Style</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a writing style" />
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
                name="tone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tone</FormLabel>
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
                      Choose the tone for your content
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={generateMutation.isPending}
                className="w-full"
              >
                {generateMutation.isPending ? "Starting..." : "Generate Content"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}