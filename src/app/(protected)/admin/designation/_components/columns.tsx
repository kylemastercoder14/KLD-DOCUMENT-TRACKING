"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { DesignationWithDocuments } from "@/types";
import { Badge } from "@/components/ui/badge";
import { CellAction } from "./cell-action";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type ColumnOptions = {
  onEdit: (designation: DesignationWithDocuments) => void;
};

export const designationColumns = ({
  onEdit,
}: ColumnOptions): ColumnDef<DesignationWithDocuments>[] => [
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
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Designation
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) => (
      <div className="space-y-1 ml-3">
        <p className="font-semibold text-foreground">{row.original.name}</p>
        {row.original.description && (
          <p className="text-sm truncate w-[500px] text-muted-foreground">
            {row.original.description}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "documentCategories",
    accessorFn: (row) =>
      row.documentCategories.map((category) => category.name).join(", "),
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Document Categories
          <ChevronsUpDown className="h-4 w-4" />
        </Button>
      );
    },
    enableSorting: true,
    cell: ({ row }) =>
      row.original.documentCategories.length ? (
        <div className="flex ml-3 min-w-60 flex-wrap gap-2">
          {row.original.documentCategories.map((category) => (
            <Badge key={category.id} variant="outline">
              {category.name}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm ml-3 min-w-60 text-muted-foreground">
          No categories assigned
        </p>
      ),
  },
  {
    accessorKey: "isActive",
    enableSorting: true,
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
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date Created
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
    cell: ({ row }) => <CellAction data={row.original} onEdit={onEdit} />,
  },
];
