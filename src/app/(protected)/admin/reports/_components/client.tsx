"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Printer, DownloadIcon } from "lucide-react";

import Heading from "@/components/heading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type AdminReportsResponse = {
  summary: {
    totalProcessed: number;
    avgTurnaroundHours: number;
    pending: number;
    processedChangePct: number;
  };
  documentVolume: Array<{ month: string; received: number; processed: number }>;
  statusDistribution: Array<{ name: string; value: number }>;
  departmentPerformance: Array<{
    name: string;
    completionRate: number;
    totalDocuments: number;
    pendingDocuments: number;
  }>;
  bottlenecks: Array<{
    stage: string;
    stageLabel: string;
    avgTimeHours: number;
    delayedDocuments: number;
  }>;
};

const STATUS_COLORS = ["#22c55e", "#f97316", "#2563eb", "#ef4444", "#a855f7"];

export const Client = () => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState<AdminReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin-reports?year=${year}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Failed to load reports data.");
        }
        const payload: AdminReportsResponse = await response.json();
        setData(payload);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load reports.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [year]);

  const pieData = useMemo(() => {
    if (!data) return [];
    return data.statusDistribution.map((entry, index) => ({
      ...entry,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    }));
  }, [data]);

  const scatterData = useMemo(() => {
    if (!data) return [];
    return data.bottlenecks.map((entry) => ({
      dept: entry.stageLabel,
      avgTime: entry.avgTimeHours,
      delayed: entry.delayedDocuments,
    }));
  }, [data]);

  const topBottlenecks = useMemo(() => {
    if (!data) return [];
    return data.bottlenecks.slice(0, 2);
  }, [data]);

  const summaryCards = useMemo(() => {
    if (!data) {
      return [
        { label: "Total Documents Processed", value: "—", subtext: "", subtextClass: undefined },
        { label: "Average Turnaround Time", value: "—", subtext: "", subtextClass: undefined },
        { label: "Pending Approval", value: "—", subtext: "", subtextClass: undefined },
      ];
    }

    const processedChange =
      data.summary.processedChangePct > 0
        ? `+${data.summary.processedChangePct}% from last month`
        : `${data.summary.processedChangePct}% from last month`;

    return [
      {
        label: "Total Documents Processed",
        value: data.summary.totalProcessed.toLocaleString(),
        subtext: processedChange,
        subtextClass: data.summary.processedChangePct >= 0 ? "text-emerald-600" : "text-destructive",
      },
      {
        label: "Average Turnaround Time",
        value: `${(data.summary.avgTurnaroundHours / 24).toFixed(1)} days`,
        subtext: "Rolling average based on completed documents",
        subtextClass: "text-emerald-600",
      },
      {
        label: "Pending Approval",
        value: data.summary.pending.toLocaleString(),
        subtext: data.summary.pending > 0 ? "Requires attention" : "All caught up",
        subtextClass: data.summary.pending > 0 ? "text-destructive" : "text-muted-foreground",
      },
    ];
  }, [data]);

  const handlePrintReport = () => {
    if (!data || typeof window === "undefined") return;

    const buildTable = (title: string, headers: string[], rows: Array<(string | number)[]>) => {
      if (!rows.length) return "";
      const headerRow = headers.map((h) => `<th>${h}</th>`).join("");
      const bodyRows = rows
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${String(cell ?? "")}</td>`).join("")}</tr>`
        )
        .join("");
      return `
        <h2>${title}</h2>
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      `;
    };

    const summaryTable = buildTable("Summary", ["Metric", "Value"], [
      ["Total Processed", data.summary.totalProcessed],
      ["Average Turnaround (hours)", data.summary.avgTurnaroundHours.toFixed(2)],
      ["Pending", data.summary.pending],
      ["Processed Change (%)", data.summary.processedChangePct],
    ]);

    const volumeTable = buildTable(
      "Document Volume",
      ["Month", "Received", "Processed"],
      data.documentVolume.map((entry) => [entry.month, entry.received, entry.processed])
    );

    const statusTable = buildTable(
      "Status Distribution",
      ["Status", "Count"],
      data.statusDistribution.map((entry) => [entry.name, entry.value])
    );

    const deptTable = buildTable(
      "Department Performance",
      ["Department", "Completion Rate (%)", "Total Documents", "Pending Documents"],
      data.departmentPerformance.map((entry) => [
        entry.name,
        entry.completionRate,
        entry.totalDocuments,
        entry.pendingDocuments,
      ])
    );

    const bottlenecksTable = buildTable(
      "Bottlenecks",
      ["Stage", "Average Time (hours)", "Delayed Documents"],
      data.bottlenecks.map((entry) => [
        entry.stageLabel,
        entry.avgTimeHours,
        entry.delayedDocuments,
      ])
    );

    const printableContent = `
      <html>
        <head>
          <title>Admin Reports & Analytics</title>
          <style>
            body { font-family: "Segoe UI", sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin-bottom: 8px; }
            h2 { margin-top: 32px; margin-bottom: 12px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
            th, td { border: 1px solid #cbd5f5; padding: 8px; text-align: left; }
            th { background: #e2e8f0; text-transform: uppercase; letter-spacing: 0.04em; font-size: 12px; }
            .meta { font-size: 12px; color: #475569; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <h1>Reports & Analytics</h1>
          <div class="meta">
            Year: ${year} • Generated on ${new Date().toLocaleString()}
          </div>
          ${summaryTable}
          ${volumeTable}
          ${statusTable}
          ${deptTable}
          ${bottlenecksTable}
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return;
    printWindow.document.write(printableContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const appendSheet = (name: string, rows: object[]) => {
        if (!rows.length) return;
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, name);
      };

      appendSheet("Summary", [
        {
          Metric: "Total Processed",
          Value: data.summary.totalProcessed,
        },
        {
          Metric: "Average Turnaround (hours)",
          Value: data.summary.avgTurnaroundHours,
        },
        {
          Metric: "Pending",
          Value: data.summary.pending,
        },
        {
          Metric: "Processed Change (%)",
          Value: data.summary.processedChangePct,
        },
      ]);

      appendSheet(
        "Document Volume",
        data.documentVolume.map((entry) => ({
          Month: entry.month,
          Received: entry.received,
          Processed: entry.processed,
        }))
      );

      appendSheet(
        "Status Distribution",
        data.statusDistribution.map((entry) => ({
          Status: entry.name,
          Count: entry.value,
        }))
      );

      appendSheet(
        "Department Performance",
        data.departmentPerformance.map((entry) => ({
          Department: entry.name,
          "Completion Rate (%)": entry.completionRate,
          "Total Documents": entry.totalDocuments,
          "Pending Documents": entry.pendingDocuments,
        }))
      );

      appendSheet(
        "Bottlenecks",
        data.bottlenecks.map((entry) => ({
          Stage: entry.stageLabel,
          "Average Time (hours)": entry.avgTimeHours,
          "Delayed Documents": entry.delayedDocuments,
        }))
      );

      const fileName = `admin-reports-${year}-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Heading
          title="Reports & Analytics"
          description="System-wide insights, throughput analysis, and bottlenecks."
        />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Heading
          title="Reports & Analytics"
          description="System-wide insights, throughput analysis, and bottlenecks."
        />
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error || "Failed to load reports data."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Heading
        title="Reports & Analytics"
        description="System-wide insights, throughput analysis, and bottlenecks."
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="department">Department Performance</TabsTrigger>
            <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
          </TabsList>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 1, 2].map((offset) => {
                  const optionYear = (new Date().getFullYear() - offset).toString();
                  return (
                    <SelectItem value={optionYear} key={optionYear}>
                      {optionYear}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={handlePrintReport}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={handleExportExcel}
              disabled={isExporting}
            >
              <DownloadIcon className="h-4 w-4" />
              {isExporting ? "Exporting…" : "Export Excel"}
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="rounded-2xl border bg-card/60 p-5">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-4 font-serif text-4xl">{card.value}</p>
                <p className={`text-sm ${card.subtextClass ?? "text-muted-foreground"}`}>
                  {card.subtext}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card/60 p-6">
              <div className="mb-4">
                <h3 className="font-semibold">Document Volume</h3>
                <p className="text-sm text-muted-foreground">
                  Received vs. Processed documents per month
                </p>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.documentVolume}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="received" fill="#cbd5f5" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="processed" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/60 p-6">
              <div className="mb-4">
                <h3 className="font-semibold">Current Status Distribution</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time breakdown of active documents
                </p>
              </div>
              <div className="flex h-[280px] items-center">
                <div className="w-2/3 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {pieData.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-1/3 flex-col gap-2 text-sm">
                  {pieData.map((status) => (
                    <div key={status.name} className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-muted-foreground">{status.name}</span>
                      <span className="font-semibold text-foreground ml-auto">
                        {status.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="department" className="space-y-6">
          <div className="rounded-2xl border bg-card/60 p-6">
            <div className="mb-4">
              <h3 className="font-semibold">Departmental Efficiency</h3>
              <p className="text-sm text-muted-foreground">
                Completion rate vs. total volume
              </p>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.departmentPerformance}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} ticks={[20, 40, 60, 80, 100]} />
                  <YAxis dataKey="name" type="category" />
                  <Tooltip />
                  <Bar dataKey="completionRate" fill="#15803d" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {topBottlenecks.length ? (
              topBottlenecks.map((entry, index) => (
                <div
                  key={entry.stage}
                  className={`rounded-2xl border p-5 ${
                    index === 0 ? "bg-red-50" : "bg-amber-50"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      index === 0 ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {index === 0 ? "Critical Delay Alert" : "Rising Backlog"}
                  </p>
                  <p
                    className={`text-lg ${
                      index === 0 ? "text-red-800" : "text-amber-800"
                    }`}
                  >
                    {entry.stageLabel}
                  </p>
                  <p
                    className={`mt-4 font-serif text-4xl ${
                      index === 0 ? "text-red-600" : "text-amber-600"
                    }`}
                  >
                    {entry.avgTimeHours.toFixed(1)} hrs
                  </p>
                  <p
                    className={`text-sm ${
                      index === 0 ? "text-red-700" : "text-amber-700"
                    }`}
                  >
                    {entry.delayedDocuments} documents delayed beyond SLA.
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border bg-muted/40 p-5 col-span-2 text-sm text-muted-foreground">
                No bottleneck alerts for the selected year.
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card/60 p-6">
            <div className="mb-4">
              <h3 className="font-semibold">Process Stage Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Average processing time (hours) vs. number of delayed documents
              </p>
            </div>
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ left: 20, right: 20, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="avgTime"
                    name="Average Time"
                    unit="h"
                    domain={[0, Math.max(24, ...scatterData.map((item) => item.avgTime)) + 12]}
                  />
                  <YAxis
                    type="number"
                    dataKey="delayed"
                    name="Delayed Documents"
                    unit=" docs"
                    domain={[0, Math.max(10, ...scatterData.map((item) => item.delayed)) + 5]}
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter data={scatterData} fill="#dc2626" name="Process Stages" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

