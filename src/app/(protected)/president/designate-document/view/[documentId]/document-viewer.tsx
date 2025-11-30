"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Upload, Copy, Check, Save } from "lucide-react";
import { format } from "date-fns";
import { replaceDocumentAttachment, type getDocumentById } from "@/actions/document";
import type { getCurrentUser } from "@/actions/user";
import { upload } from "@/lib/upload";

const docxStyles = `
.docx-wrapper {
  max-width: 900px;
  margin: 0 auto;
  font-family: "Times New Roman", serif;
  color: #0f172a;
  line-height: 1.5;
}
.docx-wrapper p {
  margin: 0 0 0.75rem 0;
}
.docx-wrapper h1,
.docx-wrapper h2,
.docx-wrapper h3,
.docx-wrapper h4,
.docx-wrapper h5,
.docx-wrapper h6 {
  margin: 1.5rem 0 0.75rem 0;
  font-weight: 600;
}
.docx-wrapper table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
.docx-wrapper table th,
.docx-wrapper table td {
  border: 1px solid #e2e8f0;
  padding: 0.5rem;
  text-align: left;
}
`;

const HTML2CANVAS_SCALE = 2;
const containsLabColor = (value: string) =>
  typeof value === "string" && value.toLowerCase().includes("lab(");

const removeLabRuleBlocks = (value: string) => {
  if (!containsLabColor(value)) return value;

  let sanitized = "";
  let cursor = 0;
  const lowerValue = value.toLowerCase();

  while (cursor < value.length) {
    const matchIndex = lowerValue.indexOf("lab(", cursor);
    if (matchIndex === -1) {
      sanitized += value.slice(cursor);
      break;
    }

    let blockStart = matchIndex;
    while (blockStart >= 0 && value[blockStart] !== "{") {
      if (value[blockStart] === "}") break;
      blockStart -= 1;
    }

    if (blockStart === -1 || value[blockStart] !== "{") {
      sanitized += value.slice(cursor, matchIndex);
      cursor = matchIndex;
      break;
    }

    sanitized += value.slice(cursor, blockStart);

    let depth = 1;
    let blockEnd = blockStart + 1;
    while (blockEnd < value.length && depth > 0) {
      const char = value[blockEnd];
      if (char === "{") depth += 1;
      else if (char === "}") depth -= 1;
      blockEnd += 1;
    }

    cursor = blockEnd;
  }

  return sanitized;
};

const sanitizeLabColorUsage = (value: string) => {
  if (!containsLabColor(value)) {
    return value;
  }

  const withoutBlocks = removeLabRuleBlocks(value);
  if (!containsLabColor(withoutBlocks)) {
    return withoutBlocks;
  }

  let sanitized = "";
  let cursor = 0;
  const lowerValue = withoutBlocks.toLowerCase();

  while (cursor < withoutBlocks.length) {
    const matchIndex = lowerValue.indexOf("lab(", cursor);
    if (matchIndex === -1) {
      sanitized += withoutBlocks.slice(cursor);
      break;
    }

    sanitized += withoutBlocks.slice(cursor, matchIndex);

    let depth = 0;
    let endIndex = matchIndex;
    while (endIndex < withoutBlocks.length) {
      const char = withoutBlocks[endIndex];
      if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          endIndex += 1;
          break;
        }
      }
      endIndex += 1;
    }

    while (endIndex < withoutBlocks.length && /\s/.test(withoutBlocks[endIndex])) {
      endIndex += 1;
    }

    let terminatorIndex = endIndex;
    while (
      terminatorIndex < withoutBlocks.length &&
      withoutBlocks[terminatorIndex] !== ";" &&
      withoutBlocks[terminatorIndex] !== "}"
    ) {
      terminatorIndex += 1;
    }

    if (terminatorIndex < withoutBlocks.length && withoutBlocks[terminatorIndex] === ";") {
      terminatorIndex += 1;
    }

    cursor = endIndex;

    sanitized = sanitized.replace(/\s*$/g, "");

    if (terminatorIndex < withoutBlocks.length && withoutBlocks[terminatorIndex - 1] === "}") {
      sanitized += "}";
      cursor = terminatorIndex;
    } else {
      cursor = terminatorIndex;
    }
  }

  return sanitized;
};

type SignatureRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const getFileExtension = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const sanitized = value.split("?")[0];
  const lastDotIndex = sanitized.lastIndexOf(".");
  return lastDotIndex === -1 ? "" : sanitized.slice(lastDotIndex + 1).toLowerCase();
};

const measureSignatureRects = (
  root: HTMLDivElement | null
): Record<string, SignatureRect> => {
  if (!root || typeof window === "undefined") {
    return {};
  }

  const wrapperRect = root.getBoundingClientRect();
  const elements = root.querySelectorAll<HTMLElement>("[data-signature-id]");
  const map: Record<string, SignatureRect> = {};

  elements.forEach((element) => {
    const signatureId = element.dataset.signatureId;
    if (!signatureId) return;
    const rect = element.getBoundingClientRect();
    map[signatureId] = {
      x: rect.left - wrapperRect.left,
      y: rect.top - wrapperRect.top,
      width: rect.width,
      height: rect.height,
    };
  });

  return map;
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Image loading is only available in the browser"));
      return;
    }
    const image = new window.Image();
    // Only set crossOrigin for non-data URLs (external images)
    // Data URLs don't need crossOrigin and setting it can cause issues
    if (!src.startsWith("data:")) {
    image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load signature image"));
    image.src = src;
  });

const sanitizeLabColors = (root: HTMLElement) => {
  root.querySelectorAll<HTMLElement>("[style]").forEach((el) => {
    const styleAttr = el.getAttribute("style");
    if (!styleAttr || !containsLabColor(styleAttr)) return;
    el.setAttribute("style", sanitizeLabColorUsage(styleAttr));
  });
  root.querySelectorAll<HTMLStyleElement>("style").forEach((styleEl) => {
    const cssText = styleEl.textContent;
    if (!cssText || !containsLabColor(cssText)) return;
    styleEl.textContent = sanitizeLabColorUsage(cssText);
  });
};

const sanitizeComputedStyles = (element: HTMLElement, doc: Document) => {
  // Ensure the element is connected and the document has a window
  if (!element.isConnected || !doc.defaultView) {
    return;
  }

  const computedStyle = doc.defaultView.getComputedStyle(element);
  if (!computedStyle) return;

  const colorProps = [
    "color",
    "backgroundColor",
    "background",
    "borderColor",
    "borderTopColor",
    "borderRightColor",
    "borderBottomColor",
    "borderLeftColor",
    "border",
    "borderTop",
    "borderRight",
    "borderBottom",
    "borderLeft",
    "outlineColor",
    "outline",
    "textDecorationColor",
    "textDecoration",
    "columnRuleColor",
    "boxShadow",
    "textShadow",
  ];

  colorProps.forEach((prop) => {
    try {
      const value = computedStyle.getPropertyValue(prop);
      if (value && containsLabColor(value)) {
        // Replace with safe fallback based on property type
        if (prop.includes("background")) {
          element.style.setProperty(prop, "#ffffff", "important");
        } else if (prop.includes("border") || prop.includes("outline")) {
          element.style.setProperty(prop, "1px solid #000", "important");
        } else if (prop.includes("shadow")) {
          element.style.setProperty(prop, "none", "important");
        } else {
          element.style.setProperty(prop, "#000", "important");
        }
      }
    } catch (error) {
      // Ignore errors for unsupported properties
      console.debug("Error sanitizing property", prop, error);
    }
  });

  // Recursively sanitize all children
  for (const child of Array.from(element.children)) {
    if (child instanceof HTMLElement) {
      sanitizeComputedStyles(child, doc);
    }
  }
};

const collectSanitizedGlobalStyles = async (): Promise<string[]> => {
  const doc = typeof window !== "undefined" ? globalThis.document : null;
  if (!doc) {
    return [];
  }

  const sanitizedStyles: string[] = [];
  const stylesheetNodes = Array.from(
    doc.querySelectorAll<HTMLStyleElement | HTMLLinkElement>("style, link[rel='stylesheet']")
  );

  for (const node of stylesheetNodes) {
    try {
      if (node instanceof HTMLStyleElement) {
        const cssText = node.textContent ?? "";
        if (!cssText) continue;
        // Skip stylesheets that contain lab() colors entirely
        if (containsLabColor(cssText)) {
          console.warn("Skipping stylesheet with lab() colors:", node.id || "inline");
          continue;
        }
        sanitizedStyles.push(cssText);
      } else if (node instanceof HTMLLinkElement && node.href) {
        try {
          const response = await fetch(node.href, { credentials: "same-origin" });
          if (!response.ok) continue;
          const cssText = await response.text();
          // Skip stylesheets that contain lab() colors entirely
          if (containsLabColor(cssText)) {
            console.warn("Skipping external stylesheet with lab() colors:", node.href);
            continue;
          }
          sanitizedStyles.push(cssText);
        } catch (fetchError) {
          console.warn("Unable to fetch stylesheet:", node.href, fetchError);
        }
      }
    } catch (error) {
      console.warn("Unable to clone stylesheet for export", error);
    }
  }

  // Add minimal safe styles for document rendering
  sanitizedStyles.push(`
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: "Times New Roman", serif;
      color: #0f172a;
      line-height: 1.5;
    }
    ${docxStyles}
  `);

  return sanitizedStyles;
};

const makeWhiteTransparent = (dataUrl: string) =>
  new Promise<string>((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve(dataUrl);
      return;
    }

    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const dom = globalThis.document;
      if (!dom) {
        resolve(dataUrl);
        return;
      }
      const canvas = dom.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to process signature image"));
        return;
      }
      context.drawImage(image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const isNearWhite = r > 240 && g > 240 && b > 240;
        if (isNearWhite) {
          data[i + 3] = 0;
        }
      }
      context.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Unable to load signature image"));
    image.src = dataUrl;
  });

type ViewerDocument = NonNullable<Awaited<ReturnType<typeof getDocumentById>>>;
type ViewerUser = Awaited<ReturnType<typeof getCurrentUser>>;

type SignatureLayer = {
  id: string;
  label: string;
  src: string;
  scale: number;
  opacity: number;
  position: {
    x: number;
    y: number;
  };
};

interface DocumentViewerProps {
  document: ViewerDocument;
  currentUser: ViewerUser;
}

export function DocumentViewer({ document, currentUser }: DocumentViewerProps) {
  const router = useRouter();
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragStateRef = useRef<{
    id: string | null;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  }>({ id: null, offsetX: 0, offsetY: 0, width: 0, height: 0 });
  const isDraggingRef = useRef(false);
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<SignatureLayer[]>([]);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [activeSignatureId, setActiveSignatureId] = useState<string | null>(null);
  const [isProcessingStoredSignature, setIsProcessingStoredSignature] = useState(false);
  const [wasCopied, setWasCopied] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; name?: string | null }>({
    url: document.attachment,
    name: document.attachmentName,
  });

  const activeSignature = signatures.find((sig) => sig.id === activeSignatureId) ?? null;
  const hasSignatures = signatures.length > 0;
  const attachmentExtension = getFileExtension(attachment.name || attachment.url);
  const isPdfAttachment = attachmentExtension === "pdf";
  // Always allow signature attachment, regardless of document type
  const canEditDocument = true; // Always allow editing for signature attachment
  const canSavePdf = hasSignatures; // Allow saving if there are signatures

  const generateSignatureId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  const addSignature = (src: string, label?: string) => {
    setSignatures((prev) => {
      const newSignature: SignatureLayer = {
        id: generateSignatureId(),
        label: label?.trim() || `Signature ${prev.length + 1}`,
        src,
        scale: 1,
        opacity: 1,
        position: { x: 40, y: 40 },
      };
      setActiveSignatureId(newSignature.id);
      return [...prev, newSignature];
    });
  };

  useEffect(() => {
    setAttachment({
      url: document.attachment,
      name: document.attachmentName,
    });
  }, [document.attachment, document.attachmentName]);

  useEffect(() => {
    // Removed: No longer clear signatures when document is PDF
    // Signatures should always be available for attachment
    if (false && hasSignatures) {
      setSignatures([]);
      setActiveSignatureId(null);
    }
  }, [canEditDocument, hasSignatures]);

  useEffect(() => {
    let cancelled = false;

    const renderDocx = async () => {
      if (!viewerRef.current) return;
      setIsLoadingDoc(true);
      setDocError(null);
      try {
        const response = await fetch(attachment.url);
        if (!response.ok) {
          throw new Error("Failed to fetch document.");
        }
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled || !viewerRef.current) {
          return;
        }
        viewerRef.current.innerHTML = "";
        const mammoth = await import("mammoth/mammoth.browser.js");
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled && viewerRef.current) {
          viewerRef.current.innerHTML = result.value || "<p>Unable to render document.</p>";
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setDocError("Unable to load the document. Please try again later.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDoc(false);
        }
      }
    };

    const renderPdf = async () => {
      if (typeof window === "undefined") {
        return;
      }
      setIsLoadingDoc(true);
      setDocError(null);
      try {
        const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf");
        const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry");
        const workerSrc = (pdfjsWorker as any).default || pdfjsWorker;
        if (pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        }
        const loadingTask = pdfjsLib.getDocument({
          url: attachment.url,
          httpHeaders: {},
        });
        const pdf = await loadingTask.promise;
        const images: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.2 });
          const canvas = globalThis.document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            throw new Error("Unable to initialize canvas context.");
          }

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({ canvasContext: context, viewport }).promise;
          if (!cancelled) {
            images.push(canvas.toDataURL("image/png"));
          }
        }
        await loadingTask.destroy();
        if (!cancelled) {
          setPdfPages(images);
        }
      } catch (error) {
        console.error("Failed to render PDF", error);
        if (!cancelled) {
          setDocError("Unable to render the PDF. Please download the attachment to view it.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDoc(false);
        }
      }
    };

    setPdfPages([]);
    if (isPdfAttachment) {
      renderPdf();
    } else {
      renderDocx();
    }

    return () => {
      cancelled = true;
    };
  }, [attachment.url, isPdfAttachment]);

  const handleUploadSignature = (event: ChangeEvent<HTMLInputElement>) => {
    // Always allow signature operations

    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      addSignature(reader.result as string, file.name);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUseStoredSignature = async () => {
    // Always allow signature operations

    const stored = currentUser?.signature?.imageData;
    if (!stored) {
      toast.error("No stored signature found. Please upload one.");
      return;
    }
    setIsProcessingStoredSignature(true);
    try {
      const normalized =
        stored.startsWith("data:image") ? stored : `data:image/png;base64,${stored}`;
      const transparentSignature = await makeWhiteTransparent(normalized);
      addSignature(transparentSignature, "Stored Signature");
      toast.success("Stored signature added with transparent background.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to process stored signature. Using original instead.");
      addSignature(
        stored.startsWith("data:image") ? stored : `data:image/png;base64,${stored}`,
        "Stored Signature"
      );
    } finally {
      setIsProcessingStoredSignature(false);
    }
  };

  const handleRemoveSignature = () => {
    // Always allow removing signatures
    if (!hasSignatures) {
      return;
    }

    isDraggingRef.current = false;
    dragStateRef.current = { id: null, offsetX: 0, offsetY: 0, width: 0, height: 0 };

    if (!activeSignatureId) {
      setSignatures([]);
      setActiveSignatureId(null);
      return;
    }

    setSignatures((prev) => {
      const next = prev.filter((sig) => sig.id !== activeSignatureId);
      setActiveSignatureId(next.length ? next[next.length - 1].id : null);
      return next;
    });
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current || !wrapperRef.current) {
        return;
      }

      const { id, offsetX, offsetY, width, height } = dragStateRef.current;
      if (!id) return;

      event.preventDefault();

      const containerRect = wrapperRef.current.getBoundingClientRect();
      const newX = event.clientX - containerRect.left - offsetX;
      const newY = event.clientY - containerRect.top - offsetY;

      const maxX = Math.max(0, containerRect.width - width);
      const maxY = Math.max(0, containerRect.height - height);

      const clampedX = Math.min(Math.max(0, newX), maxX);
      const clampedY = Math.min(Math.max(0, newY), maxY);

      setSignatures((prev) =>
        prev.map((signature) =>
          signature.id === id
            ? {
                ...signature,
                position: {
                  x: clampedX,
                  y: clampedY,
                },
              }
            : signature
        )
      );
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      dragStateRef.current = { id: null, offsetX: 0, offsetY: 0, width: 0, height: 0 };
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const handleSignaturePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    signatureId: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    dragStateRef.current = {
      id: signatureId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    isDraggingRef.current = true;
    setActiveSignatureId(signatureId);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(attachment.url);
      setWasCopied(true);
      setTimeout(() => setWasCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSavePdf = async () => {
    if (!wrapperRef.current || typeof window === "undefined") return;

    // Always allow saving PDF with signatures, even if document is already a PDF
    if (!hasSignatures) {
      toast.error("Attach at least one signature before saving to PDF.");
      return;
    }

    const measuredSignatureRects = measureSignatureRects(wrapperRef.current);

    toast.promise(
      (async () => {
        const dom = typeof window !== "undefined" ? globalThis.document : null;
        if (!dom || !wrapperRef.current) {
          throw new Error("Document environment is not available.");
        }

        const targetElement = wrapperRef.current;

        // Verify the element is in the DOM
        if (!targetElement.isConnected) {
          throw new Error("Target element is not connected to the DOM.");
        }

        // Temporarily disable inline style tags that contain lab() colors
        const disabledStylesheets: HTMLStyleElement[] = [];
        const styleNodes = Array.from(dom.querySelectorAll<HTMLStyleElement>("style"));

        for (const node of styleNodes) {
          try {
            const cssText = node.textContent ?? "";
            if (containsLabColor(cssText)) {
              node.disabled = true;
              disabledStylesheets.push(node);
            }
          } catch (error) {
            console.warn("Error checking stylesheet:", error);
          }
        }

        try {
          // Wait a bit for styles to update
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Sanitize inline styles in the target element
          sanitizeLabColors(targetElement);

          const canvas = await html2canvas(targetElement, {
            scale: HTML2CANVAS_SCALE,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: targetElement.scrollWidth || 1200,
            windowHeight: targetElement.scrollHeight || 1600,
            logging: false,
            allowTaint: false,
            onclone: (clonedDoc, element) => {
              try {
                if (element instanceof HTMLElement && clonedDoc.defaultView) {
                  // Sanitize computed styles in the cloned document
                  sanitizeComputedStyles(element, clonedDoc);

                  // Remove any remaining style attributes with lab() colors
                  const allElements = element.querySelectorAll("*");
                  allElements.forEach((el) => {
                    if (el instanceof HTMLElement) {
                      const styleAttr = el.getAttribute("style");
                      if (styleAttr && containsLabColor(styleAttr)) {
                        el.setAttribute("style", sanitizeLabColorUsage(styleAttr));
                      }
                    }
                  });
                }
              } catch (cloneError) {
                console.warn("Error in onclone callback:", cloneError);
              }
            },
          });

          if (signatures.length) {
            const context = canvas.getContext("2d");
            if (context) {
              for (const signature of signatures) {
                const rect = measuredSignatureRects[signature.id];
                if (!rect) continue;
                try {
                  const imageElement = await loadImageElement(signature.src);
                  context.save();
                  context.globalAlpha = signature.opacity;
                  context.drawImage(
                    imageElement,
                    rect.x * HTML2CANVAS_SCALE,
                    rect.y * HTML2CANVAS_SCALE,
                    rect.width * HTML2CANVAS_SCALE,
                    rect.height * HTML2CANVAS_SCALE
                  );
                  context.restore();
                } catch (error) {
                  console.warn("Unable to flatten signature layer", error);
                }
              }
            }
          }

          // Validate canvas dimensions
          if (canvas.width === 0 || canvas.height === 0) {
            throw new Error("Canvas has invalid dimensions");
          }

          // Check if canvas is too large (jsPDF has limits)
          // Use a let variable so we can reassign if scaling is needed
          let workingCanvas: HTMLCanvasElement = canvas;
          const MAX_DIMENSION = 14400; // jsPDF maximum dimension
          if (canvas.width > MAX_DIMENSION || canvas.height > MAX_DIMENSION) {
            // Scale down if too large
            const scale = Math.min(MAX_DIMENSION / canvas.width, MAX_DIMENSION / canvas.height);
            const scaledCanvas = dom.createElement("canvas");
            scaledCanvas.width = Math.floor(canvas.width * scale);
            scaledCanvas.height = Math.floor(canvas.height * scale);
            const scaledContext = scaledCanvas.getContext("2d");
            if (scaledContext) {
              scaledContext.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
              workingCanvas = scaledCanvas;
            }
          }

          // Convert canvas to data URL with error handling
          let imgData: string;

          // Try toDataURL first
          try {
            imgData = workingCanvas.toDataURL("image/png", 0.95);
            // Validate data URL - check it's not empty and has proper format
            if (!imgData || imgData.length < 100 || !imgData.startsWith("data:image/png;base64,")) {
              throw new Error("Invalid data URL format");
            }
            // Validate base64 data exists
            const base64Data = imgData.split(",")[1];
            if (!base64Data || base64Data.length < 50) {
              throw new Error("Invalid base64 data");
            }
          } catch (dataUrlError) {
            console.error("toDataURL failed, trying toBlob:", dataUrlError);
            // Fallback: try converting to blob first, then to data URL
            try {
              const blob = await new Promise<Blob>((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error("Blob conversion timeout"));
                }, 10000);

                workingCanvas.toBlob(
                  (blob) => {
                    clearTimeout(timeout);
                    if (!blob || blob.size === 0) {
                      reject(new Error("Failed to convert canvas to blob or blob is empty"));
                      return;
                    }
                    resolve(blob);
                  },
                  "image/png",
                  0.95
                );
              });

              const reader = new FileReader();
              imgData = await new Promise<string>((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error("FileReader timeout"));
                }, 10000);

                reader.onload = () => {
                  clearTimeout(timeout);
                  const result = reader.result;
                  if (typeof result === "string" && result.length > 100 && result.startsWith("data:image/png;base64,")) {
                    resolve(result);
                  } else {
                    reject(new Error("Failed to read blob as valid data URL"));
                  }
                };
                reader.onerror = () => {
                  clearTimeout(timeout);
                  reject(new Error("Failed to read blob"));
                };
                reader.readAsDataURL(blob);
              });
            } catch (blobError) {
              console.error("Both toDataURL and toBlob failed:", blobError);
              throw new Error(`Failed to export canvas: ${blobError instanceof Error ? blobError.message : "Unknown error"}. The canvas may be tainted due to CORS restrictions.`);
            }
          }

          const pdf = new jsPDF({
            orientation: workingCanvas.width > workingCanvas.height ? "l" : "p",
            unit: "px",
            format: [workingCanvas.width, workingCanvas.height],
          });

          // Add image with error handling
          try {
            pdf.addImage(imgData, "PNG", 0, 0, workingCanvas.width, workingCanvas.height);
          } catch (addImageError) {
            // If addImage fails, try using the image data directly
            console.warn("Direct addImage failed, trying alternative approach:", addImageError);
            // Create an image element and load it first
            const img = await loadImageElement(imgData);
            pdf.addImage(img, "PNG", 0, 0, workingCanvas.width, workingCanvas.height);
          }

          const pdfBlob = pdf.output("blob");
          const pdfFile = new File([pdfBlob], `${document.referenceId}.pdf`, {
            type: "application/pdf",
          });

          const { url } = await upload(pdfFile);
          const updated = await replaceDocumentAttachment(document.id, url);

          setAttachment({
            url: updated.attachment,
            name: updated.attachmentName ?? `${document.referenceId}.pdf`,
          });
          setSignatures([]);
          setActiveSignatureId(null);

          router.push("/president/designate-document");
          router.refresh();
          return url;
        } catch (error) {
          console.error("Failed to generate PDF:", error);

          // Log detailed error information
          if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);

            // Check if it's a CSS parsing error
            if (error.message.includes("lab") || error.message.includes("CSS") || error.message.includes("EOF")) {
              console.error("CSS parsing error detected. Attempting to identify problematic styles...");

              // Try to find remaining lab() colors
              try {
                const allStyles = dom.querySelectorAll("style");
                allStyles.forEach((style, index) => {
                  if (style.textContent && containsLabColor(style.textContent)) {
                    console.error(`Found lab() color in style element ${index}:`, style.textContent.substring(0, 200));
                  }
                });

                if (targetElement) {
                  const allElements = targetElement.querySelectorAll("*");
                  allElements.forEach((el) => {
                    if (el instanceof HTMLElement) {
                      const styleAttr = el.getAttribute("style");
                      if (styleAttr && containsLabColor(styleAttr)) {
                        console.error("Found lab() color in inline style:", el.tagName, styleAttr);
                      }
                    }
                  });
                }
              } catch (debugError) {
                console.error("Error during debug logging:", debugError);
              }
            }
          }

          throw error instanceof Error ? error : new Error("Unknown export error");
        } finally {
          // Restore all disabled stylesheets
          disabledStylesheets.forEach((stylesheet) => {
            if (stylesheet instanceof HTMLLinkElement && (stylesheet as any).__originalDisabled !== undefined) {
              stylesheet.disabled = (stylesheet as any).__originalDisabled;
              delete (stylesheet as any).__originalDisabled;
            } else {
              stylesheet.disabled = false;
            }
          });
        }
      })(),
      {
        loading: "Rendering & uploading signed PDF...",
        success: "Signed PDF uploaded and document updated",
        error: (err) =>
          err instanceof Error
            ? `Failed to generate PDF: ${err.message}`
            : "Failed to generate PDF",
      }
    );
  };

  const signatureNodes = signatures.map((signature) => (
    <div
      key={signature.id}
      data-signature-id={signature.id}
      onPointerDown={(event) => handleSignaturePointerDown(event, signature.id)}
      className="select-none pointer-events-auto absolute"
      style={{
        left: signature.position.x,
        top: signature.position.y,
        transform: `scale(${signature.scale})`,
        opacity: signature.opacity,
        cursor: "grab",
        touchAction: "none",
      }}
    >
      <img
        src={signature.src}
        alt={signature.label}
        width={200}
        height={100}
        className="object-contain"
        draggable={false}
      />
    </div>
  ));

  return (
    <div className="space-y-6">
      <style jsx global>{docxStyles}</style>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Document Viewer</CardTitle>
          <CardDescription>
            Reference ID: {document.referenceId}
          </CardDescription>
          <div className="flex flex-wrap gap-2">
            <Badge>{document.category}</Badge>
            <Badge variant="outline">{document.priority}</Badge>
            <Badge
              variant="outline"
              className={
                document.status === "Approved"
                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                  : document.status === "Rejected"
                  ? "bg-red-50 text-red-600 border-red-100"
                  : "bg-amber-50 text-amber-600 border-amber-100"
              }
            >
              {document.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">File Date</p>
              <p className="font-medium">
                {format(new Date(document.fileDate), "PPpp")}
              </p>
            </div>
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground">Submitted By</p>
              <p className="font-medium">{document.submittedBy.name}</p>
            </div>
          </div>

          {document.remarks && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Remarks</p>
                <p className="whitespace-pre-line text-sm">
                  {document.remarks}
                </p>
              </div>
            </>
          )}

          {document.assignatories.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Assignatories
                </p>
                <div className="flex flex-wrap gap-2">
                  {document.assignatories.map((assignatory) => (
                    <Badge key={assignatory.id} variant="secondary">
                      {assignatory.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={!canEditDocument}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Signature
              </Button>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={!canEditDocument}
                onChange={handleUploadSignature}
              />
              <Button
                variant="outline"
                onClick={handleUseStoredSignature}
                disabled={!canEditDocument || isProcessingStoredSignature}
              >
                {isProcessingStoredSignature ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Use Stored Signature"
                )}
              </Button>
              {hasSignatures && (
                <Button variant="ghost" onClick={handleRemoveSignature}>
                  Remove Active Signature
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" onClick={handleCopyLink}>
                  {wasCopied ? (
                    <Check className="h-4 w-4 mr-2 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Copy Attachment Link
                </Button>
                <Button onClick={handleSavePdf} disabled={!canSavePdf}>
                  <Save className="h-4 w-4 mr-2" />
                  Save PDF with Signature
                </Button>
              </div>
            </div>
            {isPdfAttachment && (
              <p className="text-sm text-muted-foreground">
                This attachment is a PDF. You can add your signature and save to generate an updated version.
              </p>
            )}
            {canEditDocument && hasSignatures && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Active Signature
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {signatures.map((signature) => (
                      <Button
                        key={signature.id}
                        size="sm"
                        variant={
                          signature.id === activeSignatureId ? "default" : "secondary"
                        }
                        onClick={() => setActiveSignatureId(signature.id)}
                      >
                        {signature.label}
                      </Button>
                    ))}
                  </div>
                </div>
                {activeSignature && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Signature Size</Label>
                      <Input
                        type="range"
                        min={0.5}
                        max={2}
                        step={0.1}
                        value={activeSignature.scale}
                        onChange={(e) => {
                          const nextScale = Number(e.target.value);
                          setSignatures((prev) =>
                            prev.map((signature) =>
                              signature.id === activeSignature.id
                                ? { ...signature, scale: nextScale }
                                : signature
                            )
                          );
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Signature Opacity</Label>
                      <Input
                        type="range"
                        min={0.3}
                        max={1}
                        step={0.1}
                        value={activeSignature.opacity}
                        onChange={(e) => {
                          const nextOpacity = Number(e.target.value);
                          setSignatures((prev) =>
                            prev.map((signature) =>
                              signature.id === activeSignature.id
                                ? { ...signature, opacity: nextOpacity }
                                : signature
                            )
                          );
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Document Preview</CardTitle>
          <CardDescription>
            Drag your e-signature onto the document. Use the controls above to
            adjust size and opacity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={wrapperRef}
            className="border rounded-lg overflow-hidden bg-white relative"
          >
            {isPdfAttachment ? (
              <>
                {isLoadingDoc && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                {docError && (
                  <div className="p-4 text-sm text-red-600">{docError}</div>
                )}
                {!isLoadingDoc && !docError && (
                  <div className="space-y-4 p-4">
                    {pdfPages.map((src, pageIndex) => (
                      <img
                        key={`${document.id}-page-${pageIndex}`}
                        src={src}
                        alt={`PDF page ${pageIndex + 1}`}
                        className="w-full pointer-events-none select-none"
                        draggable={false}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {isLoadingDoc && (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                {docError && (
                  <div className="p-4 text-sm text-red-600">{docError}</div>
                )}
                <div
                  ref={viewerRef}
                  className="docx-wrapper p-6 bg-white min-h-[600px]"
                />
              </>
            )}
            {canEditDocument && hasSignatures && (
              <div className="absolute inset-0">{signatureNodes}</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

