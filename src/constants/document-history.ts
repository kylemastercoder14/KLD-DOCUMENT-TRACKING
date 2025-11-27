import {
  DocumentHistoryAction,
  DocumentWorkflowStage,
  DocumentRejectionReason,
} from "@/generated/prisma/enums";

export const WORKFLOW_STAGE_LABELS: Record<DocumentWorkflowStage, string> = {
  INSTRUCTOR: "Instructor",
  DEAN: "Dean's Office",
  VPAA: "VPAA Office",
  VPADA: "VPADA Office",
  PRESIDENT: "President's Office",
  REGISTRAR: "Registrar",
  ARCHIVES: "Records & Archives",
};

export const DOCUMENT_HISTORY_ACTION_LABELS: Record<DocumentHistoryAction, string> =
  {
    SUBMITTED: "Document Created & Submitted",
    FORWARDED: "Forwarded to Next Office",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    RETURNED: "Returned for Revision",
    SIGNATURE_ATTACHED: "Signed PDF Uploaded",
    COMMENTED: "Comment Added",
  };

export const DOCUMENT_REJECTION_REASONS: {
  value: DocumentRejectionReason;
  label: string;
}[] = [
  {
    value: "MISSING_INFORMATION",
    label: "Missing required information",
  },
  {
    value: "INVALID_DETAILS",
    label: "Invalid or inconsistent details",
  },
  {
    value: "POLICY_VIOLATION",
    label: "Policy or compliance violation",
  },
  {
    value: "NEEDS_REVISION",
    label: "Needs correction or revision",
  },
  {
    value: "OTHER",
    label: "Other (see explanation)",
  },
];

export const DOCUMENT_REJECTION_REASON_LABELS = DOCUMENT_REJECTION_REASONS.reduce<
  Partial<Record<DocumentRejectionReason, string>>
>((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

