"use client";

import { Upload } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { upload } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import CircularProgress from "@/components/circular-loading";

const ImageUpload = ({
  onImageUpload,
  defaultValue = "",
  imageCount,
  maxSize,
}: {
  onImageUpload: (url: string) => void;
  defaultValue?: string;
  imageCount: number;
  maxSize: number;
}) => {
  const [imageUrl, setImageUrl] = useState<string>(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulate progress animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoading) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev; // cap at 95% until upload finishes
          return prev + 5;
        });
      }, 150);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "image/png": [".png"],
      "image/jpg": [".jpg", ".jpeg"],
      "image/svg+xml": [".svg"],
      "image/webp": [".webp"],
    },
    maxFiles: imageCount,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > imageCount) {
        toast.error(`You can only upload ${imageCount} image(s).`);
        return;
      }

      // eslint-disable-next-line prefer-const
      let file = acceptedFiles[0];

      if (file.size > maxSize * 1024 * 1024) {
        toast.error("Please upload a smaller image.");
        return;
      }

      // Rename the file
      const fileExtension = file.name.split(".").pop();
      const now = new Date();
      const formattedTimestamp = `${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(
        2,
        "0"
      )}-${now.getFullYear()}-${String(now.getHours()).padStart(
        2,
        "0"
      )}-${String(now.getMinutes()).padStart(2, "0")}-${String(
        now.getSeconds()
      ).padStart(2, "0")}`;
      const newFileName = `${formattedTimestamp}.${fileExtension}`;
      const renamedFile = new File([file], newFileName, { type: file.type });

      setIsLoading(true);
      // Show initial loading toast and get the toast id
      const toastId = toast.loading("Uploading image...");

      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { url } = await upload(renamedFile);

        // Ensure full progress before completing
        setProgress(100);
        await new Promise((resolve) => setTimeout(resolve, 300));

        toast.dismiss(toastId);
        toast.success("Image uploaded successfully!");
        setImageUrl(url);
        onImageUpload(url);
      } catch (error) {
        setImageUrl("");
        toast.dismiss(toastId);
        toast.error("Image upload failed.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
  });

  const handleRemoveImage = () => {
    setImageUrl("");
    toast.info("Image removed.");
    onImageUpload("");
  };

  return (
    <div className="rounded-xl w-full">
      <div
        {...getRootProps({
          className:
            "border-dashed relative border-[2px] rounded-xl cursor-pointer py-8 flex justify-center items-center flex-col",
        })}
      >
        <input {...getInputProps()} />
        {isLoading ? (
          // Loading Layout
          <div className="flex flex-col items-center justify-center gap-2">
            <CircularProgress
              value={progress}
              size={120}
              strokeWidth={10}
              showLabel
              labelClassName="text-xl font-bold"
              renderLabel={(val) => `${val}%`}
            />
            <p className="font-medium">Uploading...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we process your image
            </p>
          </div>
        ) : imageUrl ? (
          <>
            <div className="flex flex-col items-center gap-2">
              <Image
                src={imageUrl}
                alt="Uploaded Image"
                width={100}
                height={100}
                className="rounded-md object-cover"
              />
              <p className="font-medium">Image Uploaded</p>
              <p className="text-sm text-muted-foreground">
                Click here to upload another image
              </p>
            </div>
            <div className="absolute bottom-4 right-4">
              <Button
                variant="destructive"
                type="button"
                onClick={handleRemoveImage}
              >
                Remove
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center size-12 rounded-full border">
              <Upload className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="mt-2 font-medium">Drag & drop images here</p>
            <p className="mt-2 mb-4 text-sm text-muted-foreground">
              or click to browse (max {imageCount || 1} file(s), up to{" "}
              {maxSize || 4}MB each)
            </p>
            <Button type="button" variant="secondary">
              Browse files
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
