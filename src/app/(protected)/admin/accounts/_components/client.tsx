"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveIcon, Plus } from "lucide-react";
import { toast } from "sonner";

import { getAccounts, bulkArchiveAccounts } from "@/actions/account";
import { UserWithDesignation } from "@/types";
import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AccountForm } from "@/components/forms/account-form";
import { accountColumns } from "./columns";

export const Client = () => {
  const queryClient = useQueryClient();
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<UserWithDesignation[]>({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const [selectedRows, setSelectedRows] = useState<UserWithDesignation[]>([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UserWithDesignation | null>(null);
  const [tableResetKey, setTableResetKey] = useState(0);

  const handleCreate = () => {
    setSelectedAccount(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = useCallback((account: UserWithDesignation) => {
    setSelectedAccount(account);
    setIsDrawerOpen(true);
  }, []);

  const columns = useMemo(
    () => accountColumns({ onEdit: handleEdit }),
    [handleEdit]
  );

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => bulkArchiveAccounts(ids),
    onSuccess: (result) => {
      toast.success(
        `${result.count} account${result.count === 1 ? "" : "s"} archived`
      );
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setSelectedRows([]);
      setIsBulkDialogOpen(false);
      setTableResetKey((prev) => prev + 1);
    },
    onError: (mutationError) => {
      console.error(mutationError);
      toast.error("Failed to archive selected accounts");
      setIsBulkDialogOpen(false);
    },
  });

  const handleBulkArchive = () => {
    if (!selectedRows.length) return;
    bulkArchiveMutation.mutate(selectedRows.map((row) => row.id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Heading
          title="Accounts"
          description="Manage user accounts and their designation access."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            disabled={!selectedRows.length}
            onClick={() => setIsBulkDialogOpen(true)}
          >
            <ArchiveIcon className="size-4" />
            Archive Selected
            {selectedRows.length ? ` (${selectedRows.length})` : ""}
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Create Account
          </Button>
        </div>
      </div>

      <AccountForm
        initialData={selectedAccount}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpenAction={setIsDrawerOpen}
      />

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">!</EmptyMedia>
            <EmptyTitle>Unable to load accounts</EmptyTitle>
            <EmptyDescription>
              {(error as Error)?.message ?? "Please check your connection and try again."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </EmptyContent>
        </Empty>
      ) : data.length ? (
        <DataTable
          key={tableResetKey}
          columns={columns}
          data={data}
          onSelectionChange={setSelectedRows}
        />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">!</EmptyMedia>
            <EmptyTitle>No accounts found</EmptyTitle>
            <EmptyDescription>
              Create your first account to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="secondary" size="sm" onClick={handleCreate}>
              Add account
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <AlertDialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive selected accounts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedRows.length} account
              {selectedRows.length === 1 ? "" : "s"} as inactive. You can restore them later from
              the actions menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkArchiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!selectedRows.length || bulkArchiveMutation.isPending}
              onClick={handleBulkArchive}
            >
              {bulkArchiveMutation.isPending ? "Archiving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

