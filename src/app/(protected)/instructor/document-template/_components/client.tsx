"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Folder, FileText, ChevronRight } from "lucide-react";
import Heading from "@/components/heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDesignations } from "@/actions/designation";
import { getDocumentCategories } from "@/actions/document-category";
import { DesignationWithDocuments } from "@/types";
import { DocumentCategoryWithDesignations } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { IconAlertTriangle } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TemplateViewerDialog } from "@/app/(protected)/admin/document-category/_components/template-viewer-dialog";

type ViewMode = "designations" | "categories" | "template";
type NavigationState = {
  mode: ViewMode;
  selectedDesignationId?: string;
  selectedDesignationName?: string;
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  templateUrl?: string;
  templateFileName?: string;
};

export const Client = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [navigation, setNavigation] = useState<NavigationState>({
    mode: "designations",
  });

  const { data: designations = [], isLoading: isDesignationsLoading } =
    useQuery<DesignationWithDocuments[]>({
      queryKey: ["designations"],
      queryFn: getDesignations,
    });

  const { data: documentCategories = [], isLoading: isCategoriesLoading } =
    useQuery<DocumentCategoryWithDesignations[]>({
      queryKey: ["document-categories"],
      queryFn: getDocumentCategories,
    });

  const activeDesignations = useMemo(
    () => designations.filter((d) => d.isActive),
    [designations]
  );

  // Filter designations by search
  const filteredDesignations = useMemo(() => {
    if (!searchQuery.trim() || navigation.mode !== "designations") {
      return activeDesignations;
    }
    const term = searchQuery.toLowerCase();
    return activeDesignations.filter(
      (designation) =>
        designation.name.toLowerCase().includes(term) ||
        designation.description?.toLowerCase().includes(term)
    );
  }, [searchQuery, activeDesignations, navigation.mode]);

  // Get categories for selected designation
  const categoriesForDesignation = useMemo(() => {
    if (navigation.mode !== "categories" || !navigation.selectedDesignationId) {
      return [];
    }

    const designation = designations.find(
      (d) => d.id === navigation.selectedDesignationId
    );
    if (!designation) return [];

    const categories = designation.documentCategories.filter((cat) => cat.isActive);

    // Filter by search if provided
    if (searchQuery.trim()) {
      const term = searchQuery.toLowerCase();
      return categories.filter(
        (cat) =>
          cat.name.toLowerCase().includes(term) ||
          cat.description?.toLowerCase().includes(term)
      );
    }

    return categories;
  }, [navigation, designations, searchQuery]);

  const handleDesignationClick = (designation: DesignationWithDocuments) => {
    setNavigation({
      mode: "categories",
      selectedDesignationId: designation.id,
      selectedDesignationName: designation.name,
    });
    setSearchQuery("");
  };

  const handleCategoryClick = (category: DocumentCategoryWithDesignations) => {
    if (!category.attachment) {
      return;
    }
    const fileName = category.attachment.split("/").pop() || "Template.docx";
    setNavigation({
      mode: "template",
      selectedDesignationId: navigation.selectedDesignationId,
      selectedDesignationName: navigation.selectedDesignationName,
      selectedCategoryId: category.id,
      selectedCategoryName: category.name,
      templateUrl: category.attachment,
      templateFileName: fileName,
    });
  };

  const handleBack = () => {
    if (navigation.mode === "template") {
      setNavigation({
        mode: "categories",
        selectedDesignationId: navigation.selectedDesignationId,
        selectedDesignationName: navigation.selectedDesignationName,
      });
    } else if (navigation.mode === "categories") {
      setNavigation({ mode: "designations" });
      setSearchQuery("");
    }
  };


  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {navigation.mode !== "designations" && (
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Heading
          title={
            navigation.mode === "designations"
              ? "Document Templates"
              : navigation.mode === "categories"
                ? navigation.selectedDesignationName || "Document Categories"
                : navigation.selectedCategoryName || "Template"
          }
          description={
            navigation.mode === "designations"
              ? "Browse document templates organized by designation and category."
              : navigation.mode === "categories"
                ? `Select a document category to view or download its template.`
                : "View or download the document template."
          }
        />
      </div>

      {/* Search Bar */}
      {navigation.mode !== "template" && (
        <div className="max-w-md">
          <Input
            placeholder={
              navigation.mode === "designations"
                ? "Search designations..."
                : "Search categories..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {/* Content */}
      {isDesignationsLoading || isCategoriesLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : navigation.mode === "designations" ? (
        filteredDesignations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDesignations.map((designation) => {
              const categoryCount = designation.documentCategories.filter(
                (cat) => cat.isActive && cat.attachment
              ).length;
              return (
                <button
                  key={designation.id}
                  onClick={() => handleDesignationClick(designation)}
                  className="group relative rounded-lg border bg-card p-6 hover:border-primary hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                        <Folder className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{designation.name}</h3>
                  {designation.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {designation.description}
                    </p>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {categoryCount} template{categoryCount !== 1 ? "s" : ""}
                  </Badge>
                </button>
              );
            })}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconAlertTriangle />
              </EmptyMedia>
              <EmptyTitle>No designations found</EmptyTitle>
              <EmptyDescription>
                {searchQuery.trim()
                  ? "Try adjusting your search keywords."
                  : "No active designations available."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : navigation.mode === "categories" ? (
        categoriesForDesignation.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoriesForDesignation.map((category) => {
              const hasTemplate = !!category.attachment;
              return (
                <button
                  key={category.id}
                  onClick={() => hasTemplate && handleCategoryClick(category)}
                  disabled={!hasTemplate}
                  className={cn(
                    "group relative rounded-lg border bg-card p-6 hover:border-primary hover:shadow-md transition-all text-left",
                    !hasTemplate && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-lg p-3 transition-colors",
                          hasTemplate
                            ? "bg-primary/10 group-hover:bg-primary/20"
                            : "bg-muted"
                        )}
                      >
                        <FileText
                          className={cn(
                            "h-6 w-6",
                            hasTemplate ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                      </div>
                    </div>
                    {hasTemplate && (
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {category.description}
                    </p>
                  )}
                  {hasTemplate ? (
                    <Badge variant="secondary" className="text-xs">
                      Template available
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      No template
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconAlertTriangle />
              </EmptyMedia>
              <EmptyTitle>No categories found</EmptyTitle>
              <EmptyDescription>
                {searchQuery.trim()
                  ? "Try adjusting your search keywords."
                  : "No document categories with templates available for this designation."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )
      ) : null}

      {/* Template Viewer Dialog */}
      {navigation.mode === "template" &&
        navigation.templateUrl &&
        navigation.templateFileName &&
        navigation.selectedCategoryName && (
          <TemplateViewerDialog
            templateUrl={navigation.templateUrl}
            fileName={navigation.templateFileName}
            categoryName={navigation.selectedCategoryName}
            isOpen={true}
            onOpenChange={(open) => {
              if (!open) {
                handleBack();
              }
            }}
          />
        )}
    </div>
  );
};

