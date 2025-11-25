"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    designation: string | null;
  };
};

interface DocumentCommentsProps {
  documentId: string;
}

export function DocumentComments({
  documentId,
}: DocumentCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const loadComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/document-comments?documentId=${documentId}`
      );
      if (!response.ok) {
        throw new Error("Failed to load comments");
      }
      const data = await response.json();
      setComments(data.comments ?? []);
    } catch (err) {
      console.error(err);
      setError("Unable to load comments. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [documentId]);

  useEffect(() => {
    // Scroll to bottom when new comments are added
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/document-comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          content: newComment.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add comment");
      }

      const data = await response.json();
      setComments((prev) => [...prev, data.comment]);
      setNewComment("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to add comment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "PRESIDENT":
        return "default";
      case "VPAA":
      case "VPADA":
        return "secondary";
      case "DEAN":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No comments yet. Be the first to comment!
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {comments.map((comment, index) => (
                <div key={comment.id}>
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(comment.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.user.name}
                        </span>
                        <Badge
                          variant={getRoleBadgeVariant(comment.user.role)}
                          className="text-xs"
                        >
                          {comment.user.role}
                        </Badge>
                        {comment.user.designation && (
                          <span className="text-xs text-muted-foreground">
                            • {comment.user.designation}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(comment.createdAt), "PPpp")}
                      </p>
                    </div>
                  </div>
                  {index < comments.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {error && (
        <div className="mt-2 p-2 text-sm text-destructive bg-destructive/10 rounded">
          {error}
        </div>
      )}

      <Separator className="my-4" />

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
          className="min-h-[100px] resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit(e);
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            size="sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post Comment
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          Press Ctrl+Enter to submit
        </p>
      </form>
    </div>
  );
}

