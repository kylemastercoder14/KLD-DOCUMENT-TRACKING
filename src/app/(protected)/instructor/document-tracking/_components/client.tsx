/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DocumentTracking, DocumentHistory } from "@/types";
import { DocumentStatusCard } from "./document-status-card";
import { ProcessingHistory } from "./processing-history";
import { DocumentDetails } from "./document-details";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

type TrackingApiResponse = {
  document: {
    id: string;
    referenceId: string;
    title: string;
    category: string;
    status: "Pending" | "Approved" | "Rejected";
    priority: "Low" | "Medium" | "High";
    submittedBy: string;
    submittedDate: string;
    currentLocation: string;
    department: string;
    attachments: string[];
  };
  history: Array<{
    id: string;
    action: string;
    description: string;
    location: string;
    status: "Pending" | "Approved" | "Rejected";
    timestamp: string;
    isActive: boolean;
    performedBy?: string | null;
    rejectionReason?: string | null;
    rejectionDetails?: string | null;
  }>;
};

export function Client() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trackedDocument, setTrackedDocument] =
    useState<DocumentTracking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const mapHistory = (entries: TrackingApiResponse["history"]): DocumentHistory[] =>
    entries.map((entry) => ({
      ...entry,
      timestamp: new Date(entry.timestamp),
    }));

  const handleTrack = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a document reference ID");
      return;
    }

    setError(null);
    setTrackedDocument(null);
    setIsTracking(true);

    try {
      const response = await fetch(
        `/api/document-tracking?referenceId=${encodeURIComponent(
          searchQuery.trim()
        )}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError(
            `Document with reference ID "${searchQuery.trim()}" was not found.`
          );
          return;
        }
        throw new Error("Failed to fetch document history");
      }

      const payload: TrackingApiResponse = await response.json();

      const mappedHistory = mapHistory(payload.history ?? []);
      const document: DocumentTracking = {
        id: payload.document.id,
        referenceId: payload.document.referenceId,
        title: payload.document.title ?? payload.document.referenceId,
        category: payload.document.category,
        status: payload.document.status,
        priority: payload.document.priority,
        submittedBy: payload.document.submittedBy,
        submittedDate: new Date(payload.document.submittedDate),
        currentLocation: payload.document.currentLocation,
        department: payload.document.department,
        attachments: payload.document.attachments ?? [],
        history: mappedHistory,
      };

      setTrackedDocument(document);
    } catch (fetchError) {
      console.error(fetchError);
      setError("Unable to retrieve document history right now. Please try again.");
    } finally {
      setIsTracking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleTrack();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="space-y-4">
        <div className="text-center mt-10 space-y-2">
          <h1 className="text-4xl font-bold text-foreground font-serif">
            Track Document Status
          </h1>
          <p className="text-muted-foreground">
            Enter a Document Reference ID to view its current status, location,
            and complete processing history.
          </p>
        </div>

        <div className="flex items-center gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <Input
              placeholder="e.g. DOC-2025-001"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError(null);
              }}
              onKeyPress={handleKeyPress}
              className="pl-10 h-12"
            />
          </div>
          <Button
            variant="primary"
            onClick={handleTrack}
            className="px-6 h-12"
            disabled={isTracking}
          >
            {isTracking ? "Tracking..." : "Track"}
          </Button>
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Document Status Display */}
      {trackedDocument ? (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
          <DocumentStatusCard document={trackedDocument} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <ProcessingHistory history={trackedDocument.history} />
            </div>
            <div className="lg:col-span-2">
              <DocumentDetails document={trackedDocument} />
            </div>
          </div>
        </div>
      ) : !error && searchQuery ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No Document Found</EmptyTitle>
            <EmptyDescription>
              The document with reference ID "{searchQuery}" could not be found.
              Please check the reference ID and try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent />
        </Empty>
      ) : null}
    </div>
  );
}
