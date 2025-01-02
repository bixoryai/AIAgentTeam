import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Edit3, CheckCircle } from "lucide-react";

interface GenerationProgressProps {
  status: string;
  lastUpdateTime?: string;
}

export default function GenerationProgress({ status, lastUpdateTime }: GenerationProgressProps) {
  if (!["researching", "generating", "completed"].includes(status)) return null;

  const isResearching = status === "researching";
  const isCompleted = status === "completed";
  const progressValue = isCompleted ? 100 : isResearching ? 33 : 66;
  const stage = isCompleted ? "Completed" : isResearching ? "Research" : "Content Generation";
  const description = isCompleted 
    ? "Content has been generated successfully!"
    : isResearching 
      ? "Gathering relevant information and insights..."
      : "Creating high-quality content based on research...";

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
                ) : isResearching ? (
                  <>
                    <Search className="h-4 w-4" />
                    Researching Topic
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4" />
                    Writing Content
                  </>
                )}
              </span>
            </div>
            <Progress 
              value={progressValue} 
              className={`h-2 ${isCompleted ? "bg-green-100" : ""}`}
            />
            {lastUpdateTime && (
              <p className="text-xs text-muted-foreground mt-2">
                Last updated: {new Date(lastUpdateTime).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}