"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { documentSchema } from "@/validators";
import { FileText, SaveIcon, Users, ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getQueryClient } from "@/lib/query-client";
import { createDocument } from "@/actions/document";
import { getAccounts } from "@/actions/account";
import { getCurrentUser } from "@/actions/user";
import FileUpload from "@/components/file-upload";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentFormValues = z.output<typeof documentSchema>;

export const DocumentForm = ({
  documentCategoryId,
  documentCategoryName,
  isDrawerOpen,
  setIsDrawerOpenAction,
}: {
  documentCategoryId: string;
  documentCategoryName: string;
  isDrawerOpen: boolean;
  setIsDrawerOpenAction: (open: boolean) => void;
}) => {
  const router = useRouter();
  const queryClient = getQueryClient();
  const [assignatoryOpen, setAssignatoryOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });

  const { data: accounts = [], isLoading: isAccountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });

  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      fileCategoryId: documentCategoryId,
      attachments: [],
      remarks: "",
      fileDate: "",
      priority: "Medium",
      assignatories: [],
    },
  });

  useEffect(() => {
    form.reset({
      fileCategoryId: documentCategoryId,
      attachments: [],
      remarks: "",
      fileDate: "",
      priority: "Medium",
      assignatories: [],
    });
  }, [documentCategoryId, form]);

  const mutation = useMutation({
    mutationFn: async (values: DocumentFormValues) => {
      const attachment = values.attachments?.[0];
      if (!attachment) {
        throw new Error("Please upload an attachment.");
      }

      const payload = {
        fileCategoryId: values.fileCategoryId,
        attachment,
        remarks: values.remarks,
        fileDate: new Date(values.fileDate),
        priority: values.priority,
        assignatories: values.assignatories ?? [],
      };
      return createDocument(payload as Parameters<typeof createDocument>[0]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      router.refresh();
      setIsDrawerOpenAction(false);
      toast.success("Document submitted successfully");
      form.reset({
        fileCategoryId: documentCategoryId,
        attachments: [],
        remarks: "",
        fileDate: "",
        priority: "Medium",
        assignatories: [],
      });
    },
    onError: (error) => {
      console.error("Document mutation error:", error);
      toast.error("Failed to submit document. Please try again.");
    },
  });

  async function onSubmit(values: DocumentFormValues) {
    if (currentUser?.role === "PRESIDENT") {
      values.assignatories = [];
    } else if (!values.assignatories || values.assignatories.length === 0) {
      toast.error("Please select at least one assignatory.");
      return;
    }
    await mutation.mutateAsync(values);
  }

  const isSubmitting = mutation.isPending || form.formState.isSubmitting;
  const selectedAssignatoryIds =
    useWatch({
      control: form.control,
      name: "assignatories",
    }) ?? [];

  const filteredAssignatories = useMemo(() => {
    const accountsArray = Array.isArray(accounts) ? accounts : [];
    const currentUserRole = (currentUser as { role?: string })?.role;
    const currentUserDesignationId = (currentUser as { designationId?: string })?.designationId;

    if (!currentUserRole || !currentUserDesignationId) {
      return [];
    }

    // If current user is PRESIDENT, return empty (auto-submit without assignatories)
    if (currentUserRole === "PRESIDENT") {
      return [];
    }

    return accountsArray.filter((account) => {
      const acc = account as {
        id: string;
        isActive: boolean;
        firstName: string;
        lastName: string;
        email: string;
        role?: string;
        designationId?: string;
        designation?: { id: string; name: string };
      };

      // Exclude inactive accounts and current user
      if (!acc.isActive || acc.id === currentUser?.id) {
        return false;
      }

      // INSTRUCTOR: Show only DEAN with the same designationId
      if (currentUserRole === "INSTRUCTOR") {
        return acc.role === "DEAN" && acc.designationId === currentUserDesignationId;
      }

      // DEAN: Show VPAA, VPADA, and HR (by designation name, not role)
      if (currentUserRole === "DEAN") {
        const accDesignationName = acc.designation?.name?.toUpperCase();
        return (
          acc.role === "VPAA" ||
          acc.role === "VPADA" ||
          accDesignationName?.includes("HR")
        );
      }

      // HR: Show VPAA and VPADA
      // Check if user is HR by designation name (HR is not a role, it's a designation)
      const currentUserDesignationName = (
        currentUser as { designation?: { name?: string } }
      )?.designation?.name?.toUpperCase();
      if (currentUserDesignationName?.includes("HR")) {
        return acc.role === "VPAA" || acc.role === "VPADA";
      }

      // VPAA or VPADA: Show PRESIDENT
      if (currentUserRole === "VPAA" || currentUserRole === "VPADA") {
        return acc.role === "PRESIDENT";
      }

      // Default: return empty (should not reach here for valid roles)
      return false;
    });
  }, [accounts, currentUser]);

  const handleSelectAssignatory = (assignatoryId: string) => {
    const currentIds = selectedAssignatoryIds;
    if (currentIds.includes(assignatoryId)) {
      form.setValue(
        "assignatories",
        currentIds.filter((id) => id !== assignatoryId),
        { shouldDirty: true }
      );
    } else {
      form.setValue("assignatories", [...currentIds, assignatoryId], {
        shouldDirty: true,
      });
    }
  };

  const handleRemoveAssignatory = (assignatoryId: string) => {
    form.setValue(
      "assignatories",
      selectedAssignatoryIds.filter((id) => id !== assignatoryId),
      { shouldDirty: true }
    );
  };

  const getAssignatoryName = (assignatoryId: string) => {
    const account = filteredAssignatories.find(
      (acc) => (acc as { id: string }).id === assignatoryId
    );
    if (!account) return "";
    const acc = account as { firstName: string; lastName: string };
    return `${acc.firstName} ${acc.lastName}`;
  };

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpenAction}>
      <SheetContent className="flex h-full flex-col overflow-hidden p-0 sm:w-[650px]">
        <SheetHeader className="border-b p-5 mt-4">
          <SheetTitle className="font-serif text-2xl">
            Submit Document
          </SheetTitle>
          <SheetDescription>
            Fill in the document details and upload attachments.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <div className="flex-1 overflow-y-auto space-y-8 px-6 pt-6 pb-36">
              {/* File Category */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Document Category
                </h3>
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="fileCategoryId"
                    render={() => (
                      <FormItem>
                        <FormLabel>
                          File Category{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled
                            value={documentCategoryName || ""}
                            readOnly
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* Attachments */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Attachments
                </h3>
                <p className="text-xs text-muted-foreground">
                  Upload up to 1 file (PDF). Maximum
                  5MB per file.
                </p>
                <FormField
                  control={form.control}
                  name="attachments"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FileUpload
                          onFilesUpload={(urls) => {
                            field.onChange(urls);
                          }}
                          defaultValues={field.value}
                          maxFiles={1}
                          maxSize={5}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Remarks */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Remarks
                </h3>
                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Remarks{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          disabled={isSubmitting}
                          placeholder="Add any additional notes or remarks..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* File Date & Priority */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Date & Priority
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fileDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>
                          File Date <span className="text-destructive">*</span>
                        </FormLabel>
                        <Input disabled={isSubmitting} type='datetime-local' {...field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Priority <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className='w-full'>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

                {/* Assignatories */}
                {currentUser?.role !== "PRESIDENT" && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Users className="h-4 w-4" /> Assignatories
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {currentUser?.role === "INSTRUCTOR"
                        ? "Select DEAN from your designation who should receive this document."
                        : currentUser?.role === "DEAN"
                          ? "Select VPAA, VPADA, or HR who should receive this document."
                          : currentUser?.role === "VPAA" || currentUser?.role === "VPADA"
                            ? "Select PRESIDENT who should receive this document."
                            : "Select users who should receive this document."}
                    </p>

                    <FormField
                      control={form.control}
                      name="assignatories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Assignatories{" "}
                            {currentUser?.role !== "PRESIDENT" && (
                              <span className="text-destructive">*</span>
                            )}
                          </FormLabel>
                        <Popover open={assignatoryOpen} onOpenChange={setAssignatoryOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value?.length && "text-muted-foreground"
                                )}
                                disabled={isSubmitting || isAccountsLoading}
                              >
                                {field.value?.length > 0
                                  ? `${field.value.length} user(s) selected`
                                  : "Select assignatories..."}
                                <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search users..." />
                              <CommandList>
                                <CommandEmpty>
                                  {isAccountsLoading
                                    ? "Loading..."
                                    : "No users found in your designation."}
                                </CommandEmpty>
                                <CommandGroup>
                                  {filteredAssignatories.map((account) => {
                                    const acc = account as {
                                      id: string;
                                      firstName: string;
                                      lastName: string;
                                      email: string;
                                    };
                                    const isSelected = field.value?.includes(acc.id);
                                    return (
                                      <CommandItem
                                        key={acc.id}
                                        onSelect={() => handleSelectAssignatory(acc.id)}
                                      >
                                        <div
                                          className={cn(
                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                            isSelected
                                              ? "bg-primary text-primary-foreground"
                                              : "opacity-50 [&_svg]:invisible"
                                          )}
                                        >
                                          <Check className={cn("h-4 w-4")} />
                                        </div>
                                        <div className="flex-1">
                                          <div className="text-sm font-medium">
                                            {acc.firstName} {acc.lastName}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {acc.email}
                                          </div>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {field.value && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {field.value.map((assignatoryId) => (
                              <Badge
                                key={assignatoryId}
                                variant="secondary"
                                className="gap-1"
                              >
                                {getAssignatoryName(assignatoryId)}
                                <button
                                  type="button"
                                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleRemoveAssignatory(assignatoryId);
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                  onClick={() => handleRemoveAssignatory(assignatoryId)}
                                  disabled={isSubmitting}
                                >
                                  <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                )}
                {currentUser?.role === "PRESIDENT" && (
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        As the President, this document will be automatically submitted without
                        assignatories since you are the highest authority.
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Disclaimer */}
                <div className="space-y-4">
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <p className="text-sm text-amber-900">
                      <span className="font-semibold">Disclaimer:</span> This document may include
                      your secured e-signature. By submitting, you acknowledge that maintaining the
                      security of your account credentials and signature passcode is your
                      responsibility. The system is not liable for unauthorized use resulting from
                      user negligence or compromised personal devices.
                    </p>
                  </div>
                </div>
              </div>

              <SheetFooter className="mt-0 border-t bg-background px-6 py-4 sticky bottom-0">
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <SaveIcon className="mr-2 h-4 w-4" />
                    Submit Document
                  </>
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
