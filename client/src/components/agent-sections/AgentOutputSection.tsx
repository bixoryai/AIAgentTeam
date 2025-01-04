import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import type { AgentOutputSectionProps } from "./types";

export default function AgentOutputSection({
  outputs,
  onOutputAction,
  supportedFormats,
  filterOptions = [],
  sortOptions = []
}: AgentOutputSectionProps) {
  const [currentFilter, setCurrentFilter] = useState<Record<string, string>>({});
  const [currentSort, setCurrentSort] = useState<string>("");

  // Apply filters and sorting
  const processedOutputs = outputs
    .filter(output => {
      return Object.entries(currentFilter).every(([key, value]) => {
        return !value || output[key] === value;
      });
    })
    .sort((a, b) => {
      if (!currentSort) return 0;
      return a[currentSort] > b[currentSort] ? 1 : -1;
    });

  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generated Outputs</CardTitle>
          <div className="flex items-center gap-2">
            {/* Filter Controls */}
            {filterOptions.map((filter) => (
              <Select
                key={filter.key}
                value={currentFilter[filter.key] || ""}
                onValueChange={(value) => 
                  setCurrentFilter(prev => ({ ...prev, [filter.key]: value }))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All {filter.label}</SelectItem>
                  {filter.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}

            {/* Sort Control */}
            {sortOptions.length > 0 && (
              <Select
                value={currentSort}
                onValueChange={setCurrentSort}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default</SelectItem>
                  {sortOptions.map((sort) => (
                    <SelectItem key={sort.key} value={sort.key}>
                      {sort.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md">
          <div className="space-y-4 p-4">
            {processedOutputs.length === 0 ? (
              <p className="text-center text-muted-foreground">No outputs available</p>
            ) : (
              processedOutputs.map((output) => (
                <Card key={output.id} className="p-4">
                  {/* Render output content based on format */}
                  {supportedFormats.includes(output.format) ? (
                    <div className="space-y-2">
                      <h3 className="font-medium">{output.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {output.description}
                      </p>
                      <div className="flex justify-end gap-2">
                        {/* Output actions */}
                        {['view', 'download', 'delete'].map((action) => (
                          <button
                            key={action}
                            onClick={() => onOutputAction(action, output.id)}
                            className="text-sm text-blue-500 hover:text-blue-700"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Unsupported format: {output.format}
                    </p>
                  )}
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
