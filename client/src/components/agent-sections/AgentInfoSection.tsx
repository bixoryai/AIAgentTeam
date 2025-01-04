import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import type { AgentInfoSectionProps } from "./types";
import PerformanceAnalyticsDialog from "../PerformanceAnalyticsDialog";
import { useState } from "react";

export default function AgentInfoSection({
  name,
  description,
  metadata,
  status,
  isRegistered,
  onRegister
}: AgentInfoSectionProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const getStatusColor = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case "initializing":
      case "researching":
        return "secondary";
      case "ready":
      case "idle":
        return "default";
      case "error":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="space-y-2 text-center w-full">
          <div className="flex items-center gap-3 justify-between">
            <div className="flex-1 flex justify-start">
              <PerformanceAnalyticsDialog agent={{ name, status, metadata }} />
            </div>
            <h1 className="text-3xl font-bold flex-1 text-center">{name}</h1>
            <div className="flex-1 flex items-center justify-end gap-2">
              {isRegistered ? (
                <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Registered
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  onClick={onRegister}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete
                </Button>
              )}
              <Badge
                variant={getStatusColor(status)}
                className={status === "ready" || status === "idle"
                  ? "bg-green-500 hover:bg-green-600"
                  : ""}
              >
                {status}
              </Badge>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">{description}</p>
        </div>
      </div>

      {/* Configuration Section */}
      <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            <Settings2 className="w-4 h-4 mr-2" />
            Configuration
            {isConfigOpen ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-4">
            <CardContent className="pt-6">
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium">Version</dt>
                  <dd className="text-sm text-muted-foreground">{metadata.version}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Last Updated</dt>
                  <dd className="text-sm text-muted-foreground">
                    {new Date(metadata.lastUpdated).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium">Capabilities</dt>
                  <dd className="text-sm text-muted-foreground">
                    <ul className="list-disc list-inside">
                      {metadata.capabilities.map((cap, idx) => (
                        <li key={idx}>{cap}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                {Object.entries(metadata.configurationOptions).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium">{key}</dt>
                    <dd className="text-sm text-muted-foreground">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
