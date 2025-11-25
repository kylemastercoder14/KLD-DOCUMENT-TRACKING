/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadTemplate, removeTemplate } from "@/actions/document-category";
import { upload } from "@/lib/upload";
import { DocumentCategoryWithDesignations } from "@/types";
import { Progress } from "@/components/ui/progress";
import CircularProgress from "@/components/circular-loading";
import { cn } from "@/lib/utils";

interface TemplateUploadDialogProps {
  category: DocumentCategoryWithDesignations;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateUploadDialog({
  category,
  isOpen,
  onOpenChange,
}: TemplateUploadDialogProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (url: string) => {
      return uploadTemplate(category.id, url);
    },
    onSuccess: () => {
      toast.success("Template uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["document-categories"] });
      onOpenChange(false);
      setSelectedFile(null);
      setUploadProgress(0);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to upload template");
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      return removeTemplate(category.id);
    },
    onSuccess: () => {
      toast.success("Template removed successfully");
      queryClient.invalidateQueries({ queryKey: ["document-categories"] });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to remove template");
    },
  });

  const validateAndSetFile = useCallback((file: File) => {
    // Check if file is DOCX or DOC
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/msword", // .doc
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a DOCX or DOC file");
      return false;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return false;
    }

    setSelectedFile(file);
    return true;
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        validateAndSetFile(file);
      }
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some((e) => e.code === "file-too-large")) {
          toast.error("File size must be less than 10MB");
        } else if (rejection.errors.some((e) => e.code === "file-invalid-type")) {
          toast.error("Please upload a DOCX or DOC file");
        } else {
          toast.error("File rejected. Please try again.");
        }
      }
    },
    disabled: uploading || !!category.attachment,
  });

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const toastId = toast.loading("Uploading template...");

      const { url } = await upload(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      toast.dismiss(toastId);
      uploadMutation.mutate(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file");
      setUploading(false);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, uploadMutation]);

  const handleRemove = useCallback(() => {
    if (!category.attachment) return;
    removeMutation.mutate();
  }, [category.attachment, removeMutation]);

  const getFileName = (url: string) => {
    try {
      const urlParts = url.split("/");
      return urlParts[urlParts.length - 1] || "Template";
    } catch {
      return "Template";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Template</DialogTitle>
          <DialogDescription>
            Upload a DOCX template for "{category.name}". Users can download and use this template
            when submitting documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Template */}
          {category.attachment && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {getFileName(category.attachment)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                  disabled={removeMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

           {/* File Upload */}
           {!category.attachment && (
             <div className="space-y-2">
               <div
                 {...getRootProps({
                   className: cn(
                     "border-dashed relative border-2 rounded-xl cursor-pointer py-8 flex justify-center items-center flex-col transition-colors",
                     isDragActive
                       ? "border-primary bg-primary/5"
                       : "border-muted-foreground/25 hover:border-primary/50",
                     uploading && "opacity-50 cursor-not-allowed"
                   ),
                 })}
               >
                 <input {...getInputProps()} />
                 <div className="flex items-center justify-center size-12 rounded-full border">
                   <Upload
                    className={cn(
                      "w-5 h-5",
                      isDragActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                 </div>
                 {isDragActive ? (
                   <p className="mt-2 font-medium text-primary">
                     Drop the file here...
                   </p>
                 ) : (
                   <>
                     <p className="mt-2 font-medium">Drag & drop template file here</p>
                     <p className="mt-2 text-sm text-muted-foreground">
                       or click to browse
                     </p>
                   </>
                 )}
                 <p className="mt-2 text-sm text-muted-foreground">
                   DOCX or DOC (max 10MB)
                 </p>
                 {selectedFile && (
                   <div className="mt-4 rounded-lg border bg-muted/50 p-3">
                     <p className="text-sm font-medium text-foreground">
                       Selected: {selectedFile.name}
                     </p>
                     <p className="text-xs text-muted-foreground mt-1">
                       {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                     </p>
                   </div>
                 )}
               </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CircularProgress
                      value={uploadProgress}
                      size={24}
                      strokeWidth={3}
                      showLabel={false}
                    />
                    <span className="text-sm text-muted-foreground">
                      Uploading... {uploadProgress}%
                    </span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading || uploadMutation.isPending || removeMutation.isPending}
          >
            Cancel
          </Button>
          {!category.attachment && (
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading || uploadMutation.isPending}
            >
              {uploading ? "Uploading..." : "Upload Template"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

