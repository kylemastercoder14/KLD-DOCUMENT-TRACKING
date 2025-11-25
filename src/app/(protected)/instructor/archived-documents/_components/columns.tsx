"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-action";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export type ArchivedDocument = {
  id: string;
  referenceId: string;
  title: string;
  attachments: string[];
  category: string;
  priority: "Low" | "Medium" | "High";
  status: "Archived";
  createdAt: Date;
  archivedAt: Date;
};

type ColumnOptions = {
  onViewFile?: (document: ArchivedDocument) => void;
  onViewHistory?: (document: ArchivedDocument) => void;
  onRestore?: (document: ArchivedDocument) => void;
  onDelete?: (document: ArchivedDocument) => void;
};

export const archivedDocumentColumns = ({
  onViewFile,
  onViewHistory,
  onRestore,
  onDelete,
}: ColumnOptions): ColumnDef<ArchivedDocument>[] => [
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
      <div className="ml-3">
        <p className="font-semibold text-foreground">{row.original.referenceId}</p>
      </div>
    ),
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Document Title
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="ml-3 space-y-1">
        <p className="font-semibold text-foreground">{row.original.title}</p>
        {row.original.attachments.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3 w-3" />
            <span>{row.original.attachments.length} attachment(s)</span>
          </div>
        )}
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
    cell: ({ row }) => (
      <div className="ml-3">
        <Badge
          variant="outline"
          className="bg-gray-100 text-gray-800 border-gray-200"
        >
          {row.original.status}
        </Badge>
      </div>
    ),
  },
  {
    accessorKey: "archivedAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Archived Date
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm ml-3 text-muted-foreground">
        {format(new Date(row.original.archivedAt), "PP")}
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
        onRestore={onRestore}
        onDelete={onDelete}
      />
    ),
  },
];

