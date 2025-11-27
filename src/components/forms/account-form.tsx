"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { accountSchema } from "@/validators";
import { createAccount, updateAccount } from "@/actions/account";
import { getDesignations } from "@/actions/designation";
import { getQueryClient } from "@/lib/query-client";
import { DesignationWithDocuments, UserWithDesignation } from "@/types";
import { ArrowLeft, IdCard, SaveIcon, Users } from "lucide-react";
import { IconAlertTriangle } from "@tabler/icons-react";
import ImageUpload from "@/components/image-upload";

type AccountFormValues = z.input<typeof accountSchema>;

export const AccountForm = ({
  initialData,
  isDrawerOpen,
  setIsDrawerOpenAction,
}: {
  initialData: UserWithDesignation | null;
  isDrawerOpen: boolean;
  setIsDrawerOpenAction: (open: boolean) => void;
}) => {
  const router = useRouter();
  const queryClient = getQueryClient();

  const { data: designations = [], isLoading: isDesignationsLoading } =
    useQuery<DesignationWithDocuments[]>({
      queryKey: ["designations"],
      queryFn: getDesignations,
    });

  const [designationSearch, setDesignationSearch] = useState("");

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      email: initialData?.email || "",
      password: "",
      contactNumber: initialData?.contactNumber || "",
      image: initialData?.image ?? undefined,
      designationId: initialData?.designationId || "",
    },
  });

  const designationValue =
    useWatch({
      control: form.control,
      name: "designationId",
    }) ?? "";

  useEffect(() => {
    form.reset({
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      email: initialData?.email || "",
      password: "",
      contactNumber: initialData?.contactNumber || "",
      image: initialData?.image ?? undefined,
      designationId: initialData?.designationId || "",
    });
  }, [initialData, form]);

  const filteredDesignations = useMemo(() => {
    if (!designationSearch.trim()) return designations;
    const term = designationSearch.toLowerCase();
    return designations.filter(
      (designation) =>
        designation.name.toLowerCase().includes(term) ||
        designation.description?.toLowerCase().includes(term)
    );
  }, [designationSearch, designations]);

  const mutation = useMutation({
    mutationFn: async (values: AccountFormValues) => {
      if (!initialData && !values.password) {
        form.setError("password", {
          type: "manual",
          message: "Password is required",
        });
        throw new Error("Password is required");
      }

      if (initialData) {
        return updateAccount(initialData.id, values);
      }
      return createAccount(values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["designations"] });
      router.refresh();
      toast.success(
        initialData
          ? "Account updated successfully"
          : "Account created successfully"
      );
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        contactNumber: "",
        image: undefined,
        designationId: "",
      });
      setIsDrawerOpenAction(false);
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "Password is required") {
        return;
      }
      console.error("Account mutation error:", error);
      toast.error("Failed to save account");
    },
  });

  const isSubmitting = mutation.isPending || form.formState.isSubmitting;

  const handleDesignationChange = (value: string) => {
    form.setValue("designationId", value, { shouldDirty: true });
  };

  async function onSubmit(values: AccountFormValues) {
    await mutation.mutateAsync(values);
  }

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpenAction}>
      <SheetContent className="flex h-full flex-col overflow-hidden p-0 sm:w-[560px]">
        <SheetHeader className="border-b p-6 pb-4">
          <SheetTitle className="font-serif text-2xl">
            {initialData ? "Edit Account" : "Create Account"}
          </SheetTitle>
          <SheetDescription>
            Manage user details and connect them to a designation.
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
                  <IdCard className="h-4 w-4" /> Account Details
                </h3>
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            First Name{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled={isSubmitting}
                              placeholder="Juan"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Last Name{" "}
                            <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              disabled={isSubmitting}
                              placeholder="Dela Cruz"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Email <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            disabled={isSubmitting}
                            placeholder="juan@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {initialData ? (
                            <>
                              Password{" "}
                              <span className="text-muted-foreground">
                                (leave blank to keep)
                              </span>
                            </>
                          ) : (
                            <>
                              Password{" "}
                              <span className="text-destructive">*</span>
                            </>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            disabled={isSubmitting}
                            placeholder="••••••••"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Contact Number{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            disabled={isSubmitting}
                            placeholder="+63 900 000 0000"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Profile Image{" "}
                          <span className="text-muted-foreground">
                            (optional)
                          </span>
                        </FormLabel>
                        <FormControl>
                          <ImageUpload
                            key={field.value ?? "empty"}
                            defaultValue={field.value ?? ""}
                            imageCount={1}
                            maxSize={4}
                            onImageUpload={(url) =>
                              field.onChange(
                                url && url.length ? url : undefined
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4" /> Designation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Choose the designation assigned to this account.
                </p>

                <div className="space-y-3">
                  <Input
                    placeholder="Search designation..."
                    value={designationSearch}
                    onChange={(event) =>
                      setDesignationSearch(event.target.value)
                    }
                    disabled={isDesignationsLoading}
                  />

                  <ScrollArea className="h-[1300px] rounded-md border-2 p-4 border-dashed">
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
                        <RadioGroup
                          value={designationValue}
                          onValueChange={handleDesignationChange}
                          className="space-y-3"
                        >
                          {filteredDesignations.map((designation) => (
                            <label
                              key={designation.id}
                              className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted"
                            >
                              <RadioGroupItem
                                value={designation.id}
                                disabled={isSubmitting || !designation.isActive}
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
                          ))}
                        </RadioGroup>
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
                            Create designations to assign to this account.
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
                {initialData ? "Save Changes" : "Create Account"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
