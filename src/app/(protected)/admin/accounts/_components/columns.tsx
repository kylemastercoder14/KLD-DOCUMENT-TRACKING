"use client";

import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronsUpDown, Mail, Phone } from "lucide-react";

import { UserWithDesignation } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CellAction } from "./cell-action";
import { Badge } from "@/components/ui/badge";

type ColumnOptions = {
  onEdit: (account: UserWithDesignation) => void;
};

export const accountColumns = ({
  onEdit,
}: ColumnOptions): ColumnDef<UserWithDesignation>[] => [
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
    accessorKey: "fullName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <div className="ml-3 space-y-1">
        <p className="font-semibold text-foreground">{`${row.original.firstName} ${row.original.lastName}`}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {row.original.email}
          </span>
          <span className="inline-flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {row.original.contactNumber}
          </span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "designation.name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Designation
        <ChevronsUpDown className="h-4 w-4" />
      </Button>
    ),
    enableSorting: true,
    cell: ({ row }) => (
      <p className="ml-3 min-w-[200px] text-sm text-muted-foreground">
        {row.original.designation?.name ?? "Unassigned"}
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
      <span className="text-sm ml-3 text-muted-foreground">
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

