"use client";

import { format } from "date-fns";
import { DocumentHistory } from "@/types";
import { cn } from "@/lib/utils";

interface ProcessingHistoryProps {
  history: DocumentHistory[];
}

export function ProcessingHistory({ history }: ProcessingHistoryProps) {
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffInDays = Math.floor(diffInHours / 24);

    // Same day
    if (diffInDays === 0) {
      return `Today, ${format(date, "h:mm a")}`;
    }
    // Yesterday
    else if (diffInDays === 1) {
      return `Yesterday, ${format(date, "h:mm a")}`;
    }
    // Older dates
    else {
      return format(date, "yyyy-MM-dd, h:mm a");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-serif font-semibold">Processing History</h3>
        <p className="text-sm text-muted-foreground">
          Audit trail of document movements and actions.
        </p>
      </div>

      <div className="space-y-6">
        {history.map((item, index) => (
          <div key={item.id} className="relative flex gap-4">
            {/* Timeline Line */}
            {index < history.length - 1 && (
              <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-border" />
            )}

            {/* Status Indicator */}
            <div
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                item.isActive
                  ? "border-green-500 bg-green-50"
                  : "border-muted bg-muted"
              )}
            >
              {item.isActive && (
                <div className="size-2 rounded-full bg-green-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2 pb-4">
              <div>
                <h4 className="font-medium text-sm">{item.action}</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatTimestamp(item.timestamp)}
                </p>
                {item.performedBy && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    By {item.performedBy}
                  </p>
                )}
              </div>
              {item.description && (
                <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                  {item.description}
                </div>
              )}
              {item.rejectionReason && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive space-y-1">
                  <p className="font-medium">{item.rejectionReason}</p>
                  {item.rejectionDetails && (
                    <p className="text-[11px] text-destructive/80">
                      {item.rejectionDetails}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

