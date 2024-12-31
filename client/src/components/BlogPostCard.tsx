import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import type { BlogPost } from "@db/schema";
import { format } from "date-fns";

interface BlogPostCardProps {
  post: BlogPost;
  onView: () => void;
}

export default function BlogPostCard({ post, onView }: BlogPostCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold leading-none">{post.title}</h3>
          <p className="text-sm text-muted-foreground">
            {format(new Date(post.createdAt), "PPP")}
          </p>
        </div>
        <Badge variant={post.metadata?.status === "completed" ? "default" : "secondary"}>
          {post.metadata?.status || "pending"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {post.wordCount} words
          </p>
          <Button variant="ghost" size="sm" onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            View Content
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
