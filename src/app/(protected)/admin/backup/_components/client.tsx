"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArchiveIcon, DownloadIcon, RefreshCw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

import { getBackups, restoreFromBackup, startBackup } from "@/actions/backup";
import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { BackupUpload } from "@/components/backup-upload";
import { Badge } from "@/components/ui/badge";

type BackupFile = {
  url: string;
  size: number;
  name: string;
};

export const Client = () => {
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["backups"],
    queryFn: getBackups,
  });

  const [restoreFile, setRestoreFile] = useState<BackupFile | null>(null);

  const lastSuccessfulBackup = useMemo(
    () => data.find((backup) => backup.status === "Success"),
    [data]
  );

  const backupMutation = useMutation({
    mutationFn: startBackup,
    onSuccess: () => {
      toast.success("Backup completed");
      refetch();
    },
    onError: (mutationError) => {
      console.error(mutationError);
      toast.error("Failed to start backup");
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreFromBackup,
    onSuccess: () => {
      toast.success("Backup restored");
      setRestoreFile(null);
      refetch();
    },
    onError: (mutationError) => {
      console.error(mutationError);
      toast.error("Failed to restore backup");
    },
  });

  const historyTable = (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
              Backup ID
            </th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
              Date Created
            </th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
              Size
            </th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
              Type
            </th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
              Status
            </th>
            <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {data.length ? (
            data.map((backup) => (
              <tr key={backup.id} className="border-t">
                <td className="px-4 py-3 font-semibold text-foreground">
                  {backup.backupId}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {format(new Date(backup.createdAt), "PPpp")}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {backup.size ? `${backup.size.toFixed(2)} MB` : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{backup.type}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={
                      backup.status === "Failed"
                        ? "destructive"
                        : backup.status === "Warning"
                          ? "outline"
                          : "secondary"
                    }
                    className={
                      backup.status === "Failed"
                        ? "bg-red-50 text-red-600 border-red-100"
                        : backup.status === "Warning"
                          ? "text-amber-600 border-amber-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    }
                  >
                    {backup.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!backup.fileUrl}
                    asChild={!!backup.fileUrl}
                  >
                    {backup.fileUrl ? (
                      <a href={backup.fileUrl} target="_blank" rel="noreferrer">
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    ) : (
                      <>
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No backups created yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <Heading
        title="Backup & Restore"
        description="Manage system data integrity, create snapshots, and recover from data loss."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card/60 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
            <div className="size-2 rounded-full bg-emerald-600" />
            System Active
          </div>
          <h3 className="mt-3 font-serif text-2xl">Create System Backup</h3>
          <p className="text-sm text-muted-foreground">
            Generates a full snapshot of the database and file storage. This process may take a few
            minutes.
          </p>
          <div className="mt-6 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {lastSuccessfulBackup ? (
              <>
                <p>
                  Last successful backup was created{" "}
                  {formatDistanceToNow(new Date(lastSuccessfulBackup.createdAt), {
                    addSuffix: true,
                  })}
                  .
                </p>
                <p>Total size: {lastSuccessfulBackup.size?.toFixed(2) ?? "0.0"} MB</p>
              </>
            ) : (
              <p>No backup has been created yet.</p>
            )}
          </div>
          <Button
            className="mt-6 w-full"
            variant="primary"
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
          >
            <ArchiveIcon className="mr-2 h-4 w-4" />
            {backupMutation.isPending ? "Backing up..." : "Start Backup Now"}
          </Button>
        </div>

        <div className="rounded-2xl border bg-card/60 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
            <RefreshCw className="h-4 w-4" />
            Restore Data
          </div>
          <h3 className="mt-3 font-serif text-2xl">Restore Data</h3>
          <p className="text-sm text-muted-foreground">
            Restore the system from a previous backup file.
          </p>
          <p className="text-sm font-semibold text-destructive">
            Warning: This will overwrite current data.
          </p>

          <div className="mt-6">
            <BackupUpload
              onUploaded={(file) => setRestoreFile(file)}
              maxSizeMb={100}
            />
          </div>
          <Button
            variant="destructive"
            className="mt-6 w-full"
            disabled={!restoreFile || restoreMutation.isPending}
            onClick={() => {
              if (!restoreFile) return;
              restoreMutation.mutate({
                fileUrl: restoreFile.url,
                size: restoreFile.size,
                fileName: restoreFile.name,
              });
            }}
          >
            {restoreMutation.isPending ? "Restoring..." : "Proceed to Restore"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card/60 p-6">
        <h3 className="font-serif text-2xl">Backup History</h3>
        <p className="text-sm text-muted-foreground">
          Track every backup and restore event performed in the system.
        </p>
        <div className="mt-6">
          {isLoading ? (
            <Skeleton className="h-72 w-full" />
          ) : isError ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">!</EmptyMedia>
                <EmptyTitle>Unable to load backups</EmptyTitle>
                <EmptyDescription>
                  {(error as Error)?.message ?? "Please try again later."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="secondary" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            historyTable
          )}
        </div>
      </div>
    </div>
  );
};

