"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheetIcon, PrinterIcon } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import Heading from "@/components/heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatCard = {
  label: string;
  value: number;
  change: string;
  icon: string;
};

type QuickStat = {
  label: string;
  value: number;
  description: string;
};

type WorkflowSnapshot = {
  documentTitle: string;
  referenceId: string;
  stages: Array<{ label: string; owner: string; status: string }>;
} | null;

type DistributionEntry = {
  label: string;
  count: number;
};

type MonthlyTrendEntry = {
  label: string;
  submitted: number;
  approved: number;
};

type RoleActivityEntry = {
  role: string;
  count: number;
};

type DepartmentLeaderEntry = {
  name: string;
  count: number;
};

type AdminDashboardResponse = {
  statCards: StatCard[];
  dashboardQuickStats: QuickStat[];
  workflowSnapshot: WorkflowSnapshot;
  statusDistribution: DistributionEntry[];
  priorityBreakdown: DistributionEntry[];
  monthlyTrend: MonthlyTrendEntry[];
  roleActivity: RoleActivityEntry[];
  departmentLeaders: DepartmentLeaderEntry[];
};

const numberFormatter = new Intl.NumberFormat("en-US");

const priorityAccentMap: Record<string, string> = {
  High: "text-red-600",
  Medium: "text-amber-600",
  Low: "text-emerald-600",
};

const roleLabelMap: Record<string, string> = {
  SYSTEM_ADMIN: "System Admin",
  PRESIDENT: "President",
  VPAA: "VPAA",
  VPADA: "VPADA",
  DEAN: "Dean",
  HR: "HR",
  INSTRUCTOR: "Instructor",
};

const priorityBarClass = (label: string) => {
  if (label === "High") return "bg-red-100";
  if (label === "Medium") return "bg-amber-100";
  return "bg-emerald-100";
};

const pieColors = ["#0ea5e9", "#f97316", "#10b981", "#a855f7", "#f43f5e"];

export const Client = () => {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin-dashboard");
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Failed to load dashboard analytics.");
        }
        const payload: AdminDashboardResponse = await response.json();
        setData(payload);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard analytics.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const totalStatus = useMemo(
    () => (data ? data.statusDistribution.reduce((sum, entry) => sum + entry.count, 0) : 0),
    [data]
  );

  const totalPriority = useMemo(
    () => (data ? data.priorityBreakdown.reduce((sum, entry) => sum + entry.count, 0) : 0),
    [data]
  );

  const maxMonthlyValue = useMemo(() => {
    if (!data || data.monthlyTrend.length === 0) return 0;
    return Math.max(...data.monthlyTrend.map((entry) => entry.submitted));
  }, [data]);

  const maxRoleActivity = useMemo(() => {
    if (!data || data.roleActivity.length === 0) return 0;
    return Math.max(...data.roleActivity.map((entry) => entry.count));
  }, [data]);

  const statusPieData = useMemo(
    () =>
      data?.statusDistribution.map((entry) => ({
        name: entry.label,
        value: entry.count,
      })) ?? [],
    [data]
  );

  const statusNarrative = useMemo(() => {
    if (!data || statusPieData.length === 0) {
      return [];
    }
    const total = statusPieData.reduce((sum, entry) => sum + entry.value, 0);
    return statusPieData.map((entry) => ({
      name: entry.name,
      percentage: total ? Math.round((entry.value / total) * 100) : 0,
      count: entry.value,
    }));
  }, [data, statusPieData]);

  const handlePrintReport = () => {
    if (!data || typeof window === "undefined") {
      return;
    }

    const buildTable = (title: string, headers: string[], rows: Array<(string | number)[]>) => {
      if (rows.length === 0) {
        return "";
      }
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

    const summaryTable = buildTable(
      "Summary Metrics",
      ["Metric", "Value", "Change"],
      data.statCards.map((card) => [card.label, numberFormatter.format(card.value), card.change])
    );

    const monthlyTable = buildTable(
      "Monthly Volume (Last 6 Months)",
      ["Month", "Submitted", "Approved"],
      data.monthlyTrend.map((entry) => [
        entry.label,
        entry.submitted,
        entry.approved,
      ])
    );

    const statusTable = buildTable(
      "Workflow Composition",
      ["Status", "Count"],
      data.statusDistribution.map((entry) => [entry.label, entry.count])
    );

    const priorityTable = buildTable(
      "Priority Mix",
      ["Priority", "Count"],
      data.priorityBreakdown.map((entry) => [entry.label, entry.count])
    );

    const roleTable = buildTable(
      "Role Activity",
      ["Role", "Documents Submitted"],
      data.roleActivity.map((entry) => [roleLabelMap[entry.role] ?? entry.role, entry.count])
    );

    const deptTable = buildTable(
      "Department Leaders",
      ["Department", "Documents Submitted"],
      data.departmentLeaders.map((entry) => [entry.name, entry.count])
    );

    const overviewTable = buildTable(
      "System Overview",
      ["Metric", "Value", "Description"],
      data.dashboardQuickStats.map((stat) => [
        stat.label,
        stat.value,
        stat.description,
      ])
    );

    const workflowSection = data.workflowSnapshot
      ? buildTable(
          `Workflow Snapshot • ${data.workflowSnapshot.documentTitle}`,
          ["Stage", "Owner", "Status"],
          data.workflowSnapshot.stages.map((stage) => [stage.label, stage.owner, stage.status])
        )
      : "";

    const printableContent = `
      <html>
        <head>
          <title>Admin Dashboard Report</title>
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
          <h1>Admin Dashboard Report</h1>
          <div class="meta">
            Generated on ${new Date().toLocaleString()}
          </div>
          ${summaryTable}
          ${monthlyTable}
          ${statusTable}
          ${priorityTable}
          ${roleTable}
          ${deptTable}
          ${overviewTable}
          ${workflowSection}
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) {
      return;
    }
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

      const appendSheet = (sheetName: string, rows: object[]) => {
        if (!rows.length) return;
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      };

      appendSheet(
        "Summary",
        data.statCards.map((card) => ({
          Metric: card.label,
          Value: card.value,
          Change: card.change,
        }))
      );

      appendSheet(
        "Monthly Volume",
        data.monthlyTrend.map((entry) => ({
          Month: entry.label,
          Submitted: entry.submitted,
          Approved: entry.approved,
        }))
      );

      appendSheet(
        "Status Distribution",
        data.statusDistribution.map((entry) => ({
          Status: entry.label,
          Count: entry.count,
        }))
      );

      appendSheet(
        "Priority Mix",
        data.priorityBreakdown.map((entry) => ({
          Priority: entry.label,
          Count: entry.count,
        }))
      );

      appendSheet(
        "Role Activity",
        data.roleActivity.map((entry) => ({
          Role: roleLabelMap[entry.role] ?? entry.role,
          Count: entry.count,
        }))
      );

      appendSheet(
        "Department Leaders",
        data.departmentLeaders.map((entry) => ({
          Department: entry.name,
          Count: entry.count,
        }))
      );

      appendSheet(
        "System Overview",
        data.dashboardQuickStats.map((stat) => ({
          Metric: stat.label,
          Value: stat.value,
          Description: stat.description,
        }))
      );

      if (data.workflowSnapshot) {
        appendSheet(
          "Workflow Snapshot",
          data.workflowSnapshot.stages.map((stage) => ({
            Stage: stage.label,
            Owner: stage.owner,
            Status: stage.status,
          }))
        );
      }

      XLSX.writeFile(wb, `admin-dashboard-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (excelError) {
      console.error(excelError);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Heading title="Dashboard" description="Loading analytics..." />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Heading title="Dashboard" description="Welcome back, here's what's happening today." />
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error || "Failed to load analytics."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading title="Dashboard" description="Welcome back, here's what's happening today." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handlePrintReport} disabled={!data}>
            <PrinterIcon className="h-4 w-4" />
            Print Report
          </Button>
          <Button className="gap-2" onClick={handleExportExcel} disabled={!data || isExporting}>
            <FileSpreadsheetIcon className="h-4 w-4" />
            {isExporting ? "Exporting…" : "Export Excel"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.statCards.map((stat) => (
          <Card key={stat.label} className="border bg-card/70 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardDescription>
              <span className="text-lg">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif">{numberFormatter.format(stat.value)}</div>
              <p
                className={cn(
                  "text-sm mt-2",
                  stat.label === "Critical Attention" ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Volume</CardTitle>
              <CardDescription>Documents submitted vs approved (last 6 months).</CardDescription>
            </div>
            <Badge variant="outline">
              {numberFormatter.format(
                data.monthlyTrend.reduce((sum, entry) => sum + entry.submitted, 0)
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.monthlyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">No monthly data available.</p>
            ) : (
              data.monthlyTrend.map((entry) => (
                <div key={entry.label}>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{entry.label}</span>
                    <span className="text-muted-foreground">
                      {entry.approved}/{entry.submitted} approved
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <Progress
                      value={
                        maxMonthlyValue
                          ? Math.min(100, (entry.submitted / maxMonthlyValue) * 100)
                          : 0
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Submitted: {numberFormatter.format(entry.submitted)}</span>
                      <span>Approved: {numberFormatter.format(entry.approved)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Composition</CardTitle>
            <CardDescription>Visual slice of current document statuses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[360px] flex flex-col gap-4">
            {statusPieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents available to render the chart.
              </p>
            ) : (
              <>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        contentStyle={{ fontSize: "0.875rem" }}
                        formatter={(value: number, name) => [
                          `${numberFormatter.format(value)} documents`,
                          name,
                        ]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        iconType="circle"
                        formatter={(value) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                      <Pie
                        data={statusPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                        label={({ name, percent }) =>
                          `${name}: ${Math.round(percent * 100)}%`
                        }
                        labelLine={false}
                      >
                        {statusPieData.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={pieColors[index % pieColors.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-sm mt-5 text-muted-foreground text-center">
                  <p>
                    Each slice represents the proportion of records currently sitting in that workflow
                    state. Track bottlenecks or unusual spikes at a glance.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {statusNarrative.map((item) => (
                      <div key={item.name} className="rounded-full border px-3 py-1 bg-muted/40">
                        <span className="font-medium text-foreground">{item.percentage}%</span>{" "}
                        {item.name} ({numberFormatter.format(item.count)})
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Status Distribution</CardTitle>
              <CardDescription>Overall workflow state of all documents.</CardDescription>
            </div>
            <Badge variant="secondary">{numberFormatter.format(totalStatus)}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.statusDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents available.</p>
            ) : (
              data.statusDistribution.map((entry) => {
                const percentage = totalStatus ? Math.round((entry.count / totalStatus) * 100) : 0;
                return (
                  <div key={entry.label}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{entry.label}</span>
                      <span>{percentage}%</span>
                    </div>
                    <Progress value={percentage} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {numberFormatter.format(entry.count)} documents
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Priority Mix</CardTitle>
              <CardDescription>Relative volume by urgency.</CardDescription>
            </div>
            <Badge variant="secondary">{numberFormatter.format(totalPriority)}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.priorityBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No priority data recorded.</p>
            ) : (
              data.priorityBreakdown.map((entry) => {
                const percentage = totalPriority
                  ? Math.round((entry.count / totalPriority) * 100)
                  : 0;
                return (
                  <div key={entry.label}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className={priorityAccentMap[entry.label] ?? "text-foreground"}>
                        {entry.label}
                      </span>
                      <span>{percentage}%</span>
                    </div>
                    <Progress value={percentage} className={priorityBarClass(entry.label)} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {numberFormatter.format(entry.count)} documents
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Role Activity</CardTitle>
              <CardDescription>Document submissions per role.</CardDescription>
            </div>
            <Badge variant="secondary">
              {numberFormatter.format(maxRoleActivity)}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.roleActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submission activity recorded.</p>
            ) : (
              data.roleActivity.map((entry) => {
                const percentage = maxRoleActivity
                  ? Math.round((entry.count / maxRoleActivity) * 100)
                  : 0;
                return (
                  <div key={entry.role}>
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span>{roleLabelMap[entry.role] ?? entry.role}</span>
                      <span>{numberFormatter.format(entry.count)}</span>
                    </div>
                    <Progress value={percentage} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Leaders</CardTitle>
            <CardDescription>Top-performing designations this quarter.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.departmentLeaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departmental activity yet.</p>
            ) : (
              data.departmentLeaders.slice(0, 6).map((dept) => (
                <div
                  key={dept.name}
                  className="flex items-center justify-between rounded-xl border bg-muted/40 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{dept.name}</p>
                    <p className="text-xs text-muted-foreground">Documents submitted</p>
                  </div>
                  <Badge variant="outline">{numberFormatter.format(dept.count)}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workflow Snapshot</CardTitle>
            <CardDescription>
              {data.workflowSnapshot
                ? `High level view of routing steps for ${data.workflowSnapshot.documentTitle}`
                : "No workflow data to display yet."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.workflowSnapshot ? (
              data.workflowSnapshot.stages.map((step) => (
                <div
                  key={step.label}
                  className="flex items-center justify-between rounded-xl border bg-muted/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.owner}</p>
                  </div>
                  <Badge variant="outline">{step.status}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Submit a document to see its workflow progress here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Overview</CardTitle>
          <CardDescription>Environment metrics for administrators</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {data.dashboardQuickStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">No system statistics available.</p>
          ) : (
            data.dashboardQuickStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-muted/40 px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-serif">{numberFormatter.format(stat.value)}</p>
                </div>
                <p className="max-w-[200px] text-sm text-muted-foreground text-right">
                  {stat.description}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

