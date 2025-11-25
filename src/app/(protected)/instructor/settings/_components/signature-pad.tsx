/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import {
  Upload,
  X,
  RotateCcw,
  Pen,
  Image as ImageIcon,
  Shield,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getSignature, saveSignature } from "@/actions/signature";

interface SignaturePadProps {
  onSave?: (signatureData: string) => void;
}

export function SignaturePad({ onSave }: SignaturePadProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing signature
  const { data: existingSignature, isLoading } = useQuery({
    queryKey: ["signature"],
    queryFn: getSignature,
  });

  // Save signature mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { imageData: string; passcode: string }) => {
      return saveSignature(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["signature"] });
      toast.success("Signature saved successfully");
      onSave?.(data.imageData);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save signature");
    },
  });

  // Load existing signature into canvas if available
  useEffect(() => {
    if (
      existingSignature?.imageData &&
      sigCanvasRef.current &&
      mode === "draw"
    ) {
      const img = new Image();
      img.src = existingSignature.imageData;
      img.onload = () => {
        const canvas = sigCanvasRef.current?.getCanvas();
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(
              canvas.width / img.width,
              canvas.height / img.height
            );
            const x = (canvas.width - img.width * scale) / 2;
            const y = (canvas.height - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
          }
        }
      };
    }
  }, [existingSignature?.imageData, mode]);

  const handleClear = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setUploadedImage(null);
  };

  const handleSave = () => {
    // Validate passcode
    if (!passcode || passcode.length !== 6 || !/^\d+$/.test(passcode)) {
      toast.error("Please enter a valid 6-digit passcode");
      return;
    }

    let imageData: string | null = null;

    // If user has an existing signature, allow updating just the passcode
    // OR updating the signature image if they've drawn/uploaded a new one
    if (existingSignature?.imageData) {
      // Check if user wants to update the signature image
      if (mode === "draw" && sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
        // User drew a new signature
        imageData = sigCanvasRef.current.toDataURL("image/png");
      } else if (mode === "upload" && uploadedImage) {
        // User uploaded a new signature
        imageData = uploadedImage;
      } else {
        // User just wants to update the passcode, use existing signature
        imageData = existingSignature.imageData;
      }
    } else {
      // No existing signature, require new signature
      if (mode === "draw" && sigCanvasRef.current) {
        if (sigCanvasRef.current.isEmpty()) {
          toast.error("Please draw or upload a signature first");
          return;
        }
        imageData = sigCanvasRef.current.toDataURL("image/png");
      } else if (mode === "upload" && uploadedImage) {
        imageData = uploadedImage;
      } else {
        toast.error("Please draw or upload a signature first");
        return;
      }
    }

    if (!imageData) {
      toast.error("No signature to save");
      return;
    }

    saveMutation.mutate({
      imageData,
      passcode,
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setUploadedImage(result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    noClick: mode !== "upload",
  });

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setUploadedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "draw" | "upload")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <Pen className="h-4 w-4" />
              Draw Signature
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Upload Image
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4 mt-4">
            <div className="rounded-lg border-2 border-dashed bg-muted/20 p-4">
              <div className="bg-white rounded-lg border shadow-sm">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  canvasProps={{
                    className: "w-full h-[200px] touch-none",
                    style: { touchAction: "none" },
                  }}
                  penColor="#000000"
                  backgroundColor="#ffffff"
                  minWidth={1}
                  maxWidth={3}
                  throttle={16}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Sign using your mouse or touch screen
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClear}
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <div
              {...getRootProps()}
              className={cn(
                "rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 bg-muted/20 hover:border-primary/50 hover:bg-primary/5"
              )}
            >
              <input
                {...getInputProps()}
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/*"
              />
              {uploadedImage ? (
                <div className="space-y-4">
                  <div className="relative inline-block max-w-full">
                    <img
                      src={uploadedImage}
                      alt="Uploaded signature"
                      className="max-h-[200px] max-w-full rounded-lg border bg-white p-2"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedImage(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click or drag to replace image
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {isDragActive
                        ? "Drop the image here"
                        : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setUploadedImage(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
                className="flex-1"
                disabled={!uploadedImage}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {isLoading ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">
              Loading signature...
            </p>
          </div>
        ) : existingSignature?.imageData ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm font-medium mb-2">Current Signature:</p>
            <div className="bg-white rounded border p-2 inline-block">
              <img
                src={existingSignature.imageData}
                alt="Saved signature"
                className="max-h-20 max-w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last updated:{" "}
              {new Date(existingSignature.updatedAt).toLocaleDateString()}
            </p>
          </div>
        ) : null}
      </div>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Shield className="h-4 w-4" /> Security Protection
          </h3>
          <p className="text-sm text-muted-foreground mt-3">
            Set a unique passcode required every time you apply this signature
            to a document.
          </p>
        </div>
         <div className="space-y-2">
           <Label>Signature Passcode (6 digits)</Label>
           <InputOTP
             maxLength={6}
             value={passcode}
             onChange={(value) => {
               setPasscode(value);
             }}
             disabled={saveMutation.isPending}
           >
             <InputOTPGroup>
               <InputOTPSlot className='size-15' index={0} />
               <InputOTPSlot className='size-15' index={1} />
               <InputOTPSlot className='size-15' index={2} />
               <InputOTPSlot className='size-15' index={3} />
               <InputOTPSlot className='size-15' index={4} />
               <InputOTPSlot className='size-15' index={5} />
             </InputOTPGroup>
           </InputOTP>
           <p className="text-xs text-muted-foreground">
             This is separate from your account password.
           </p>
         </div>
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-md p-4">
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-400">
                Security Note
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-500/90 leading-relaxed">
                Your e-signature is encrypted. Even admins cannot view or use
                your signature without this passcode.
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleSave}
          className="flex items-center justify-end ml-auto"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? "Saving..."
            : existingSignature
            ? "Update Signature"
            : "Save Signature"}
        </Button>
      </div>
    </div>
  );
}
