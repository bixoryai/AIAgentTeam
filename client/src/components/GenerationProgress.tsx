import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Search, Edit3 } from "lucide-react";

interface GenerationProgressProps {
  status: string;
}

export default function GenerationProgress({ status }: GenerationProgressProps) {
  if (status !== "researching" && status !== "generating") return null;

  const isResearching = status === "researching";
  const progressValue = isResearching ? 33 : 66;
  const stage = isResearching ? "Research" : "Content Generation";
  const description = isResearching 
    ? "Gathering relevant information and insights..."
    : "Creating high-quality content based on research...";

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
                {isResearching ? (
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
            <Progress value={progressValue} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              This process typically takes 1-2 minutes to complete.
              The content will appear in the Generated Posts section when ready.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}