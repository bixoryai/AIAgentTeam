import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle } from "lucide-react";

const agentFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  contentGeneration: z.object({
    style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
    tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
    wordCountMin: z.coerce.number().min(100).max(5000),
    wordCountMax: z.coerce.number().min(100).max(5000),
    topics: z.array(z.string()).min(1, "At least one topic is required"),
    researchDepth: z.coerce.number().min(1).max(5),
    instructions: z.string(),
  }),
});

export default function AgentRegistrationWizard() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof agentFormSchema>>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      contentGeneration: {
        style: "balanced",
        tone: "professional",
        wordCountMin: 500,
        wordCountMax: 2000,
        topics: [],
        researchDepth: 3,
        instructions: "",
      },
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof agentFormSchema>) => {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: 'Success',
        description: 'Agent created successfully',
      });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  function onSubmit(values: z.infer<typeof agentFormSchema>) {
    createAgentMutation.mutate(values);
  }

  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');

  const addTopic = () => {
    if (newTopic && !topics.includes(newTopic)) {
      const updatedTopics = [...topics, newTopic];
      setTopics(updatedTopics);
      form.setValue('contentGeneration.topics', updatedTopics);
      setNewTopic('');
    }
  };

  const removeTopic = (topicToRemove: string) => {
    const updatedTopics = topics.filter(topic => topic !== topicToRemove);
    setTopics(updatedTopics);
    form.setValue('contentGeneration.topics', updatedTopics);
  };

  if (!isOpen) {
    return (
      <Button 
        variant="default" 
        size="lg" 
        className="bg-orange-500 hover:bg-orange-600"
        onClick={() => setIsOpen(true)}
      >
        <PlusCircle className="w-5 h-5 mr-2" />
        Register New Agent
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Register New AI Agent</CardTitle>
        <CardDescription>
          Create a new AI agent by filling out the details below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter agent name" {...field} />
                  </FormControl>
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
                      placeholder="Describe what this agent does..." 
                      {...field} 
                    />
                  </FormControl>
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
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentGeneration.tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Writing Tone</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contentGeneration.wordCountMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Words</FormLabel>
                    <FormControl>
                      <Input type="number" min={100} max={5000} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contentGeneration.wordCountMax"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Words</FormLabel>
                    <FormControl>
                      <Input type="number" min={100} max={5000} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contentGeneration.researchDepth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Research Depth (1-5)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Topics</FormLabel>
              <div className="flex gap-2">
                <Input
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Add a topic..."
                />
                <Button type="button" onClick={addTopic}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {topics.map((topic) => (
                  <div
                    key={topic}
                    className="bg-secondary px-3 py-1 rounded-full flex items-center gap-2"
                  >
                    <span>{topic}</span>
                    <button
                      type="button"
                      onClick={() => removeTopic(topic)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="contentGeneration.instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any specific instructions for content generation..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAgentMutation.isPending}>
                {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
