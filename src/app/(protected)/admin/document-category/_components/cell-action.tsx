"use client";

import { useCallback, useState } from "react";
import {
  ArchiveIcon,
  EditIcon,
  MoreHorizontal,
  RefreshCcw,
  Upload,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { DocumentCategoryWithDesignations } from "@/types";
import {
  archiveDocumentCategory,
  restoreDocumentCategory,
} from "@/actions/document-category";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateUploadDialog } from "./template-upload-dialog";

type CellActionProps = {
  data: DocumentCategoryWithDesignations;
  onEdit: (category: DocumentCategoryWithDesignations) => void;
};

export const CellAction = ({ data, onEdit }: CellActionProps) => {
  const queryClient = useQueryClient();
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["document-categories"] });
  }, [queryClient]);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveDocumentCategory(id),
    onSuccess: () => {
      toast.success("Document category archived");
      invalidate();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to archive document category");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreDocumentCategory(id),
    onSuccess: () => {
      toast.success("Document category restored");
      invalidate();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to restore document category");
    },
  });

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
          <DropdownMenuItem onClick={() => onEdit(data)}>
            <EditIcon className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsTemplateDialogOpen(true)}>
            <Upload className="size-4" />
            {data.attachment ? "Update Template" : "Upload Template"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {data.isActive ? (
            <DropdownMenuItem
              onClick={() => archiveMutation.mutate(data.id)}
              disabled={archiveMutation.isPending}
            >
              <ArchiveIcon className="size-4" />
              Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => restoreMutation.mutate(data.id)}
              disabled={restoreMutation.isPending}
            >
              <RefreshCcw className="size-4" />
              Restore
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TemplateUploadDialog
        category={data}
        isOpen={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
      />
    </>
  );
};

