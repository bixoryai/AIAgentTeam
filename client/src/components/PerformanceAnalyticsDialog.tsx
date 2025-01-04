import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart } from "lucide-react";
import { Agent } from "@db/schema";
import AgentAnalytics from "./AgentAnalytics";

interface PerformanceAnalyticsDialogProps {
  agent: Agent;
}

export default function PerformanceAnalyticsDialog({ agent }: PerformanceAnalyticsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BarChart className="h-4 w-4" />
          Performance Metrics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Performance Analytics</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <AgentAnalytics agent={agent} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
