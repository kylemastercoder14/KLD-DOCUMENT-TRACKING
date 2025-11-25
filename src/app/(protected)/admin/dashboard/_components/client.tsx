"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Heading from "@/components/heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DownloadIcon, PlusCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const statCards = [
  {
    label: "Total Documents",
    value: "1,284",
    change: "+12% from last month",
    icon: "📄",
    className: "bg-card/60",
  },
  {
    label: "Pending Approval",
    value: "42",
    change: "+4 new today",
    icon: "⏳",
    className: "bg-card/60",
  },
  {
    label: "Completed",
    value: "1,104",
    change: "98% completion rate",
    icon: "✅",
    className: "bg-card/60",
  },
  {
    label: "Critical Attention",
    value: "8",
    change: "Requires immediate action",
    icon: "🚨",
    className: "bg-card/60",
  },
] as const;

const recentDocuments = [
  {
    title: "Faculty Leave Request - John Doe",
    id: "DOC-2025-001",
    sender: "John Doe",
    status: "Pending",
  },
  {
    title: "CS Dept Budget Proposal Q4",
    id: "DOC-2025-002",
    sender: "Jane Smith (Dean)",
    status: "Review",
  },
  {
    title: "Research Grant: AI in Education",
    id: "DOC-2025-003",
    sender: "Dr. Alan Turing",
    status: "Approved",
  },
  {
    title: "Student Council Event: Tech Week",
    id: "DOC-2025-004",
    sender: "Student Council",
    status: "Rejected",
  },
  {
    title: "Makeup Class Request - Math 101",
    id: "DOC-2025-005",
    sender: "Prof. Euler",
    status: "Archived",
  },
] as const;

const statusColorMap: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Review: "bg-blue-100 text-blue-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Archived: "bg-slate-100 text-slate-600",
};

const recentActivities = [
  {
    user: "System Admin",
    action: "updated role permissions",
    target: "Dean",
    time: "2 mins ago",
  },
  {
    user: "Jane Smith",
    action: "forwarded document",
    target: "DOC-2025-002",
    time: "15 mins ago",
  },
  {
    user: "HR Staff",
    action: "received document",
    target: "DOC-2025-001",
    time: "1 hour ago",
  },
  {
    user: "Dr. Alan Turing",
    action: "uploaded new version",
    target: "DOC-2025-003",
    time: "3 hours ago",
  },
];

const dashboardQuickStats = [
  {
    label: "Active Accounts",
    value: "64",
    description: "System administrators, staff, and directors",
  },
  {
    label: "Designations",
    value: "11",
    description: "User roles with defined permissions",
  },
  {
    label: "Document Categories",
    value: "18",
    description: "Configured routing templates",
  },
];

export const Client = () => {
  const [selectedDoc] = useState(recentDocuments[0]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Heading title="Dashboard" description="Welcome back, here's what's happening today." />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2">
            <DownloadIcon className="h-4 w-4" />
            Download Report
          </Button>
          <Button className="gap-2">
            <PlusCircleIcon className="h-4 w-4" />
            New Document
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className={cn("border bg-card/70 shadow-none", stat.className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardDescription>
              <span className="text-lg">{stat.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-serif">{stat.value}</div>
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
              <CardTitle>Recent Documents</CardTitle>
              <CardDescription>You have 1 pending document to review.</CardDescription>
            </div>
            <Button variant="ghost" className="text-sm">
              View All →
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Sender</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDocuments.map((doc) => (
                    <tr key={doc.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{doc.title}</div>
                        <div className="text-xs text-muted-foreground">{doc.id}</div>
                      </td>
                      <td className="px-4 py-3">{doc.sender}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn("border-none", statusColorMap[doc.status])}
                        >
                          {doc.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm">
                          •••
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.time} className="flex gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {activity.user.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{activity.user}</span> {activity.action}{" "}
                    <span className="text-emerald-700">{activity.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Snapshot</CardTitle>
            <CardDescription>
              High level view of routing steps for {selectedDoc.title}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Submission", owner: selectedDoc.sender, status: "Completed" },
              { label: "Dean Review", owner: "Dean's Office", status: "Pending" },
              { label: "VPAA Approval", owner: "VPAA", status: "Pending" },
              { label: "Final Archive", owner: "Records", status: "Waiting" },
            ].map((step) => (
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
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Environment metrics for administrators</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {dashboardQuickStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border bg-muted/40 px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-serif">{stat.value}</p>
                </div>
                <p className="max-w-[200px] text-sm text-muted-foreground text-right">
                  {stat.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

