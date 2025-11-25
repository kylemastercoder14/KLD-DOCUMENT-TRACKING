"use client";

import Heading from "@/components/heading";
import { ZoomableCanvas } from "./zoomable-canvas";

export const Client = () => {
  // You can replace this with an actual organization chart image URL
  const orgChartImageUrl = "/org-chart.jpg"; // Placeholder - replace with actual image

  return (
    <div className="space-y-5">
      <Heading
        title="Organization Chart"
        description="View the organizational structure. Use mouse wheel to zoom, click and drag to pan."
      />

      <div className="border rounded-lg overflow-hidden bg-muted/30">
        <ZoomableCanvas imageUrl={orgChartImageUrl} />
      </div>
    </div>
  );
};

