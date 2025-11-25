"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import Heading from "@/components/heading";
import { DataTable } from "@/components/data-table";
import { archivedDocumentColumns, ArchivedDocument } from "./columns";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconArchive } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, AlertCircle, FileText, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

type ArchivedDocumentsResponse = {
  documents: Array<{
    id: string;
    referenceId: string;
    title: string;
    attachments: string[];
    category: string;
    priority: "Low" | "Medium" | "High";
    status: "Archived";
    createdAt: string;
    archivedAt: string;
  }>;
  analytics: {
    total: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    uniqueCategories: number;
    latestArchivedAt: string | null;
  };
};

export const Client = () => {
  const router = useRouter();
  const [documents, setDocuments] = useState<ArchivedDocument[]>([]);
  const [selectedRows, setSelectedRows] = useState<ArchivedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState({
    total: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0,
    uniqueCategories: 0,
    latestArchivedAt: null as Date | null,
  });

  const fetchArchivedDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/document-archives");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You are not authorized to view archived documents.");
        }
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to load archived documents");
      }

      const payload: ArchivedDocumentsResponse = await response.json();
      const mappedDocs: ArchivedDocument[] = (payload.documents ?? []).map((doc) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
        archivedAt: new Date(doc.archivedAt),
      }));
      setDocuments(mappedDocs);

      const latestDate =
        payload.analytics.latestArchivedAt &&
        !Number.isNaN(Date.parse(payload.analytics.latestArchivedAt))
          ? new Date(payload.analytics.latestArchivedAt)
          : null;

      setAnalytics({
        total: payload.analytics.total ?? mappedDocs.length,
        highPriority: payload.analytics.highPriority ?? 0,
        mediumPriority: payload.analytics.mediumPriority ?? 0,
        lowPriority: payload.analytics.lowPriority ?? 0,
        uniqueCategories: payload.analytics.uniqueCategories ?? 0,
        latestArchivedAt: latestDate,
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load archived documents."
      );
      setDocuments([]);
      setAnalytics({
        total: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        uniqueCategories: 0,
        latestArchivedAt: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedDocuments();
  }, [fetchArchivedDocuments]);

  const handleViewFile = useCallback((document: ArchivedDocument) => {
    const [firstAttachment] = document.attachments;
    if (firstAttachment) {
      window.open(firstAttachment, "_blank", "noopener,noreferrer");
    } else {
      toast.info("This archived document has no attachment.");
    }
  }, []);

  const handleViewHistory = useCallback(
    (document: ArchivedDocument) => {
      router.push(`/instructor/designate-document/view/${document.id}`);
    },
    [router]
  );

  const handleRestore = useCallback((document: ArchivedDocument) => {
    toast.info(`Restoring ${document.referenceId} is not supported yet.`);
  }, []);

  const handleDelete = useCallback((document: ArchivedDocument) => {
    toast.info(`Deleting ${document.referenceId} is not supported yet.`);
  }, []);

  const columns = useMemo(
    () =>
      archivedDocumentColumns({
        onViewFile: handleViewFile,
        onViewHistory: handleViewHistory,
        onRestore: handleRestore,
        onDelete: handleDelete,
      }),
    [handleViewFile, handleViewHistory, handleRestore, handleDelete]
  );

  return (
    <div className="space-y-5">
      <Heading
        title="Archived Documents"
        description="View and manage all archived documents. You can restore or permanently delete them."
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total}</div>
            <p className="text-xs text-muted-foreground">Documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.highPriority}</div>
            <p className="text-xs text-muted-foreground">High priority documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Medium Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.mediumPriority}</div>
            <p className="text-xs text-muted-foreground">Medium priority documents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueCategories}</div>
            <p className="text-xs text-muted-foreground">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Archive Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900 mb-1">
              Automatic Archiving
            </p>
            <p className="text-sm text-blue-800">
              Documents will be automatically archived after 6 months of inactivity. Archived
              documents can be restored or permanently deleted from this page.
            </p>
            {analytics.latestArchivedAt && (
              <p className="text-xs text-blue-700 mt-2 flex items-center gap-1">
                <History className="h-3.5 w-3.5" />
                Last archived on {format(analytics.latestArchivedAt, "PPpp")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div>
        {isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            {error}
          </div>
        ) : documents.length > 0 ? (
          <DataTable
            columns={columns}
            data={documents}
            onSelectionChange={setSelectedRows}
          />
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconArchive />
              </EmptyMedia>
              <EmptyTitle>No archived documents found</EmptyTitle>
              <EmptyDescription>
                Archived documents will appear here once records have been archived from the repository.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
};

