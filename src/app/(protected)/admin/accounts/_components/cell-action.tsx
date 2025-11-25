"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveIcon, EditIcon, MoreHorizontal, RefreshCcw } from "lucide-react";

import { UserWithDesignation } from "@/types";
import { archiveAccount, restoreAccount } from "@/actions/account";
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
  data: UserWithDesignation;
  onEdit: (account: UserWithDesignation) => void;
};

export const CellAction = ({ data, onEdit }: CellActionProps) => {
  const queryClient = useQueryClient();

  const invalidateAccounts = () =>
    queryClient.invalidateQueries({ queryKey: ["accounts"] });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveAccount(id),
    onSuccess: () => {
      toast.success("Account archived");
      invalidateAccounts();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to archive account");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreAccount(id),
    onSuccess: () => {
      toast.success("Account restored");
      invalidateAccounts();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to restore account");
    },
  });

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
  );
};

