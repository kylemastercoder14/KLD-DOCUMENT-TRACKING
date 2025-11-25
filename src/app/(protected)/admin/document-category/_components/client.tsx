"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArchiveIcon, Plus } from "lucide-react";

import { getDocumentCategories, bulkArchiveDocumentCategories } from "@/actions/document-category";
import { DocumentCategoryWithDesignations } from "@/types";
import { DataTable } from "@/components/data-table";
import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
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
import { DocumentCategoryForm } from "@/components/forms/document-category-form";
import { documentCategoryColumns } from "./columns";

export const Client = () => {
  const queryClient = useQueryClient();
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DocumentCategoryWithDesignations[]>({
    queryKey: ["document-categories"],
    queryFn: getDocumentCategories,
  });

  const [selectedRows, setSelectedRows] = useState<
    DocumentCategoryWithDesignations[]
  >([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<DocumentCategoryWithDesignations | null>(null);
  const [tableResetKey, setTableResetKey] = useState(0);

  const handleCreate = () => {
    setSelectedCategory(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = useCallback(
    (category: DocumentCategoryWithDesignations) => {
      setSelectedCategory(category);
      setIsDrawerOpen(true);
    },
    []
  );

  const columns = useMemo(
    () => documentCategoryColumns({ onEdit: handleEdit }),
    [handleEdit]
  );

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => bulkArchiveDocumentCategories(ids),
    onSuccess: (result) => {
      toast.success(
        `${result.count} document categor${
          result.count === 1 ? "y" : "ies"
        } archived`
      );
      queryClient.invalidateQueries({ queryKey: ["document-categories"] });
      setSelectedRows([]);
      setIsBulkDialogOpen(false);
      setTableResetKey((prev) => prev + 1);
    },
    onError: (mutationError) => {
      console.error(mutationError);
      toast.error("Failed to archive selected document categories");
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
          title="Document Categories"
          description="Manage document categories and their designation access."
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
            Create Document Category
          </Button>
        </div>
      </div>

      <DocumentCategoryForm
        initialData={selectedCategory}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpenAction={setIsDrawerOpen}
      />

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">!</EmptyMedia>
            <EmptyTitle>Unable to load document categories</EmptyTitle>
            <EmptyDescription>
              {(error as Error)?.message ??
                "Please check your connection and try again."}
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
            <EmptyTitle>No document categories yet</EmptyTitle>
            <EmptyDescription>
              Create your first document category to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="secondary" size="sm" onClick={handleCreate}>
              Add document category
            </Button>
          </EmptyContent>
        </Empty>
      )}

      <AlertDialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive selected categories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedRows.length} document categor
              {selectedRows.length === 1 ? "y" : "ies"} as inactive. You can
              restore them later from the actions menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkArchiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                !selectedRows.length || bulkArchiveMutation.isPending
              }
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

