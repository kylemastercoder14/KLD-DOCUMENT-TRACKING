"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentTracking } from "@/types";
import { ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface DocumentDetailsProps {
  document: DocumentTracking;
}

const priorityColors = {
  Low: "bg-gray-100 text-gray-800 border-gray-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  High: "bg-red-100 text-red-800 border-red-200",
};

export function DocumentDetails({ document }: DocumentDetailsProps) {
  const handleViewDigitalCopy = () => {
    // TODO: Implement view digital copy functionality
    if (document.attachments.length > 0) {
      window.open(document.attachments[0], "_blank");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div>
        <h3 className="text-lg font-serif font-semibold">Details</h3>
      </div>

      <div className="space-y-4">
        {/* Priority */}
        <div className='flex items-center justify-between'>
          <label className="text-sm font-medium text-muted-foreground">Priority</label>
          <div className="mt-1">
            <Badge
              variant="outline"
              className={cn(
                "font-medium",
                priorityColors[document.priority as keyof typeof priorityColors]
              )}
            >
              {document.priority.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Category */}
        <div className='flex items-center justify-between'>
          <label className="text-sm font-medium text-muted-foreground">Category</label>
          <p className="mt-1 text-sm">{document.category}</p>
        </div>

        {/* Department */}
        <div className='flex items-center justify-between'>
          <label className="text-sm font-medium text-muted-foreground">Department</label>
          <p className="mt-1 text-sm">{document.department}</p>
        </div>
      </div>

      {/* View Digital Copy Button */}
      <Button
        onClick={handleViewDigitalCopy}
        variant="outline"
        className="w-full h-12 border-black"
      >
        <span className="flex items-center gap-2">
          <FileText className="size-4" />
          View Digital Copy
        </span>
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

