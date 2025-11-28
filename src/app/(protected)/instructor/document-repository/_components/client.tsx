"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import Heading from "@/components/heading";
import { DataTable } from "@/components/data-table";
import { documentColumns, Document } from "./columns";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type RepositoryDocumentResponse = {
  id: string;
  referenceId: string;
  title: string;
  attachments: string[];
  category: string;
  priority: "Low" | "Medium" | "High";
  status: "Approved";
  submittedBy?: string;
  createdAt: string;
};

export const Client = () => {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedRows, setSelectedRows] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/document-repository");
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("You are not authorized to view these documents.");
        }
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to load documents");
      }

      const payload: { documents: RepositoryDocumentResponse[] } = await response.json();
      setDocuments(
        (payload.documents ?? []).map((doc) => ({
          ...doc,
          attachments: doc.attachments ?? [],
          createdAt: new Date(doc.createdAt),
        }))
      );
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load documents.");
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleViewFile = useCallback((document: Document) => {
    const [firstAttachment] = document.attachments;
    if (firstAttachment) {
      window.open(firstAttachment, "_blank", "noopener,noreferrer");
    } else {
      toast.info("No attachment available for this document.");
    }
  }, []);

  const handleViewHistory = useCallback(
    (document: Document) => {
      router.push(`/instructor/designate-document/view/${document.id}`);
    },
    [router]
  );

  const handleDelete = useCallback((document: Document) => {
    toast.info(`Deleting ${document.referenceId} is not supported yet.`);
  }, []);

  const columns = useMemo(
    () =>
      documentColumns({
        onViewFile: handleViewFile,
        onViewHistory: handleViewHistory,
        onDelete: handleDelete,
      }),
    [handleViewFile, handleViewHistory, handleDelete]
  );

  return (
    <div className="space-y-5">
      <Heading
        title="Document Repository"
        description="Browse and manage all approved documents."
      />

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
                <IconAlertTriangle />
              </EmptyMedia>
              <EmptyTitle>No approved documents found</EmptyTitle>
              <EmptyDescription>
                Approved documents will appear here once they are reviewed and approved.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
};

