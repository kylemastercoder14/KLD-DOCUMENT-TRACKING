"use client";

import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { designationSchema } from "@/validators";

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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ArrowLeft, CheckSquare, SaveIcon, Users } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DesignationWithDocuments } from "@/types";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createDesignation,
  getDocumentCategories,
  updateDesignation,
} from "@/actions/designation";
import { getQueryClient } from "@/lib/query-client";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";

type DesignationFormValues = z.output<typeof designationSchema>;

export const DesignationForm = ({
  initialData,
  isDrawerOpen,
  setIsDrawerOpenAction,
}: {
  initialData: DesignationWithDocuments | null;
  isDrawerOpen: boolean;
  setIsDrawerOpenAction: (open: boolean) => void;
}) => {
  const router = useRouter();
  const queryClient = getQueryClient();

  const { data: documentCategories = [], isLoading: isCategoriesLoading } =
    useQuery({
      queryKey: ["document-categories"],
      queryFn: getDocumentCategories,
    });

  const [categorySearch, setCategorySearch] = useState("");

  const form = useForm<DesignationFormValues>({
    resolver: zodResolver(designationSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      documentCategoryIds:
        initialData?.documentCategories?.map((category) => category.id) || [],
    },
  });

  useEffect(() => {
    form.reset({
      name: initialData?.name || "",
      description: initialData?.description || "",
      documentCategoryIds:
        initialData?.documentCategories?.map((category) => category.id) || [],
    });
  }, [initialData, form]);

  const mutation = useMutation({
    mutationFn: async (values: DesignationFormValues) => {
      if (initialData) {
        return updateDesignation(initialData.id, values);
      }
      return createDesignation(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designations"] });
      router.refresh();
      setIsDrawerOpenAction(false);
      setIsDrawerOpenAction(false);
      toast.success(
        initialData
          ? "Designation updated successfully"
          : "Designation created successfully"
      );
      form.reset();
    },
    onError: (error) => {
      console.error("Designation mutation error:", error);
      toast.error("Failed to save designation. Please try again.");
    },
  });

  async function onSubmit(values: DesignationFormValues) {
    await mutation.mutateAsync(values);
  }

  const isSubmitting = mutation.isPending || form.formState.isSubmitting;
  const selectedCategoryIds =
    useWatch({
      control: form.control,
      name: "documentCategoryIds",
    }) ?? [];

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) {
      return documentCategories;
    }
    const term = categorySearch.toLowerCase();
    return documentCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(term) ||
        category.description?.toLowerCase().includes(term)
    );
  }, [categorySearch, documentCategories]);

  const handleToggleCategory = (categoryId: string, checked: boolean) => {
    const currentIds = selectedCategoryIds;
    if (checked) {
      if (!currentIds.includes(categoryId)) {
        form.setValue("documentCategoryIds", [...currentIds, categoryId], {
          shouldDirty: true,
        });
      }
      return;
    }

    form.setValue(
      "documentCategoryIds",
      currentIds.filter((id) => id !== categoryId),
      { shouldDirty: true }
    );
  };

  return (
    <>
      {/* Designation Editor Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpenAction}>
        <SheetContent className="flex h-full flex-col overflow-hidden p-0 sm:w-[540px]">
          <SheetHeader className="border-b p-5 mt-4">
            <SheetTitle className="font-serif text-2xl">
              {initialData
                ? `Edit Designation`
                : "Create New Designation"}
            </SheetTitle>
            <SheetDescription>
              Configure designation details and assign document category
              permissions.
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex h-full flex-col"
            >
              <div className="flex-1 overflow-y-auto space-y-8 px-6 py-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4" /> Designation Details
                  </h3>
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Designation Name{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled={isSubmitting}
                              placeholder="e.g. Vice President for Academic Affairs"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Description{" "}
                            <span className="text-muted-foreground">
                              (optional)
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              disabled={isSubmitting}
                              placeholder="Brief description of responsibilities"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Category Permissions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> Document Access
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select the document categories this designation can access.
                  </p>

                  <div className="space-y-3">
                    <Input
                      placeholder="Search document categories..."
                      value={categorySearch}
                      onChange={(event) => setCategorySearch(event.target.value)}
                      disabled={isCategoriesLoading}
                    />
                    <ScrollArea className="h-[360px] rounded-md border-2 p-4 border-dashed">
                      {isCategoriesLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton
                              key={`category-skeleton-${index}`}
                              className="h-14 w-full"
                            />
                          ))}
                        </div>
                      ) : documentCategories.length ? (
                        filteredCategories.length ? (
                          <div className="space-y-3">
                            {filteredCategories.map((category) => {
                              const checked =
                                selectedCategoryIds?.includes(category.id) ?? false;

                              return (
                                <label
                                  key={category.id}
                                  className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted"
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={isSubmitting || !category.isActive}
                                    onCheckedChange={(value) =>
                                      handleToggleCategory(category.id, Boolean(value))
                                    }
                                  />
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-foreground">
                                      {category.name}
                                    </p>
                                    {category.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {category.description}
                                      </p>
                                    )}
                                    {!category.isActive && (
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
                            <EmptyTitle>No Document Categories Yet</EmptyTitle>
                            <EmptyDescription>
                              Create document categories to assign permissions.
                            </EmptyDescription>
                          </EmptyHeader>
                          <EmptyContent>
                            <Button asChild variant="secondary" size="sm">
                              <Link href="/admin/document-category">
                                Create Document Category
                              </Link>
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
                  Save Designation
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </>
  );
};
