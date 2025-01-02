import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Edit3, CheckCircle } from "lucide-react";

interface GenerationProgressProps {
  status: string;
  lastUpdateTime?: string;
}

export default function GenerationProgress({ status, lastUpdateTime }: GenerationProgressProps) {
  // Show for any active generation status including completed
  if (!["researching", "generating", "initializing", "completed"].includes(status)) {
    return null;
  }

  const isResearching = status === "researching" || status === "initializing";
  const isGenerating = status === "generating";
  const isCompleted = status === "completed";

  // Progressive status display
  const progressValue = isCompleted ? 100 : isGenerating ? 66 : 33;
  const stage = isCompleted ? "Completed" : isGenerating ? "Content Generation" : "Research";
  const description = isCompleted 
    ? "Content has been generated successfully!"
    : isGenerating 
      ? "Creating high-quality content based on research..."
      : "Gathering relevant information and insights...";

  return (
    <Card className={`mb-6 border-primary/20 transition-all duration-300 ${
      isCompleted ? "bg-green-50 border-green-200" : ""
    }`}>
      <CardHeader>
        <div className="flex items-center space-x-2">
          {isCompleted ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <CardTitle className="text-lg">
            {isCompleted ? "Content Generation Complete" : "Content Generation in Progress"}
          </CardTitle>
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
                {isCompleted ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Complete
                  </>
                ) : isGenerating ? (
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
            <Progress 
              value={progressValue} 
              className={`h-2 ${isCompleted ? "bg-green-100" : ""}`}
            />
            <div className="mt-2 text-xs text-muted-foreground">
              {lastUpdateTime ? (
                <p>Last updated: {new Date(lastUpdateTime).toLocaleString()}</p>
              ) : (
                <p>Starting generation process...</p>
              )}
              {!isCompleted && (
                <p className="mt-1">This process typically takes 1-2 minutes to complete.</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}