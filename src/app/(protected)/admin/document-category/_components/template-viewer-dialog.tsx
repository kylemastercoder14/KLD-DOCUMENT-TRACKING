"use client";

import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TemplateViewerDialogProps {
  templateUrl: string;
  fileName: string;
  categoryName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateViewerDialog({
  templateUrl,
  fileName,
  categoryName,
  isOpen,
  onOpenChange,
}: TemplateViewerDialogProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = templateUrl;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Use Microsoft Office Online viewer for DOCX files
  // Note: The file URL must be publicly accessible for the viewer to work
  const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
    templateUrl
  )}`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl! h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <DialogTitle>Template Viewer</DialogTitle>
                <DialogDescription>
                  {categoryName} - {fileName}
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <iframe
                src={viewerUrl}
                className="w-full h-[calc(90vh-200px)] min-h-[600px]"
                title={`Template viewer for ${fileName}`}
                allow="fullscreen"
              />
            </div>
            <div className="mt-4 rounded-lg border bg-blue-50/50 border-blue-200 p-4">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> If the document doesn&apos;t load, you can{" "}
                <button
                  onClick={handleDownload}
                  className="underline cursor-pointer font-medium hover:text-blue-700"
                >
                  download it
                </button>{" "}
                to view it locally.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

