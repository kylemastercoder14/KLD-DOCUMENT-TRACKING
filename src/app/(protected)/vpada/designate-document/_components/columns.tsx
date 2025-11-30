"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-action";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, FileText, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { WORKFLOW_STAGE_LABELS } from "@/constants/document-history";

export type Document = {
  id: string;
  referenceId: string;
  attachment: string;
  attachmentName: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  status: "Pending" | "Approved" | "Rejected";
  workflowStage?: "INSTRUCTOR" | "DEAN" | "VPAA" | "VPADA" | "PRESIDENT" | "REGISTRAR" | "ARCHIVES";
  isForwarded?: boolean;
  submittedBy?: string;
  submittedById?: string;
  createdAt: Date;
};

type ColumnOptions = {
  onViewFile?: (document: Document) => void;
  onViewHistory?: (document: Document) => void;
  onComment?: (document: Document) => void;
  onDelete?: (document: Document) => void;
};

export const documentColumns = ({
  onViewFile,
  onViewHistory,
  onComment,
  onDelete,
}: ColumnOptions): ColumnDef<Document>[] => [
  {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    id: "filtered",
    accessorKey: "referenceId",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Reference ID
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="ml-3 flex items-center gap-2">
        <p className="font-semibold text-foreground">{row.original.referenceId}</p>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="Copy reference ID"
          onClick={async (event) => {
            event.stopPropagation();
            try {
              await navigator.clipboard.writeText(row.original.referenceId);
              toast.success("Reference ID copied");
            } catch {
              toast.error("Failed to copy reference ID");
            }
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  },
  {
    accessorKey: "attachment",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Attachment
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="ml-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Link
          href={`/vpada/designate-document/view/${row.original.id}`}
          className="text-sm font-semibold text-primary hover:underline break-all"
        >
          {row.original.attachmentName}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Category
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="ml-3">
        <Badge variant="outline">{row.original.category}</Badge>
      </div>
    ),
  },
  {
    accessorKey: "submittedBy",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Submitted By
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="ml-3">
        <span className="text-sm text-foreground">
          {row.original.submittedBy || "Unknown"}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "priority",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Priority
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => {
      const priority = row.original.priority;
      return (
        <div className="ml-3">
          <Badge
            variant="outline"
            className={
              priority === "High"
                ? "bg-red-50 text-red-600 border-red-100"
                : priority === "Medium"
                  ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-blue-50 text-blue-600 border-blue-100"
            }
          >
            {priority}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => {
      const status = row.original.status;
      let className = "bg-gray-50 text-gray-600 border-gray-100";
      if (status === "Approved") {
        className = "bg-emerald-50 text-emerald-600 border-emerald-100";
      } else if (status === "Rejected") {
        className = "bg-red-50 text-red-600 border-red-100";
      } else if (status === "Pending") {
        className = "bg-amber-50 text-amber-600 border-amber-100";
      }
      return (
        <div className="ml-3">
          <Badge variant="outline" className={className}>
            {status}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "workflowStage",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Current Stage
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => {
      const { workflowStage, isForwarded, status } = row.original;

      if (status === "Approved" || status === "Rejected") {
        return (
          <div className="ml-3">
            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-100">
              {status === "Approved" ? "Completed" : "Rejected"}
            </Badge>
          </div>
        );
      }

      if (!workflowStage) {
        return (
          <div className="ml-3">
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">
              At Instructor
            </Badge>
          </div>
        );
      }

      const stageLabel = WORKFLOW_STAGE_LABELS[workflowStage] || workflowStage;
      let displayText = "";
      let badgeClass = "";

      if (isForwarded && workflowStage !== "DEAN") {
        displayText = `Forwarded to ${stageLabel}`;
        badgeClass = "bg-purple-50 text-purple-600 border-purple-100";
      } else if (workflowStage === "DEAN") {
        displayText = "At Dean";
        badgeClass = "bg-blue-50 text-blue-600 border-blue-100";
      } else {
        displayText = `At ${stageLabel}`;
        badgeClass = "bg-indigo-50 text-indigo-600 border-indigo-100";
      }

      return (
        <div className="ml-3">
          <Badge variant="outline" className={badgeClass}>
            {displayText}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created Date
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm ml-3 text-muted-foreground">
        {format(new Date(row.original.createdAt), "PP")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    enableHiding: false,
    enableSorting: false,
    cell: ({ row }) => (
      <CellAction
        data={row.original}
        onViewFile={onViewFile}
        onViewHistory={onViewHistory}
        onComment={onComment}
        onDelete={onDelete}
      />
    ),
  },
];

