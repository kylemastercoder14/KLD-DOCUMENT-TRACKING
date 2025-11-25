"use client";

import { useState } from "react";
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

const documentVolume = [
  { month: "Jan", received: 70, processed: 32 },
  { month: "Feb", received: 58, processed: 41 },
  { month: "Mar", received: 85, processed: 67 },
  { month: "Apr", received: 78, processed: 64 },
  { month: "May", received: 95, processed: 34 },
  { month: "Jun", received: 60, processed: 90 },
  { month: "Jul", received: 120, processed: 92 },
  { month: "Aug", received: 110, processed: 88 },
  { month: "Sep", received: 95, processed: 70 },
  { month: "Oct", received: 85, processed: 66 },
  { month: "Nov", received: 75, processed: 58 },
];

const statusDistribution = [
  { name: "Completed", value: 630, color: "#22c55e" },
  { name: "Pending", value: 180, color: "#f97316" },
  { name: "In Review", value: 90, color: "#2563eb" },
  { name: "Rejected", value: 30, color: "#ef4444" },
];

const departmentEfficiency = [
  { department: "VPAA", rate: 96 },
  { department: "HR", rate: 86 },
  { department: "Research", rate: 74 },
  { department: "Student Affairs", rate: 81 },
  { department: "Registrar", rate: 92 },
];

const bottleneckScatter = [
  { dept: "President", avgTime: 48, delayed: 45 },
  { dept: "VPAA", avgTime: 35, delayed: 30 },
  { dept: "Research", avgTime: 28, delayed: 20 },
  { dept: "Registrar", avgTime: 12, delayed: 8 },
];

export const Client = () => {
  const [year, setYear] = useState("2025");

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
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="primary" className="gap-2">
              <DownloadIcon className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-accent/60 p-5">
              <p className="text-sm text-muted-foreground">Total Documents Processed</p>
              <p className="mt-4 font-serif text-4xl">930</p>
              <p className="text-sm text-emerald-600">+12.5% from last month</p>
            </div>
            <div className="rounded-2xl border bg-sky-50/60 p-5">
              <p className="text-sm text-muted-foreground">Average Turnaround Time</p>
              <p className="mt-4 font-serif text-4xl">1.8 days</p>
              <p className="text-sm text-emerald-600">-0.4 days faster than average</p>
            </div>
            <div className="rounded-2xl border bg-yellow-50/60 p-5">
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="mt-4 font-serif text-4xl text-destructive">120</p>
              <p className="text-sm text-destructive">Requires attention</p>
            </div>
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
                  <BarChart data={documentVolume}>
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
                        data={statusDistribution}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {statusDistribution.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex w-1/3 flex-col gap-2 text-sm">
                  {statusDistribution.map((status) => (
                    <div key={status.name} className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-muted-foreground">{status.name}</span>
                      <span className="font-semibold text-foreground ml-auto">
                        {status.value}
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
                  data={departmentEfficiency}
                  layout="vertical"
                  margin={{ left: 80, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} ticks={[20, 40, 60, 80, 100]} />
                  <YAxis dataKey="department" type="category" />
                  <Tooltip />
                  <Bar dataKey="rate" fill="#15803d" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="bottlenecks" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-red-50 p-5">
              <p className="text-sm font-semibold text-red-600">Critical Delay Alert</p>
              <p className="text-lg text-red-800">Office of the President Approval Stage</p>
              <p className="mt-4 font-serif text-4xl text-red-600">72 hrs</p>
              <p className="text-sm text-red-700">
                Average delay time, exceeding the SLA of 24 hours by 200%.
              </p>
            </div>
            <div className="rounded-2xl border bg-amber-50 p-5">
              <p className="text-sm font-semibold text-amber-600">Rising Backlog</p>
              <p className="text-lg text-amber-800">VPAA Department Approval</p>
              <p className="mt-4 font-serif text-4xl text-amber-600">45 Docs</p>
              <p className="text-sm text-amber-700">Documents pending for more than 3 days.</p>
            </div>
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
                    domain={[0, 80]}
                  />
                  <YAxis
                    type="number"
                    dataKey="delayed"
                    name="Delayed Documents"
                    unit=" docs"
                    domain={[0, 60]}
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Legend />
                  <Scatter data={bottleneckScatter} fill="#dc2626" name="Departments" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

