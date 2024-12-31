import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle } from "lucide-react";

// Base schema for all agents
const baseAgentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  capabilities: z.array(z.enum(["content_generation", "data_analysis", "image_generation"])),
  aiConfig: z.object({
    model: z.enum(["gpt-4", "gpt-3.5-turbo", "claude-2"]),
    temperature: z.number().min(0).max(1),
  }),
});

// Content generation capability schema
const contentGenerationSchema = z.object({
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

// Data analysis capability schema
const dataAnalysisSchema = z.object({
  dataAnalysis: z.object({
    dataTypes: z.array(z.enum(["numerical", "categorical", "time_series", "text"])),
    analysisTypes: z.array(z.enum(["descriptive", "predictive", "prescriptive"])),
    visualizationTypes: z.array(z.enum(["charts", "graphs", "tables", "dashboards"])),
    automationLevel: z.enum(["full", "semi", "manual"]),
  }),
});

// Image generation capability schema
const imageGenerationSchema = z.object({
  imageGeneration: z.object({
    styles: z.array(z.enum(["realistic", "artistic", "abstract", "cartoon"])),
    formats: z.array(z.enum(["png", "jpg", "svg", "gif"])),
    dimensions: z.enum(["square", "landscape", "portrait", "custom"]),
    quality: z.enum(["draft", "standard", "high"]),
  }),
});

// Combine schemas based on selected capabilities
const createAgentSchema = (capabilities: string[]) => {
  let schema = baseAgentSchema;

  if (capabilities.includes("content_generation")) {
    schema = schema.merge(contentGenerationSchema);
  }
  if (capabilities.includes("data_analysis")) {
    schema = schema.merge(dataAnalysisSchema);
  }
  if (capabilities.includes("image_generation")) {
    schema = schema.merge(imageGenerationSchema);
  }

  return schema;
};

export default function AgentRegistrationWizard() {
  const [open, setOpen] = useState(false);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");

  const form = useForm({
    resolver: zodResolver(createAgentSchema(selectedCapabilities)),
    defaultValues: {
      name: "",
      description: "",
      capabilities: [],
      aiConfig: {
        model: "gpt-4",
        temperature: 0.7,
      },
      contentGeneration: {
        style: "balanced",
        tone: "professional",
        wordCountMin: 500,
        wordCountMax: 2000,
        topics: [],
        researchDepth: 3,
        instructions: "",
      },
      dataAnalysis: {
        dataTypes: [],
        analysisTypes: [],
        visualizationTypes: [],
        automationLevel: "manual",
      },
      imageGeneration: {
        styles: [],
        formats: [],
        dimensions: "square",
        quality: "standard",
      },
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: any) => {
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
      setOpen(false);
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

  const handleCapabilityChange = (capability: string) => {
    const newCapabilities = selectedCapabilities.includes(capability)
      ? selectedCapabilities.filter(c => c !== capability)
      : [...selectedCapabilities, capability];

    setSelectedCapabilities(newCapabilities);
    form.setValue("capabilities", newCapabilities);
  };

  return (
    <>
      <Button
        variant="default"
        size="lg"
        className="bg-orange-500 hover:bg-orange-600"
        onClick={() => setOpen(true)}
      >
        <PlusCircle className="w-5 h-5 mr-2" />
        Register New Agent
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Register New AI Agent</DialogTitle>
            <DialogDescription>
              Create a new AI agent by configuring its capabilities and settings
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>

            <div className="overflow-y-auto h-[60vh] -mx-6 px-6">
              <Form {...form}>
                <form className="space-y-6 py-4">
                  <TabsContent value="basic" className="mt-4">
                    <div className="space-y-4">
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
                        name="aiConfig.model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>AI Model</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select AI model" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="gpt-4">GPT-4</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                <SelectItem value="claude-2">Claude 2</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="aiConfig.temperature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Temperature</FormLabel>
                            <FormControl>
                              <Input type="number" step={0.1} min={0} max={1} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="capabilities" className="mt-4">
                    <div className="space-y-4">
                      <FormItem className="space-y-4">
                        <FormLabel>Select Agent Capabilities</FormLabel>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedCapabilities.includes("content_generation")}
                              onCheckedChange={() => handleCapabilityChange("content_generation")}
                            />
                            <label>Content Generation</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedCapabilities.includes("data_analysis")}
                              onCheckedChange={() => handleCapabilityChange("data_analysis")}
                            />
                            <label>Data Analysis</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedCapabilities.includes("image_generation")}
                              onCheckedChange={() => handleCapabilityChange("image_generation")}
                            />
                            <label>Image Generation</label>
                          </div>
                        </div>
                      </FormItem>
                    </div>
                  </TabsContent>

                  <TabsContent value="config" className="mt-4">
                    <Accordion type="single" collapsible className="w-full">
                      {selectedCapabilities.includes("content_generation") && (
                        <AccordionItem value="content">
                          <AccordionTrigger>Content Generation Settings</AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4">
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
                                    value={form.getValues("contentGeneration.topics").join(", ")}
                                    onChange={(e) => form.setValue("contentGeneration.topics", e.target.value.split(",").map(s => s.trim()).filter(s => s.length > 0))}
                                    placeholder="Add topics separated by commas..."
                                  />
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
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {selectedCapabilities.includes("data_analysis") && (
                        <AccordionItem value="data">
                          <AccordionTrigger>Data Analysis Settings</AccordionTrigger>
                          <AccordionContent>
                            {/* Add data analysis configuration fields */}
                          </AccordionContent>
                        </AccordionItem>
                      )}

                      {selectedCapabilities.includes("image_generation") && (
                        <AccordionItem value="image">
                          <AccordionTrigger>Image Generation Settings</AccordionTrigger>
                          <AccordionContent>
                            {/* Add image generation configuration fields */}
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </Accordion>
                  </TabsContent>
                </form>
              </Form>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t mt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit((data) => createAgentMutation.mutate(data))}
                disabled={createAgentMutation.isPending}
              >
                {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
              </Button>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}