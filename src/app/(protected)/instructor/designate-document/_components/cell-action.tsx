/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useMemo, useState } from "react";
import {
  MoreHorizontal,
  Eye,
  History,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Document } from "./columns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProcessingHistory } from "@/app/(protected)/instructor/document-tracking/_components/processing-history";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentHistory } from "@/types";
import { DocumentComments } from "./document-comments";
import { deleteDocumentById } from "@/actions/document";

type CellActionProps = {
  data: Document;
  onViewFile?: (document: Document) => void;
  onViewHistory?: (document: Document) => void;
  onComment?: (document: Document) => void;
  onDelete?: (document: Document) => void;
};

export const CellAction = ({
  data,
  onViewFile,
  onViewHistory,
  onComment,
  onDelete,
}: CellActionProps) => {
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<DocumentHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Get current user ID to check ownership
  const { data: currentUser } = useQuery<{ userId: string }>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await fetch("/api/current-user");
      if (!response.ok) {
        throw new Error("Failed to get current user");
      }
      return response.json();
    },
  });

  // Check if current user is the owner
  const isOwner = useMemo(() => {
    if (!currentUser?.userId || !data.submittedById) {
      return false;
    }
    return currentUser.userId === data.submittedById;
  }, [currentUser?.userId, data.submittedById]);

  const invalidateDocuments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteDocumentById(id),
    onSuccess: () => {
      toast.success("Document deleted");
      invalidateDocuments();
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete document");
    },
  });

  const handleDelete = () => {
    // Double-check ownership before deleting
    if (!isOwner) {
      toast.error("You are not allowed to delete this document. Only the document owner can delete it.");
      return;
    }
    if (onDelete) {
      onDelete(data);
    } else {
      deleteMutation.mutate(data.id);
    }
  };

  const handleViewFile = () => {
    if (onViewFile) {
      onViewFile(data);
    } else {
      toast.info("View file functionality coming soon");
    }
  };

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/document-history?documentId=${data.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch file history");
      }
      const payload = await response.json();
      const normalizedHistory: DocumentHistory[] = (payload.history ?? []).map(
        (entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        })
      );
      setHistoryEntries(normalizedHistory);
    } catch (error) {
      console.error(error);
      setHistoryError("Unable to load file history. Please try again later.");
      setHistoryEntries([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [data.id]);

  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory(data);
      return;
    }
    setIsHistoryDialogOpen(true);
    loadHistory();
  };

  const handleComment = () => {
    if (onComment) {
      onComment(data);
      return;
    }
    setIsCommentsDialogOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 ml-2.5">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className='w-48'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          <DropdownMenuItem onClick={handleViewFile}>
            <Eye className="size-4" />
            View File
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleViewHistory}>
            <History className="size-4" />
            File History
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleComment}>
            <MessageSquare className="size-4" />
            Comment
          </DropdownMenuItem>

          {isOwner && (
            <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            document "{data.attachmentName}" (Reference: {data.referenceId}).
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isHistoryDialogOpen}
        onOpenChange={(open) => {
          setIsHistoryDialogOpen(open);
          if (!open) {
            setHistoryEntries([]);
            setHistoryError(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl!">
          <DialogHeader>
            <DialogTitle>File History • {data.referenceId}</DialogTitle>
          </DialogHeader>
          {isHistoryLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading history...
            </div>
          ) : historyEntries.length ? (
            <ScrollArea className="max-h-[60vh] pr-4">
              <ProcessingHistory history={historyEntries} />
            </ScrollArea>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No history has been recorded for this file yet.
            </div>
          )}
          {historyError && (
            <p className="text-sm text-destructive mt-2">{historyError}</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCommentsDialogOpen}
        onOpenChange={setIsCommentsDialogOpen}
      >
        <DialogContent className="max-w-3xl! flex flex-col">
          <DialogHeader>
            <DialogTitle>Comments • {data.referenceId}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[200px] overflow-hidden">
            <DocumentComments documentId={data.id} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

