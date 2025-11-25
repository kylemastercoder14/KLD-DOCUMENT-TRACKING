"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Heading from "@/components/heading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTextIcon, ClockIcon, CheckCircleIcon, AlertTriangleIcon } from "lucide-react";

type DashboardAnalyticsResponse = {
  summary: {
    totalSubmitted: number;
    pending: number;
    approved: number;
    rejected: number;
    highPriority: number;
    actionRequired: number;
  };
  recentDocuments: Array<{
    id: string;
    title: string;
    referenceId: string;
    status: "Pending" | "Approved" | "Rejected";
    submittedAt: string;
    category: string;
    owner?: string;
  }>;
  pendingDocuments: Array<{
    id: string;
    title: string;
    referenceId: string;
    submittedAt: string;
    category: string;
    priority: "Low" | "Medium" | "High";
    owner?: string;
  }>;
  monthlyActivity: Array<{ label: string; count: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  teamPerformance: Array<{
    id: string;
    name: string;
    role: string;
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }>;
};

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700 border-none";
    case "Pending":
      return "bg-amber-100 text-amber-700 border-none";
    case "Rejected":
      return "bg-red-100 text-red-700 border-none";
    default:
      return "bg-muted border-none";
  }
};

export const VpadaDashboardClient = () => {
  const router = useRouter();
  const [data, setData] = useState<DashboardAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/vpaa-dashboard");
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error || "Failed to load dashboard analytics.");
        }
        const payload: DashboardAnalyticsResponse = await response.json();
        setData(payload);
      } catch (fetchError) {
        console.error(fetchError);
        setError(
          fetchError instanceof Error ? fetchError.message : "Failed to load dashboard analytics."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const summaryCards = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Total Submissions",
        value: data.summary.totalSubmitted,
        icon: FileTextIcon,
        accent: "text-blue-600",
      },
      {
        label: "Pending Approvals",
        value: data.summary.pending,
        icon: ClockIcon,
        accent: "text-amber-600",
      },
      {
        label: "Approved Documents",
        value: data.summary.approved,
        icon: CheckCircleIcon,
        accent: "text-emerald-600",
      },
      {
        label: "High Priority",
        value: data.summary.highPriority,
        icon: AlertTriangleIcon,
        accent: "text-red-600",
      },
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Heading title="VPADA Dashboard" description="Loading analytics..." />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Heading title="VPADA Dashboard" description="Analytics overview." />
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Heading
        title="VPADA Dashboard"
        description="Comprehensive overview of all documents across the institution."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((stat) => (
          <Card key={stat.label} className="bg-card/70 border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-xs font-medium uppercase text-muted-foreground">
                {stat.label}
              </CardDescription>
              <stat.icon className={`${stat.accent} h-5 w-5`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Documents</CardTitle>
            <CardDescription>Recent submissions across all departments.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/vpada/designate-document")}
          >
            View All
          </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent documents.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Document</th>
                      <th className="px-4 py-3">Owner</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentDocuments.map((doc) => (
                      <tr key={doc.id} className="border-t">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{doc.title}</div>
                          <div className="text-xs text-muted-foreground">{doc.referenceId}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {doc.owner ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(doc.submittedAt), "PP")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={statusBadgeVariant(doc.status)}>
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{doc.category}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              router.push(`/vpada/designate-document/view/${doc.id}`)
                            }
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Top document categories across all departments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.categoryBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No category data available.</p>
            ) : (
              data.categoryBreakdown.map((item) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{item.category}</p>
                    <p className="text-xs text-muted-foreground">Documents</p>
                  </div>
                  <Badge variant="secondary">{item.count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Activity</CardTitle>
            <CardDescription>Documents submitted in the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.monthlyActivity.map((entry) => (
              <div key={entry.label}>
                <div className="flex items-center justify-between text-sm">
                  <span>{entry.label}</span>
                  <span className="text-muted-foreground">{entry.count}</span>
                </div>
                <Progress
                  value={
                    data.summary.totalSubmitted
                      ? (entry.count /
                          Math.max(1, Math.max(...data.monthlyActivity.map((m) => m.count)))) *
                        100
                      : 0
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Action Required</CardTitle>
              <CardDescription>Pending documents waiting on your decision.</CardDescription>
            </div>
            <Badge variant="outline">{data.summary.actionRequired}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.pendingDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending documents. Great job!</p>
            ) : (
              data.pendingDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.referenceId} • {doc.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {format(new Date(doc.submittedAt), "PP")}
                    </p>
                    {doc.owner && (
                      <p className="text-xs text-muted-foreground">Owner: {doc.owner}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge variant="secondary">{doc.priority}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/vpada/designate-document/view/${doc.id}`)}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Performance</CardTitle>
          <CardDescription>Submission volume across all users and departments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.teamPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No document activity recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                  <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2 text-center text-amber-600">Pending</th>
                    <th className="px-3 py-2 text-center text-emerald-600">Approved</th>
                    <th className="px-3 py-2 text-center text-red-600">Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teamPerformance.map((member) => (
                    <tr key={member.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-semibold">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.role}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-medium">{member.total}</td>
                      <td className="px-3 py-2 text-center text-amber-600">{member.pending}</td>
                      <td className="px-3 py-2 text-center text-emerald-600">{member.approved}</td>
                      <td className="px-3 py-2 text-center text-red-600">{member.rejected}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

