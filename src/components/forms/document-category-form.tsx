"use client";

import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Layers, ListPlus, SaveIcon, Users, X } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createDocumentCategories,
  updateDocumentCategory,
} from "@/actions/document-category";
import { getDesignations } from "@/actions/designation";
import { getQueryClient } from "@/lib/query-client";
import { documentCategorySchema } from "@/validators";
import { DesignationWithDocuments, DocumentCategoryWithDesignations } from "@/types";

type DocumentCategoryFormValues = z.output<typeof documentCategorySchema>;

type DocumentCategoryFormProps = {
  initialData: DocumentCategoryWithDesignations | null;
  isDrawerOpen: boolean;
  setIsDrawerOpenAction: (open: boolean) => void;
};

const emptyCategory = { name: "", description: "" };

export const DocumentCategoryForm = ({
  initialData,
  isDrawerOpen,
  setIsDrawerOpenAction,
}: DocumentCategoryFormProps) => {
  const queryClient = getQueryClient();

  const { data: designations = [], isLoading: isDesignationsLoading } = useQuery<
    DesignationWithDocuments[]
  >({
    queryKey: ["designations"],
    queryFn: getDesignations,
  });

  const [designationSearch, setDesignationSearch] = useState("");

  const form = useForm<DocumentCategoryFormValues>({
    resolver: zodResolver(documentCategorySchema),
    defaultValues: {
      categories: [emptyCategory],
      designationIds: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "categories",
  });

  useEffect(() => {
    if (initialData) {
      replace([
        {
          name: initialData.name,
          description: initialData.description ?? "",
        },
      ]);
      form.setValue(
        "designationIds",
        initialData.designations?.map((designation) => designation.id) ?? []
      );
    } else {
      replace([emptyCategory]);
      form.setValue("designationIds", []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  const designationIds = useWatch({
    control: form.control,
    name: "designationIds",
  }) ?? [];

  const mutation = useMutation({
    mutationFn: async (values: DocumentCategoryFormValues) => {
      if (initialData) {
        return updateDocumentCategory(initialData.id, values);
      }
      return createDocumentCategories(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-categories"] });
      queryClient.invalidateQueries({ queryKey: ["designations"] });
      toast.success(
        initialData
          ? "Document category updated successfully"
          : "Document categories created successfully"
      );
      if (!initialData) {
        form.reset({
          categories: [emptyCategory],
          designationIds: [],
        });
      }
      setIsDrawerOpenAction(false);
    },
    onError: (error) => {
      console.error("Document category mutation error:", error);
      toast.error("Failed to save document category");
    },
  });

  const isSubmitting = mutation.isPending || form.formState.isSubmitting;

  const handleAddCategory = () => {
    append(emptyCategory);
  };

  const handleRemoveCategory = (index: number) => {
    if (fields.length === 1) return;
    remove(index);
  };

  const handleToggleDesignation = (id: string, checked: boolean) => {
    const currentIds = designationIds;
    if (checked) {
      if (!currentIds.includes(id)) {
        form.setValue("designationIds", [...currentIds, id], {
          shouldDirty: true,
        });
      }
      return;
    }
    form.setValue(
      "designationIds",
      currentIds.filter((designationId) => designationId !== id),
      { shouldDirty: true }
    );
  };

  const filteredDesignations = useMemo(() => {
    if (!designationSearch.trim()) {
      return designations;
    }
    const term = designationSearch.toLowerCase();
    return designations.filter(
      (designation) =>
        designation.name.toLowerCase().includes(term) ||
        designation.description?.toLowerCase().includes(term)
    );
  }, [designationSearch, designations]);

  async function onSubmit(values: DocumentCategoryFormValues) {
    await mutation.mutateAsync({
      ...values,
      categories: initialData ? [values.categories[0]] : values.categories,
    });
  }

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpenAction}>
      <SheetContent className="flex h-full flex-col overflow-hidden p-0 sm:w-[540px]">
        <SheetHeader className="border-b p-5 mt-4 pb-3">
          <SheetTitle className="font-serif text-2xl">
            {initialData ? "Edit Document Category" : "Create Document Category"}
          </SheetTitle>
          <SheetDescription>
            Configure document categories and map them to designations.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex h-full flex-col"
          >
            <div className="flex-1 overflow-y-auto space-y-8 px-6 py-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Document Categories
                </h3>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-lg border p-4 space-y-4 bg-muted/30"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-muted-foreground">
                          Category {index + 1}
                        </p>
                        {!initialData && fields.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveCategory(index)}
                            disabled={isSubmitting}
                          >
                            <X className='size-4' /> Remove
                          </Button>
                        )}
                      </div>

                      <FormField
                        control={form.control}
                        name={`categories.${index}.name`}
                        render={({ field: nameField }) => (
                          <FormItem>
                            <FormLabel>
                              Category Name <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                disabled={isSubmitting}
                                placeholder="e.g. Memorandum of Understanding"
                                {...nameField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`categories.${index}.description`}
                        render={({ field: descriptionField }) => (
                          <FormItem>
                            <FormLabel>Description <span className='text-muted-foreground'>(optional)</span></FormLabel>
                            <FormControl>
                              <Textarea
                                disabled={isSubmitting}
                                placeholder="Brief description of the document category"
                                {...descriptionField}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                </div>

                {!initialData && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddCategory}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    <ListPlus className="h-4 w-4" />
                    Add Another Category
                  </Button>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4" /> Designation Access
                </h3>
                <p className="text-xs text-muted-foreground">
                  Select the designations that can use this document category.
                </p>

                <div className="space-y-3">
                  <Input
                    placeholder="Search designations..."
                    value={designationSearch}
                    onChange={(event) => setDesignationSearch(event.target.value)}
                    disabled={isDesignationsLoading}
                  />

                  <ScrollArea className="h-[360px] rounded-md border-2 p-4 border-dashed">
                    {isDesignationsLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, index) => (
                          <Skeleton
                            key={`designation-skeleton-${index}`}
                            className="h-14 w-full"
                          />
                        ))}
                      </div>
                    ) : designations.length ? (
                      filteredDesignations.length ? (
                        <div className="space-y-3">
                          {filteredDesignations.map((designation) => {
                            const checked = designationIds.includes(designation.id);
                            return (
                              <label
                                key={designation.id}
                                className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted"
                              >
                                <Checkbox
                                  checked={checked}
                                  disabled={isSubmitting || !designation.isActive}
                                  onCheckedChange={(value) =>
                                    handleToggleDesignation(
                                      designation.id,
                                      Boolean(value)
                                    )
                                  }
                                />
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold text-foreground">
                                    {designation.name}
                                  </p>
                                  {designation.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {designation.description}
                                    </p>
                                  )}
                                  {!designation.isActive && (
                                    <p className="text-xs text-amber-600">
                                      Currently inactive
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <Empty>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <IconAlertTriangle />
                            </EmptyMedia>
                            <EmptyTitle>No matches found</EmptyTitle>
                            <EmptyDescription>
                              Try adjusting your search keywords.
                            </EmptyDescription>
                          </EmptyHeader>
                        </Empty>
                      )
                    ) : (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <IconAlertTriangle />
                          </EmptyMedia>
                          <EmptyTitle>No designations yet</EmptyTitle>
                          <EmptyDescription>
                            Create designations to assign this document category.
                          </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                          <Button variant="secondary" size="sm" disabled>
                            Add designation
                          </Button>
                        </EmptyContent>
                      </Empty>
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>

            <SheetFooter className="mt-0 border-t bg-background px-6 py-4 sticky bottom-0">
              <SheetClose asChild>
                <Button variant="outline" disabled={isSubmitting}>
                  <ArrowLeft className="size-4" />
                  Cancel
                </Button>
              </SheetClose>
              <Button variant="primary" disabled={isSubmitting}>
                <SaveIcon className="size-4" />
                {initialData ? "Save Changes" : "Save Categories"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

