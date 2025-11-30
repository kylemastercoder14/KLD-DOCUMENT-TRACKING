"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search } from "lucide-react";
import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { getDesignations } from "@/actions/designation";
import { getDocuments } from "@/actions/document";
import { DesignationWithDocuments } from "@/types";
import { DocumentForm } from "@/components/forms/document-form";
import { DataTable } from "@/components/data-table";
import { documentColumns, Document } from "./columns";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Client = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [designationSearch, setDesignationSearch] = useState("");
  const [categorySearchMap, setCategorySearchMap] = useState<
    Record<string, string>
  >({});
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Document[]>([]);

  const router = useRouter();
  const { data: designations = [], isLoading } = useQuery<
    DesignationWithDocuments[]
  >({
    queryKey: ["designations"],
    queryFn: getDesignations,
  });

  const { data: documents = [], isLoading: isDocumentsLoading } = useQuery<
    Document[]
  >({
    queryKey: ["documents"],
    queryFn: async () => {
      const docs = await getDocuments();
      return docs.map((doc) => ({
        ...doc,
        createdAt: new Date(doc.createdAt),
      }));
    },
  });

  const activeDesignations = designations.filter((d) => d.isActive);

  const filteredDesignations = useMemo(() => {
    if (!designationSearch.trim()) {
      return activeDesignations;
    }
    const term = designationSearch.toLowerCase();
    return activeDesignations.filter(
      (designation) =>
        designation.name.toLowerCase().includes(term) ||
        designation.description?.toLowerCase().includes(term) ||
        designation.documentCategories.some((cat) =>
          cat.name.toLowerCase().includes(term)
        )
    );
  }, [designationSearch, activeDesignations]);

  const getFilteredCategories = (
    designationId: string,
    categories: (typeof activeDesignations)[0]["documentCategories"]
  ) => {
    const searchTerm = categorySearchMap[designationId]?.toLowerCase() || "";
    if (!searchTerm.trim()) {
      return categories.filter((cat) => cat.isActive);
    }
    return categories.filter(
      (cat) =>
        cat.isActive &&
        (cat.name.toLowerCase().includes(searchTerm) ||
          cat.description?.toLowerCase().includes(searchTerm))
    );
  };

  const handleCategorySearchChange = (designationId: string, value: string) => {
    setCategorySearchMap((prev) => ({
      ...prev,
      [designationId]: value,
    }));
  };

  const handleCategorySelect = (categoryId: string, categoryName: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedCategoryName(categoryName);
    setIsFormOpen(true);
  };

  // Filter documents by status
  const pendingDocuments = useMemo(
    () => documents.filter((d) => d.status === "Pending"),
    [documents]
  );

  const approvedDocuments = useMemo(
    () => documents.filter((d) => d.status === "Approved"),
    [documents]
  );

  const rejectedDocuments = useMemo(
    () => documents.filter((d) => d.status === "Rejected"),
    [documents]
  );

  const documentCounts = useMemo(() => {
    return {
      all: documents.length,
      pending: pendingDocuments.length,
      approved: approvedDocuments.length,
      rejected: rejectedDocuments.length,
    };
  }, [documents, pendingDocuments, approvedDocuments, rejectedDocuments]);

  // Column handlers
  const handleViewFile = useCallback(
    (document: Document) => {
      router.push(`/hr/designate-document/view/${document.id}`);
    },
    [router]
  );

  const handleDelete = useCallback((document: Document) => {
    toast.info(`Deleting: ${document.referenceId}`);
    // TODO: Implement delete functionality
  }, []);

  const columns = useMemo(
    () =>
      documentColumns({
        onViewFile: handleViewFile,
        // onViewHistory and onComment are handled internally by CellAction component
        onDelete: handleDelete,
      }),
    [handleViewFile, handleDelete]
  );

  const renderDocumentsTable = (
    data: Document[],
    emptyTitle: string,
    emptyDescription: string
  ) => {
    if (isDocumentsLoading) {
      return <Skeleton className="h-[300px] w-full" />;
    }

    if (data.length > 0) {
      return (
        <DataTable
          columns={columns}
          data={data}
          onSelectionChange={setSelectedRows}
        />
      );
    }

    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconAlertTriangle />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Heading
          title="Designate Document"
          description="Manage, track, and process all documents."
        />
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="border-[#2E845F] text-[#2E845F] hover:bg-[#2E845F]/10 hover:text-[#2E845F]"
                disabled={isLoading}
              >
                <Plus className="size-4" />
                Submit Document
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 max-h-[500px] overflow-y-auto">
              {isLoading ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Loading...
                </div>
              ) : filteredDesignations.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">
                  {designationSearch.trim()
                    ? "No designations found"
                    : "No designations available"}
                </div>
              ) : (
                <>
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search designations..."
                        value={designationSearch}
                        onChange={(e) => setDesignationSearch(e.target.value)}
                        className="pl-8 h-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <ScrollArea className="max-h-[300px] min-h-[200px]">
                    <div className="p-1">
                      {filteredDesignations.map((designation) => {
                        const filteredCategories = getFilteredCategories(
                          designation.id,
                          designation.documentCategories
                        );

                        if (filteredCategories.length === 0) {
                          return (
                            <DropdownMenuItem key={designation.id} disabled>
                              {designation.name}
                            </DropdownMenuItem>
                          );
                        }

                        return (
                          <DropdownMenuSub key={designation.id}>
                            <DropdownMenuSubTrigger>
                              {designation.name}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-80 max-h-[400px] overflow-y-auto">
                              <div className="p-2 border-b">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    placeholder="Search categories..."
                                    value={
                                      categorySearchMap[designation.id] || ""
                                    }
                                    onChange={(e) =>
                                      handleCategorySearchChange(
                                        designation.id,
                                        e.target.value
                                      )
                                    }
                                    className="pl-8 h-8"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <ScrollArea className="max-h-60 min-h-[120px]">
                                <div className="p-1">
                                  {filteredCategories.length === 0 ? (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                      No categories found
                                    </div>
                                  ) : (
                                    filteredCategories.map((category) => (
                                      <DropdownMenuItem
                                        key={category.id}
                                        onClick={() =>
                                          handleCategorySelect(
                                            category.id,
                                            category.name
                                          )
                                        }
                                      >
                                        {category.name}
                                      </DropdownMenuItem>
                                    ))
                                  )}
                                </div>
                              </ScrollArea>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="primary" asChild>
            <Link href="/hr/document-template">
              <FileText className="h-4 w-4" />
              Document Template
            </Link>
          </Button>
        </div>
      </div>

      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
          <TabsList className="bg-background rounded-none w-full border-b p-0">
            <TabsTrigger
              value="all"
              className="bg-background data-[state=active]:border-[#2E845F] dark:data-[state=active]:border-[#2E845F] h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none"
            >
              All{" "}
              <Badge variant="secondary" className="ml-3">
                {documentCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="bg-background data-[state=active]:border-[#2E845F] dark:data-[state=active]:border-[#2E845F] h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none"
            >
              Pending{" "}
              <Badge variant="secondary" className="ml-3">
                {documentCounts.pending}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="bg-background data-[state=active]:border-[#2E845F] dark:data-[state=active]:border-[#2E845F] h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none"
            >
              Approved{" "}
              <Badge variant="secondary" className="ml-3">
                {documentCounts.approved}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="rejected"
              className="bg-background data-[state=active]:border-[#2E845F] dark:data-[state=active]:border-[#2E845F] h-full rounded-none border-0 border-b-2 border-transparent data-[state=active]:shadow-none"
            >
              Rejected{" "}
              <Badge variant="secondary" className="ml-3">
                {documentCounts.rejected}
              </Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-5">
            {renderDocumentsTable(
              documents,
              "No documents found",
              "Submit your first document to get started."
            )}
          </TabsContent>
          <TabsContent value="pending" className="mt-5">
            {renderDocumentsTable(
              pendingDocuments,
              "No pending documents",
              "You don't have any pending documents at the moment."
            )}
          </TabsContent>
          <TabsContent value="approved" className="mt-5">
            {renderDocumentsTable(
              approvedDocuments,
              "No approved documents",
              "You don't have any approved documents yet."
            )}
          </TabsContent>
          <TabsContent value="rejected" className="mt-5">
            {renderDocumentsTable(
              rejectedDocuments,
              "No rejected documents",
              "You don't have any rejected documents."
            )}
          </TabsContent>
        </Tabs>
      </div>

      <DocumentForm
        documentCategoryId={selectedCategoryId}
        documentCategoryName={selectedCategoryName}
        isDrawerOpen={isFormOpen}
        setIsDrawerOpenAction={setIsFormOpen}
      />
    </div>
  );
};
