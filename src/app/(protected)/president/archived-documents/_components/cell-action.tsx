"use client";

import { useCallback, useState } from "react";
import {
  MoreHorizontal,
  Eye,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchivedDocument } from "./columns";
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

type CellActionProps = {
  data: ArchivedDocument;
  onViewFile?: (document: ArchivedDocument) => void;
  onViewHistory?: (document: ArchivedDocument) => void;
  onRestore?: (document: ArchivedDocument) => void;
  onDelete?: (document: ArchivedDocument) => void;
};

export const CellAction = ({
  data,
  onViewFile,
  onViewHistory,
  onRestore,
  onDelete,
}: CellActionProps) => {
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  const invalidateDocuments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["archived-documents"] });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement delete archived document action
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id };
    },
    onSuccess: () => {
      toast.success("Archived document deleted permanently");
      invalidateDocuments();
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete archived document");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      // TODO: Implement restore archived document action
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id };
    },
    onSuccess: () => {
      toast.success("Document restored successfully");
      invalidateDocuments();
      setIsRestoreDialogOpen(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to restore document");
    },
  });

  const handleDelete = () => {
    if (onDelete) {
      onDelete(data);
    } else {
      deleteMutation.mutate(data.id);
    }
  };

  const handleRestore = () => {
    if (onRestore) {
      onRestore(data);
    } else {
      restoreMutation.mutate(data.id);
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

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setIsRestoreDialogOpen(true)}
            className="text-green-600"
          >
            <RotateCcw className="size-4" />
            Restore
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

      {/* Restore Dialog */}
      <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the document "{data.title}" (Reference: {data.referenceId}) back
              to the active documents. The document will be available in the document repository.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {restoreMutation.isPending ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete archived document?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the archived document
              "{data.title}" (Reference: {data.referenceId}).
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

