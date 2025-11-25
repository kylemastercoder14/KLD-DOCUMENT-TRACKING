"use client";

import { useCallback } from "react";
import {
  MoreHorizontal,
  Eye,
  History,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { useState } from "react";

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

  const invalidateDocuments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement delete document action
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id };
    },
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

  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory(data);
    } else {
      toast.info("View history functionality coming soon");
    }
  };

  const handleComment = () => {
    if (onComment) {
      onComment(data);
    } else {
      toast.info("Comment functionality coming soon");
    }
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
        <DropdownMenuContent align="end">
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

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              document "{data.title}" (Reference: {data.referenceId}).
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
    </>
  );
};

