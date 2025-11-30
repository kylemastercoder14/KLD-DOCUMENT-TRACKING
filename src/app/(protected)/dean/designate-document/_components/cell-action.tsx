/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useMemo, useState } from "react";
import {
  MoreHorizontal,
  Eye,
  History,
  MessageSquare,
  Trash2,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Document } from "./columns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProcessingHistory } from "@/app/(protected)/instructor/document-tracking/_components/processing-history";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DocumentHistory } from "@/types";
import { DocumentComments } from "./document-comments";
import {
  deleteDocumentById,
  approveDocumentById,
  rejectDocumentById,
  getForwardableRecipientsForDean,
  forwardDocumentById,
} from "@/actions/document";
import { Textarea } from "@/components/ui/textarea";
import { DocumentRejectionReason } from "@/generated/prisma/enums";
import { Checkbox } from "@/components/ui/checkbox";

type CellActionProps = {
  data: Document;
  onViewFile?: (document: Document) => void;
  onViewHistory?: (document: Document) => void;
  onComment?: (document: Document) => void;
  onDelete?: (document: Document) => void;
};

export const CellAction = ({
  data,
  onViewFile,
  onViewHistory,
  onComment,
  onDelete,
}: CellActionProps) => {
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState<DocumentRejectionReason>("MISSING_INFORMATION");
  const [rejectDetails, setRejectDetails] = useState("");
  const [isForwardDialogOpen, setIsForwardDialogOpen] = useState(false);
  const [forwardNote, setForwardNote] = useState("");
  const [selectedForwardRecipients, setSelectedForwardRecipients] = useState<string[]>([]);
  const [forwardOptionsLoading, setForwardOptionsLoading] = useState(false);
  const [forwardOptionsLoaded, setForwardOptionsLoaded] = useState(false);
  const [forwardOptions, setForwardOptions] = useState<
    Array<{ id: string; name: string; role: string; designation: string | null }>
  >([]);
  const [historyEntries, setHistoryEntries] = useState<DocumentHistory[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Get current user ID to check ownership
  const { data: currentUser } = useQuery<{ userId: string }>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await fetch("/api/current-user");
      if (!response.ok) {
        throw new Error("Failed to get current user");
      }
      return response.json();
    },
  });

  // Check if current user is the owner
  const isOwner = useMemo(() => {
    if (!currentUser?.userId || !data.submittedById) {
      return false;
    }
    return currentUser.userId === data.submittedById;
  }, [currentUser?.userId, data.submittedById]);

  const invalidateDocuments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deleteDocumentById(id),
    onSuccess: () => {
      toast.success("Document deleted");
      invalidateDocuments();
      setIsDeleteDialogOpen(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete document");
    },
  });

  const handleDelete = () => {
    // Double-check ownership before deleting
    if (!isOwner) {
      toast.error("You are not allowed to delete this document. Only the document owner can delete it.");
      return;
    }
    if (onDelete) {
      onDelete(data);
    } else {
      deleteMutation.mutate(data.id);
    }
  };

  const handleViewFile = () => {
    if (onViewFile) {
      onViewFile(data);
    } else {
      toast.info("View file functionality coming soon");
    }
  };

  const loadHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await fetch(`/api/document-history?documentId=${data.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch file history");
      }
      const payload = await response.json();
      const normalizedHistory: DocumentHistory[] = (payload.history ?? []).map(
        (entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        })
      );
      setHistoryEntries(normalizedHistory);
    } catch (error) {
      console.error(error);
      setHistoryError("Unable to load file history. Please try again later.");
      setHistoryEntries([]);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [data.id]);

  const handleViewHistory = () => {
    if (onViewHistory) {
      onViewHistory(data);
      return;
    }
    setIsHistoryDialogOpen(true);
    loadHistory();
  };

  const handleComment = () => {
    if (onComment) {
      onComment(data);
      return;
    }
    setIsCommentsDialogOpen(true);
  };

  const handleForward = () => {
    setIsForwardDialogOpen(true);
    if (!forwardOptionsLoaded && !forwardOptionsLoading) {
      loadForwardOptions();
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => approveDocumentById(data.id, approveNote || undefined),
    onSuccess: () => {
      toast.success("Document approved");
      setIsApproveDialogOpen(false);
      setApproveNote("");
      invalidateDocuments();
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to approve document");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () =>
      rejectDocumentById(data.id, {
        reason: rejectReason,
        details: rejectDetails || undefined,
      }),
    onSuccess: () => {
      toast.success("Document rejected");
      setIsRejectDialogOpen(false);
      setRejectDetails("");
      setRejectReason("MISSING_INFORMATION");
      invalidateDocuments();
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to reject document");
    },
  });

  const canTakeAction = useMemo(() => data.status === "Pending", [data.status]);
  const rejectionOptions: { label: string; value: DocumentRejectionReason }[] = [
    { value: "MISSING_INFORMATION", label: "Missing required information" },
    { value: "INVALID_DETAILS", label: "Invalid details" },
    { value: "POLICY_VIOLATION", label: "Policy violation" },
    { value: "NEEDS_REVISION", label: "Needs correction or revision" },
    { value: "OTHER", label: "Other" },
  ];

  const loadForwardOptions = useCallback(async () => {
    setForwardOptionsLoading(true);
    try {
      const options = await getForwardableRecipientsForDean();
      setForwardOptions(options);
      setForwardOptionsLoaded(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load recipients. Please try again.");
    } finally {
      setForwardOptionsLoading(false);
    }
  }, []);

  const forwardMutation = useMutation({
    mutationFn: async () =>
      forwardDocumentById(data.id, {
        targetUserIds: selectedForwardRecipients,
        note: forwardNote || undefined,
      }),
    onSuccess: () => {
      toast.success("Document forwarded successfully");
      setIsForwardDialogOpen(false);
      setForwardNote("");
      setSelectedForwardRecipients([]);
      invalidateDocuments();
    },
    onError: (error: any) => {
      toast.error(error?.message ?? "Failed to forward document");
    },
  });

  const toggleForwardRecipient = (userId: string, checked: boolean | string) => {
    setSelectedForwardRecipients((prev) => {
      if (checked) {
        // Only one recipient can be selected at a time
        if (prev.includes(userId)) {
          return prev;
        }
        return [userId];
      }
      // Unselecting clears the selection
      return prev.filter((id) => id !== userId);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 ml-2.5">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className='w-48'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          <DropdownMenuItem onClick={handleViewFile}>
            <Eye className="size-4" />
            View File
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleViewHistory}>
            <History className="size-4" />
            File History
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleComment}>
            <MessageSquare className="size-4" />
            Comment
          </DropdownMenuItem>

          {canTakeAction && (
            <DropdownMenuItem onClick={handleForward}>
              <ArrowRight className="size-4" />
              Forward
            </DropdownMenuItem>
          )}

          {canTakeAction && (
            <>
              <DropdownMenuItem
                onClick={() => setIsApproveDialogOpen(true)}
                className="text-emerald-600"
              >
                <CheckCircle2 className="size-4" />
                Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setIsRejectDialogOpen(true)}
                className="text-red-600"
              >
                <XCircle className="size-4" />
                Reject
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {isOwner && (
          <DropdownMenuItem
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-destructive"
          >
            <Trash2 className="size-4" />
            Delete
          </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            document "{data.attachmentName}" (Reference: {data.referenceId}).
          </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isHistoryDialogOpen}
        onOpenChange={(open) => {
          setIsHistoryDialogOpen(open);
          if (!open) {
            setHistoryEntries([]);
            setHistoryError(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl!">
          <DialogHeader>
            <DialogTitle>File History • {data.referenceId}</DialogTitle>
          </DialogHeader>
          {isHistoryLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading history...
            </div>
          ) : historyEntries.length ? (
            <ScrollArea className="max-h-[60vh] pr-4">
              <ProcessingHistory history={historyEntries} />
            </ScrollArea>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No history has been recorded for this file yet.
            </div>
          )}
          {historyError && (
            <p className="text-sm text-destructive mt-2">{historyError}</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCommentsDialogOpen}
        onOpenChange={setIsCommentsDialogOpen}
      >
        <DialogContent className="max-w-3xl! flex flex-col">
          <DialogHeader>
            <DialogTitle>Comments • {data.referenceId}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[200px] overflow-hidden">
            <DocumentComments documentId={data.id} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isForwardDialogOpen} onOpenChange={(open) => {
        setIsForwardDialogOpen(open);
        if (!open) {
          setForwardNote("");
          setSelectedForwardRecipients([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Forward Document</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select recipients to pass this document along for further processing.
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 rounded-md border p-4">
              <div>
                <p className="font-semibold">Reference ID</p>
                <p className="text-muted-foreground">{data.referenceId}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{data.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="font-medium">{data.priority}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Forward to (select one recipient)
              </p>
              {forwardOptionsLoading ? (
                <div className="text-sm text-muted-foreground">Loading recipients…</div>
              ) : forwardOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No eligible recipients found. Please ensure VPAA/VPADA/HR accounts exist.
                </p>
              ) : (
                <div className="space-y-2">
                  {forwardOptions.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{option.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {option.role}
                          {option.designation ? ` • ${option.designation}` : ""}
                        </p>
                      </div>
                      <Checkbox
                        checked={selectedForwardRecipients.includes(option.id)}
                        onCheckedChange={(checked) => toggleForwardRecipient(option.id, checked)}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Optional note for recipients
              </label>
              <Textarea
                value={forwardNote}
                onChange={(event) => setForwardNote(event.target.value)}
                rows={3}
                placeholder="Provide instructions or additional information."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsForwardDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedForwardRecipients.length) {
                  toast.error("Select at least one recipient to forward to.");
                  return;
                }
                forwardMutation.mutate();
              }}
              disabled={
                forwardMutation.isPending ||
                forwardOptionsLoading ||
                !selectedForwardRecipients.length
              }
            >
              {forwardMutation.isPending ? "Forwarding..." : "Forward Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Document</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Review the attachment and optionally leave a note before approving.
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 rounded-md border p-4">
              <div>
                <p className="font-semibold">Reference ID</p>
                <p className="text-muted-foreground">{data.referenceId}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{data.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="font-medium">{data.priority}</p>
                </div>
              </div>
              {data.attachment ? (
                <Button asChild variant="secondary" size="sm" className="w-fit">
                  <a href={data.attachment} target="_blank" rel="noreferrer">
                    View attachment
                  </a>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">No attachment provided.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Optional note to document owner
              </label>
              <Textarea
                value={approveNote}
                onChange={(event) => setApproveNote(event.target.value)}
                placeholder="Provide additional information when approving this document."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Confirm Approval"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Provide a reason and additional guidance for the document owner.
            </p>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid gap-2 rounded-md border p-4">
              <div>
                <p className="font-semibold">Reference ID</p>
                <p className="text-muted-foreground">{data.referenceId}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium">{data.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="font-medium">{data.priority}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Rejection reason
              </label>
              <select
                value={rejectReason}
                onChange={(event) =>
                  setRejectReason(event.target.value as DocumentRejectionReason)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {rejectionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Additional explanation (optional)
              </label>
              <Textarea
                value={rejectDetails}
                onChange={(event) => setRejectDetails(event.target.value)}
                rows={3}
                placeholder="Provide specific changes or missing information."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate()}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

