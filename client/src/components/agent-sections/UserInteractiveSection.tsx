import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Zap } from "lucide-react";
import type { UserInteractiveSectionProps } from "./types";

export default function UserInteractiveSection({
  onAction,
  supportedActions,
  templates = [],
  favorites = []
}: UserInteractiveSectionProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <CardTitle>Interactive Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-medium mb-2">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {supportedActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                onClick={() => onAction(action, {})}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                {action}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Section */}
        {templates.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Templates</h3>
            <ScrollArea className="h-[200px] rounded-md border p-4">
              <div className="space-y-4">
                {templates.map((template) => (
                  <Card key={template.id} className="p-4 cursor-pointer hover:bg-accent"
                    onClick={() => onAction('useTemplate', template)}>
                    <h4 className="font-medium">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Favorites</h3>
            <div className="flex flex-wrap gap-2">
              {favorites.map((favorite) => (
                <Button
                  key={favorite.id}
                  variant="outline"
                  onClick={() => onAction('useFavorite', favorite)}
                  className="flex items-center gap-2"
                >
                  <Star className="w-4 h-4 text-yellow-500" />
                  {favorite.name}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
