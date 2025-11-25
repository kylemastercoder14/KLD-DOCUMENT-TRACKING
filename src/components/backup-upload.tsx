"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { upload } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import CircularProgress from "@/components/circular-loading";

type BackupUploadProps = {
  onUploaded: (payload: { url: string; size: number; name: string }) => void;
  maxSizeMb?: number;
};

export const BackupUpload = ({
  onUploaded,
  maxSizeMb = 50,
}: BackupUploadProps) => {
  const [fileInfo, setFileInfo] = useState<{
    name: string;
    size: number;
    uploading: boolean;
    progress: number;
  }>({ name: "", size: 0, uploading: false, progress: 0 });

  const onDrop = async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMb}MB`);
      return;
    }

    setFileInfo({
      name: file.name,
      size: file.size,
      uploading: true,
      progress: 0,
    });

    const toastId = toast.loading("Uploading backup file...");
    try {
      const interval = setInterval(() => {
        setFileInfo((prev) => ({
          ...prev,
          progress: prev.progress >= 95 ? prev.progress : prev.progress + 5,
        }));
      }, 200);

      const { url } = await upload(file);

      clearInterval(interval);
      setFileInfo((prev) => ({ ...prev, uploading: false, progress: 100 }));

      toast.success("Backup file uploaded", { id: toastId });
      onUploaded({
        url,
        size: Number((file.size / (1024 * 1024)).toFixed(2)),
        name: file.name,
      });
    } catch (error) {
      console.error(error);
      setFileInfo({ name: "", size: 0, uploading: false, progress: 0 });
      toast.error("Upload failed", { id: toastId });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    accept: {
      "application/sql": [".sql"],
      "application/zip": [".zip"],
      "application/x-gzip": [".gz"],
    },
  });

  return (
    <div
      {...getRootProps({
        className:
          "border-dashed relative border-[2px] rounded-xl cursor-pointer py-6 flex justify-center items-center flex-col px-6",
      })}
    >
      <input {...getInputProps()} />
      {fileInfo.uploading ? (
        <div className="flex flex-col items-center gap-2">
          <CircularProgress
            value={fileInfo.progress}
            size={100}
            strokeWidth={10}
            showLabel
            labelClassName="text-lg font-bold"
            renderLabel={(val) => `${val}%`}
          />
          <p className="text-sm text-muted-foreground">{fileInfo.name}</p>
        </div>
      ) : fileInfo.name ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-medium">{fileInfo.name}</p>
          <p className="text-sm text-muted-foreground">
            {(fileInfo.size / (1024 * 1024)).toFixed(2)} MB
          </p>
          <p className="text-xs text-muted-foreground">
            Click to replace the uploaded file.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center justify-center size-12 rounded-full border">
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="font-medium">
            {isDragActive ? "Drop the backup file here" : "Upload Backup File"}
          </p>
          <p className="text-sm text-muted-foreground">
            Drag & drop .sql or .zip file here (max {maxSizeMb}MB)
          </p>
          <Button type="button" variant="secondary">
            Browse files
          </Button>
        </div>
      )}
    </div>
  );
};

