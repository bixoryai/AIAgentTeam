import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { BlogPost } from "@db/schema";
import { format } from "date-fns";

interface BlogPostViewProps {
  post: BlogPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function BlogPostView({ post, open, onOpenChange }: BlogPostViewProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post.title}</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{format(new Date(post.createdAt), "PPP")}</span>
            <span>•</span>
            <span>{post.wordCount} words</span>
          </div>
        </DialogHeader>
        
        <div className="prose prose-sm dark:prose-invert">
          {post.content.split("\n").map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {post.metadata && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-sm font-medium mb-2">Metadata</h4>
            <dl className="text-sm">
              <div className="grid grid-cols-2 gap-1">
                <dt className="text-muted-foreground">Status:</dt>
                <dd>{post.metadata.status}</dd>
                {post.metadata.generatedAt && (
                  <>
                    <dt className="text-muted-foreground">Generated:</dt>
                    <dd>{format(new Date(post.metadata.generatedAt), "PPP")}</dd>
                  </>
                )}
                {post.metadata.topicFocus && (
                  <>
                    <dt className="text-muted-foreground">Topics:</dt>
                    <dd>{post.metadata.topicFocus.join(", ")}</dd>
                  </>
                )}
                {post.metadata.style && (
                  <>
                    <dt className="text-muted-foreground">Style:</dt>
                    <dd>{post.metadata.style}</dd>
                  </>
                )}
              </div>
            </dl>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
