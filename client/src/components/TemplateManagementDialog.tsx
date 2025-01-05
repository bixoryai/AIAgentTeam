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
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { Template } from "@db/schema";
import { useState } from "react";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  parameters: z.object({
    wordCount: z.coerce.number().min(100, "Minimum word count is 100").max(5000, "Maximum word count is 5000"),
    style: z.enum(["formal", "casual", "balanced", "technical", "creative"]),
    tone: z.enum(["professional", "friendly", "authoritative", "conversational"]),
  }),
});

type TemplateForm = z.infer<typeof templateSchema>;

interface TemplateManagementDialogProps {
  agentId: number;
  template?: Template;
  mode?: "create" | "edit" | "delete";
  iconOnly?: boolean;
}

export default function TemplateManagementDialog({ 
  agentId, 
  template,
  mode = "create",
  iconOnly = false
}: TemplateManagementDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: template ? {
      name: template.name,
      description: template.description,
      parameters: template.parameters,
    } : {
      name: "",
      description: "",
      parameters: {
        wordCount: 1000,
        style: "balanced",
        tone: "professional",
      },
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (values: TemplateForm) => {
      const res = await fetch(`/api/agents/${agentId}/templates`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}/templates`] });
      toast({
        title: "Template Created",
        description: "Your new template has been saved successfully.",
      });
      form.reset();
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async (values: TemplateForm) => {
      if (!template) return;
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}/templates`] });
      toast({
        title: "Template Updated",
        description: "Your template has been updated successfully.",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!template) return;
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/agents/${agentId}/templates`] });
      toast({
        title: "Template Deleted",
        description: "Your template has been deleted successfully.",
      });
      setIsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (values: TemplateForm) => {
    if (mode === "edit") {
      await updateTemplateMutation.mutateAsync(values);
    } else {
      await createTemplateMutation.mutateAsync(values);
    }
  };

  if (mode === "delete") {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild onClick={(e) => { e.stopPropagation(); }}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive"
              onClick={() => deleteTemplateMutation.mutate()}
              disabled={deleteTemplateMutation.isPending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const triggerButton = (
    <Button
      variant={iconOnly ? "ghost" : "outline"}
      size={iconOnly ? "icon" : "sm"}
      className={iconOnly ? "h-8 w-8" : "gap-2"}
      onClick={(e) => { if (iconOnly) e.stopPropagation(); }}
    >
      {mode === "edit" ? (
        iconOnly ? (
          <Pencil className="h-4 w-4" />
        ) : (
          <>
            <Pencil className="h-4 w-4" />
            Edit Template
          </>
        )
      ) : (
        <>
          <Plus className="h-4 w-4" />
          {!iconOnly && "New Template"}
        </>
      )}
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {mode === "edit" ? 
              "Modify your template settings." :
              "Create a new template with predefined settings for content generation."
            }
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Technical Blog Post" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your template a descriptive name
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
                    <Input placeholder="Describe the purpose of this template" {...field} />
                  </FormControl>
                  <FormDescription>
                    Explain what kind of content this template is best suited for
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parameters.wordCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Word Count</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={100}
                      max={5000}
                      placeholder="Enter default word count"
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
              name="parameters.style"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Style</FormLabel>
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
                    Choose the default writing style
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parameters.tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Tone</FormLabel>
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
                    Choose the default tone
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
              className="w-full"
            >
              {mode === "edit" ? "Update Template" : "Create Template"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}