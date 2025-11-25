"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Heading from "@/components/heading";
import { DesignationForm } from "@/components/forms/designation-form";
import { ArchiveIcon, Plus } from "lucide-react";
import { DesignationWithDocuments } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkArchiveDesignations, getDesignations } from "@/actions/designation";
import { DataTable } from "@/components/data-table";
import { designationColumns } from "./columns";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconAlertTriangle } from "@tabler/icons-react";
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
import { toast } from "sonner";

export const Client = () => {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DesignationWithDocuments[]>({
    queryKey: ["designations"],
    queryFn: getDesignations,
  });
  const queryClient = useQueryClient();

  const [selectedDesignation, setSelectedDesignation] =
    useState<DesignationWithDocuments | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<DesignationWithDocuments[]>(
    []
  );
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [tableResetKey, setTableResetKey] = useState(0);

  const handleEditDesignation = useCallback(
    (designation: DesignationWithDocuments) => {
      setSelectedDesignation(designation);
      setIsDrawerOpen(true);
    },
    []
  );

  const handleCreateDesignation = useCallback(() => {
    setSelectedDesignation(null);
    setIsDrawerOpen(true);
  }, []);

  const columns = useMemo(
    () => designationColumns({ onEdit: handleEditDesignation }),
    [handleEditDesignation]
  );

  const bulkArchiveMutation = useMutation({
    mutationFn: (ids: string[]) => bulkArchiveDesignations(ids),
    onSuccess: (result) => {
      toast.success(
        `${result.count} designation${result.count === 1 ? "" : "s"} archived`
      );
      queryClient.invalidateQueries({ queryKey: ["designations"] });
      setIsBulkDialogOpen(false);
      setSelectedRows([]);
      setTableResetKey((prev) => prev + 1);
    },
    onError: (mutationError) => {
      console.error(mutationError);
      toast.error("Failed to archive selected designations");
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
          title="Manage Designations"
          description="Configure designation records and their document permissions."
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="destructive"
            disabled={!selectedRows.length}
            onClick={() => setIsBulkDialogOpen(true)}
          >
            <ArchiveIcon className='size-4' />Archive Selected
            {selectedRows.length ? ` (${selectedRows.length})` : ""}
          </Button>
          <Button onClick={handleCreateDesignation} variant="primary">
            <Plus className="h-4 w-4" />
            Create New Designation
          </Button>
        </div>
      </div>

      <DesignationForm
        initialData={selectedDesignation}
        isDrawerOpen={isDrawerOpen}
        setIsDrawerOpenAction={setIsDrawerOpen}
      />

      <div>
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : isError ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconAlertTriangle />
              </EmptyMedia>
              <EmptyTitle>Unable to load designations</EmptyTitle>
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
              <EmptyMedia variant="icon">
                <IconAlertTriangle />
              </EmptyMedia>
              <EmptyTitle>No designations found</EmptyTitle>
              <EmptyDescription>
                Create your first designation to start assigning document
                access.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="secondary" size="sm" onClick={handleCreateDesignation}>
                Add designation
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </div>

      <AlertDialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive selected designations?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will mark {selectedRows.length} designation
              {selectedRows.length === 1 ? "" : "s"} as inactive. You can restore
              them later individually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkArchiveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkArchive}
              disabled={
                !selectedRows.length || bulkArchiveMutation.isPending
              }
            >
              {bulkArchiveMutation.isPending ? "Archiving..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
