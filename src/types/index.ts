import { Designation, DocumentCategory } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";

export interface DesignationWithDocuments extends Designation {
  documentCategories: DocumentCategory[];
}

export interface DocumentCategoryWithDesignations extends DocumentCategory {
  designations: Designation[];
}

export type UserWithDesignation = Prisma.UserGetPayload<{
  include: { designation: true };
}>;

export interface DocumentHistoryEntry {
  id: string;
  action: string;
  description: string;
  location: string;
  status: "Pending" | "Approved" | "Rejected";
  timestamp: Date;
  isActive: boolean;
  performedBy?: string | null;
  rejectionReason?: string | null;
  rejectionDetails?: string | null;
}

export interface DocumentTracking {
  id: string;
  referenceId: string;
  title: string;
  category: string;
  status: "Pending" | "Approved" | "Rejected";
  priority: "Low" | "Medium" | "High";
  submittedBy: string;
  submittedDate: Date;
  currentLocation: string;
  department: string;
  attachments: string[];
  history: DocumentHistoryEntry[];
}

export type DocumentHistory = DocumentHistoryEntry;
