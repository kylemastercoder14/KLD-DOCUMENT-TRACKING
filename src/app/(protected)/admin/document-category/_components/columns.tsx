"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronsUpDown, ExternalLinkIcon } from "lucide-react";
import { DocumentCategoryWithDesignations } from "@/types";
import { CellAction } from "./cell-action";
import { TemplateViewerDialog } from "./template-viewer-dialog";

export const documentCategoryColumns = ({
  onEdit,
}: {
  onEdit: (category: DocumentCategoryWithDesignations) => void;
}): ColumnDef<DocumentCategoryWithDesignations>[] => {
  // Component to handle template viewing
  const TemplateCell = ({
    row,
  }: {
    row: { original: DocumentCategoryWithDesignations };
  }) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const attachment = row.original.attachment;

    if (!attachment) {
      return (
        <span className="text-sm text-muted-foreground ml-3">No template</span>
      );
    }

    // Extract filename from URL
    const fileName = attachment.split("/").pop() || "Template.docx";

    return (
      <>
        <button
          onClick={() => setIsViewerOpen(true)}
          className="text-sm flex items-center gap-1 cursor-pointer hover:underline text-primary ml-3 font-medium"
        >
          View Template <ExternalLinkIcon className='size-3.5' />
        </button>
        <TemplateViewerDialog
          templateUrl={attachment}
          fileName={fileName}
          categoryName={row.original.name}
          isOpen={isViewerOpen}
          onOpenChange={setIsViewerOpen}
        />
      </>
    );
  };

  return [
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
    id: "name",
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category Name
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <div className="space-y-1 ml-3">
        <p className="font-semibold text-foreground">{row.original.name}</p>
        {row.original.description && (
          <p className="text-sm text-muted-foreground w-[450px] truncate">
            {row.original.description}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "designations",
    accessorFn: (row) =>
      row.designations.map((designation) => designation.name).join(", "),
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Designations
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) =>
      row.original.designations.length ? (
        <div className="flex flex-wrap gap-2 ml-3">
          {row.original.designations.map((designation) => (
            <Badge key={designation.id} variant="outline">
              {designation.name}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground ml-3">
          No designations assigned
        </p>
      ),
  },
  {
    accessorKey: "isActive",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Status
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <Badge
        variant={row.original.isActive ? "secondary" : "outline"}
        className={
          row.original.isActive
            ? "bg-emerald-50 ml-3 text-emerald-600 border-emerald-100"
            : "bg-red-50 ml-3 text-red-600 border-red-100"
        }
      >
        {row.original.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "template",
    accessorKey: "attachment",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Template
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => <TemplateCell row={row} />,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date Created
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground ml-3">
        {format(new Date(row.original.createdAt), "PP")}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Actions",
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <CellAction data={row.original} onEdit={onEdit} />,
  },
  ];
};
