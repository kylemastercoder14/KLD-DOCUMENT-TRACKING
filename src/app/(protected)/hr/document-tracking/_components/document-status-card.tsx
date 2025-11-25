"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { DocumentTracking } from "@/types";
import { FileText, User, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentStatusCardProps {
  document: DocumentTracking;
}

const statusColors: Record<DocumentTracking["status"], string> = {
  Pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Approved: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
};

export function DocumentStatusCard({ document }: DocumentStatusCardProps) {
  return (
    <div className="rounded-md border-t-8 border-t-orange-400 overflow-hidden border-none shadow-md bg-linear-to-br from-white to-muted/20 dark:from-card dark:to-card/50">
      <div
        className={`h-2 w-full ${
          document.status === "Approved"
            ? "bg-green-500"
            : document.status === "Rejected"
            ? "bg-red-500"
            : document.status === "Pending"
            ? "bg-amber-500"
            : "bg-blue-500"
        }`}
      />
      <div className="p-8 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            {/* Header with Reference ID and Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="text-muted-foreground bg-background"
                >
                  {document.referenceId}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    statusColors[document.status as keyof typeof statusColors]
                  )}
                >
                  {document.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {/* Document Title */}
            <h2 className="text-2xl mt-3 font-serif font-bold text-foreground tracking-tighter">
              {document.title}
            </h2>

            {/* Category */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="size-4" />
              <span>{document.category}</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>
                Submitted by <span>{document.submittedBy}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{format(document.submittedDate, "yyyy-MM-dd")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>
                Current Location: <span>{document.currentLocation}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
