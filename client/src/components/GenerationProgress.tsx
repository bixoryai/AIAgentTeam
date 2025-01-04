import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Edit3 } from "lucide-react";

interface GenerationProgressProps {
  status: string;
  lastUpdateTime?: string;
}

export default function GenerationProgress({ status, lastUpdateTime }: GenerationProgressProps) {
  const isResearching = status === "researching" || status === "initializing";
  const isGenerating = status === "generating";
  const isCompleted = status === "ready" || status === "completed" || status === "idle";

  // Calculate progress value based on status
  const progressValue = isCompleted ? 100 : isGenerating ? 66 : 33;

  // Get appropriate stage and description
  const stage = isCompleted ? "Completed" : isGenerating ? "Content Generation" : "Research";
  const description = isCompleted 
    ? "Content has been generated successfully!"
    : isGenerating 
      ? "Creating high-quality content based on research..."
      : "Gathering relevant information and insights...";

  // Don't render if completed
  if (isCompleted) return null;

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <CardTitle className="text-lg">Content Generation in Progress</CardTitle>
        </div>
        <CardDescription>
          Stage: {stage} - {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Generation Progress</span>
              <span className="text-muted-foreground flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Writing Content
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Researching Topic
                  </>
                )}
              </span>
            </div>
            <Progress value={progressValue} />
            <div className="mt-2 text-xs text-muted-foreground">
              {lastUpdateTime ? (
                <p>Last updated: {new Date(lastUpdateTime).toLocaleString()}</p>
              ) : (
                <p>Starting generation process...</p>
              )}
              <p className="mt-1">This process typically takes 1-2 minutes to complete.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}