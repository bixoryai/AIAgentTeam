import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";

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
});

type FormData = z.infer<typeof formSchema>;

export default function CreateAgentDialog() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    },
  });

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
        description: "Agent created successfully",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Agent
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
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
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Higher values mean more thorough research but slower generation
                  </FormDescription>
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
                </FormItem>
              )}
            />

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create Agent"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}