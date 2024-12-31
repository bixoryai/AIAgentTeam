import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface GenerationProgressProps {
  status: string;
}

export default function GenerationProgress({ status }: GenerationProgressProps) {
  if (status !== "researching") return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <CardTitle className="text-lg">Generating Content</CardTitle>
        </div>
        <CardDescription>
          The AI agent is currently working on your content request
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span className="text-muted-foreground">
                {status === "researching" ? "Researching & Writing" : "Done"}
              </span>
            </div>
            <Progress value={status === "researching" ? 66 : 100} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
