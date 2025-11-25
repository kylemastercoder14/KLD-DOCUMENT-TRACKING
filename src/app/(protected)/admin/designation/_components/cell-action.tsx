"use client";

import { useCallback } from "react";
import {
  ArchiveIcon,
  EditIcon,
  MoreHorizontal,
  RefreshCcw,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { DesignationWithDocuments } from "@/types";
import { archiveDesignation, restoreDesignation } from "@/actions/designation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CellActionProps = {
  data: DesignationWithDocuments;
  onEdit: (designation: DesignationWithDocuments) => void;
};

export const CellAction = ({ data, onEdit }: CellActionProps) => {
  const queryClient = useQueryClient();

  const invalidateDesignations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["designations"] });
  }, [queryClient]);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveDesignation(id),
    onSuccess: () => {
      toast.success("Designation archived");
      invalidateDesignations();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to archive designation");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreDesignation(id),
    onSuccess: () => {
      toast.success("Designation restored");
      invalidateDesignations();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to restore designation");
    },
  });

  const handleArchive = () => archiveMutation.mutate(data.id);
  const handleRestore = () => restoreMutation.mutate(data.id);

  return (
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

        <DropdownMenuSeparator />

        {data.isActive ? (
          <DropdownMenuItem
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
          >
            <ArchiveIcon className="size-4" />
            Archive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={handleRestore}
            disabled={restoreMutation.isPending}
          >
            <RefreshCcw className="size-4" />
            Restore
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
