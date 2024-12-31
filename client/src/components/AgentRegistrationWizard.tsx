import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

// Define the form schema
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  topics: z.array(z.string()).min(1, "At least one topic is required"),
  wordCountMin: z.coerce.number().min(100).max(5000),
  wordCountMax: z.coerce.number().min(100).max(5000),
  style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
  tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
  researchDepth: z.coerce.number().min(1).max(5),
  instructions: z.string(),
});

export default function AgentRegistrationWizard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      topics: [],
      wordCountMin: 500,
      wordCountMax: 2000,
      style: "balanced",
      tone: "professional",
      researchDepth: 3,
      instructions: "",
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          contentGeneration: {
            topics: data.topics,
            wordCountMin: data.wordCountMin,
            wordCountMax: data.wordCountMax,
            style: data.style,
            tone: data.tone,
            researchDepth: data.researchDepth,
            instructions: data.instructions,
          },
        }),
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
      setShowForm(false);
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

  if (!showForm) {
    return (
      <Button
        variant="default"
        size="lg"
        className="bg-orange-500 hover:bg-orange-600"
        onClick={() => setShowForm(true)}
      >
        <PlusCircle className="w-5 h-5 mr-2" />
        Register New Agent
      </Button>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-card p-6 rounded-lg border">
      <h2 className="text-2xl font-bold mb-6">Register New AI Agent</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => createAgentMutation.mutate(data))} className="space-y-6">
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

          <div className="space-y-2">
            <FormLabel>Topics</FormLabel>
            <div className="flex gap-2">
              <Input
                value={form.getValues("topics").join(", ")}
                onChange={(e) => form.setValue("topics", e.target.value.split(",").map(s => s.trim()).filter(s => s.length > 0))}
                placeholder="Add topics separated by commas..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="wordCountMin"
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
              name="wordCountMax"
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
            name="style"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Writing Style</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select style" />
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
            name="tone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Writing Tone</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
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

          <FormField
            control={form.control}
            name="researchDepth"
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

          <FormField
            control={form.control}
            name="instructions"
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
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAgentMutation.isPending}>
              {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}