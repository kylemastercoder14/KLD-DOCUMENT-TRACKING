"use client";

import { Upload, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { upload } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import CircularProgress from "@/components/circular-loading";

const FileUpload = ({
  onFilesUpload,
  defaultValues = [],
  maxFiles = 3,
  maxSize = 10, // in MB
}: {
  onFilesUpload: (urls: string[]) => void;
  defaultValues?: string[];
  maxFiles?: number;
  maxSize?: number;
}) => {
  const [fileUrls, setFileUrls] = useState<string[]>(defaultValues);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});

  useEffect(() => {
    setFileUrls(defaultValues);
  }, [defaultValues]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      // "image/png": [".png"],
      // "image/jpg": [".jpg", ".jpeg"],
      // "image/webp": [".webp"],
    },
    maxFiles: maxFiles - fileUrls.length,
    onDrop: async (acceptedFiles) => {
      if (fileUrls.length + acceptedFiles.length > maxFiles) {
        toast.error(`You can only upload up to ${maxFiles} file(s).`);
        return;
      }

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const currentIndex = fileUrls.length + i;

        if (file.size > maxSize * 1024 * 1024) {
          toast.error(`File "${file.name}" exceeds ${maxSize}MB.`);
          continue;
        }

        // Rename the file
        const fileExtension = file.name.split(".").pop();
        const now = new Date();
        const formattedTimestamp = `${String(now.getMonth() + 1).padStart(
          2,
          "0"
        )}-${String(now.getDate()).padStart(2, "0")}-${now.getFullYear()}-${String(
          now.getHours()
        ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(
          now.getSeconds()
        ).padStart(2, "0")}`;
        const newFileName = `${formattedTimestamp}.${fileExtension}`;
        const renamedFile = new File([file], newFileName, { type: file.type });

        setUploadingIndex(currentIndex);
        setUploadProgress((prev) => ({ ...prev, [currentIndex]: 0 }));

        const toastId = toast.loading(`Uploading ${file.name}...`);

        try {
          const { url } = await upload(renamedFile, (progress) => {
            setUploadProgress((prev) => ({ ...prev, [currentIndex]: progress }));
          });

          const updatedUrls = [...fileUrls, url];
          setFileUrls(updatedUrls);
          onFilesUpload(updatedUrls);
          toast.dismiss(toastId);
          toast.success(`${file.name} uploaded successfully!`);
        } catch (error) {
          toast.dismiss(toastId);
          toast.error(`Failed to upload ${file.name}.`);
          console.error(error);
        } finally {
          setUploadingIndex(null);
          setUploadProgress((prev) => {
            const newProgress = { ...prev };
            delete newProgress[currentIndex];
            return newProgress;
          });
        }
      }
    },
  });

  const handleRemoveFile = (index: number) => {
    const newUrls = fileUrls.filter((_, i) => i !== index);
    setFileUrls(newUrls);
    onFilesUpload(newUrls);
    toast.info("File removed.");
  };

  const getFileName = (url: string) => {
    try {
      const urlParts = url.split("/");
      return urlParts[urlParts.length - 1] || "File";
    } catch {
      return "File";
    }
  };

  const canUploadMore = fileUrls.length < maxFiles;

  return (
    <div className="space-y-4">
      {fileUrls.length > 0 && (
        <div className="space-y-2">
          {fileUrls.map((url, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="shrink-0">
                  <Upload className="size-4 text-muted-foreground" />
                </div>
                <span className="text-sm truncate">{getFileName(url)}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(index)}
                className="shrink-0"
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {canUploadMore && (
        <div
          {...getRootProps({
            className:
              "border-dashed relative border-[2px] rounded-xl cursor-pointer py-8 flex justify-center items-center flex-col",
          })}
        >
          <input {...getInputProps()} />
          {uploadingIndex !== null ? (
            <div className="flex flex-col items-center justify-center gap-2">
              <CircularProgress
                value={uploadProgress[uploadingIndex] || 0}
                size={120}
                strokeWidth={10}
                showLabel
                labelClassName="text-xl font-bold"
                renderLabel={(val) => `${val}%`}
              />
              <p className="font-medium">Uploading...</p>
              <p className="text-sm text-muted-foreground">
                Please wait while we process your file
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center size-12 rounded-full border">
                <Upload className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="mt-2 font-medium">Drag & drop files here</p>
              <p className="mt-2 mb-4 text-sm text-muted-foreground">({maxFiles - fileUrls.length} file(s) remaining, up to{" "}
                {maxSize}MB each)
              </p>
              <Button type="button" variant="secondary">
                Browse files
              </Button>
            </>
          )}
        </div>
      )}

      {!canUploadMore && (
        <p className="text-sm text-muted-foreground text-center">
          Maximum {maxFiles} file(s) reached. Remove a file to upload another.
        </p>
      )}
    </div>
  );
};

export default FileUpload;

