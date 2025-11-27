"use server";

import { addMonths, eachMonthOfInterval, endOfYear, format, startOfMonth, startOfYear } from "date-fns";

import prisma from "@/lib/prisma";
import { WORKFLOW_STAGE_LABELS } from "@/constants/document-history";
import { DocumentWorkflowStage } from "@/generated/prisma/enums";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

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
    stage: DocumentWorkflowStage;
    stageLabel: string;
    avgTimeHours: number;
    delayedDocuments: number;
  }>;
};

const getMonthBuckets = (year: number) => {
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(start);
  return eachMonthOfInterval({ start, end }).slice(0, 12);
};

export const getAdminReportsAnalytics = async (year?: number): Promise<AdminReportsResponse> => {
  const now = new Date();
  const targetYear = year && !Number.isNaN(year) ? year : now.getFullYear();
  const yearStart = startOfYear(new Date(targetYear, 0, 1));
  const yearEnd = endOfYear(yearStart);

  const [documents, statusCounts] = await Promise.all([
    prisma.document.findMany({
      where: {
        createdAt: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        submittedBy: {
          select: {
            designationId: true,
            designation: {
              select: { name: true },
            },
          },
        },
        history: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { stage: true },
        },
      },
    }),
    prisma.document.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const monthBuckets = getMonthBuckets(targetYear);
  const volumeMap = monthBuckets.map((monthDate) => ({
    month: format(monthDate, "MMM"),
    key: format(monthDate, "yyyy-MM"),
    received: 0,
    processed: 0,
  }));

  const departmentMap = new Map<
    string,
    { name: string; total: number; completed: number; pending: number }
  >();

  const stageMap = new Map<
    DocumentWorkflowStage,
    { totalTime: number; count: number; delayed: number }
  >();

  let totalProcessed = 0;
  let totalPending = 0;
  let turnaroundAccumulator = 0;
  let turnaroundCount = 0;

  documents.forEach((doc) => {
    const monthKey = format(doc.createdAt, "yyyy-MM");
    const bucket = volumeMap.find((entry) => entry.key === monthKey);
    if (bucket) {
      bucket.received += 1;
      if (doc.status !== "PENDING") {
        bucket.processed += 1;
      }
    }

    const designationName = doc.submittedBy?.designation?.name || "Unassigned";
    const deptEntry =
      departmentMap.get(designationName) ??
      {
        name: designationName,
        total: 0,
        completed: 0,
        pending: 0,
      };
    deptEntry.total += 1;
    if (doc.status === "PENDING") {
      deptEntry.pending += 1;
    } else if (doc.status === "APPROVED" || doc.status === "REJECTED") {
      deptEntry.completed += 1;
    }
    departmentMap.set(designationName, deptEntry);

    if (doc.status !== "PENDING") {
      totalProcessed += 1;
      const turnaroundMs = doc.updatedAt.getTime() - doc.createdAt.getTime();
      turnaroundAccumulator += turnaroundMs;
      turnaroundCount += 1;
    } else {
      totalPending += 1;
    }

    const latestStage = doc.history[0]?.stage ?? "INSTRUCTOR";
    const stageEntry =
      stageMap.get(latestStage) ?? {
        totalTime: 0,
        count: 0,
        delayed: 0,
      };
    const lifetimeHours = (doc.updatedAt.getTime() - doc.createdAt.getTime()) / (1000 * 60 * 60);
    stageEntry.totalTime += lifetimeHours;
    stageEntry.count += 1;
    if (doc.status === "PENDING" && lifetimeHours > 48) {
      stageEntry.delayed += 1;
    }
    stageMap.set(latestStage, stageEntry);
  });

  const processedChangePct = (() => {
    if (volumeMap.length < 2) return 0;
    const current = volumeMap[volumeMap.length - 1];
    const prev = volumeMap[volumeMap.length - 2];
    if (!prev.processed) return current.processed ? 100 : 0;
    return Number((((current.processed - prev.processed) / prev.processed) * 100).toFixed(1));
  })();

  const avgTurnaroundHours =
    turnaroundCount > 0 ? Number((turnaroundAccumulator / turnaroundCount / (1000 * 60 * 60)).toFixed(2)) : 0;

  const statusDistribution = statusCounts.map((entry) => ({
    name: STATUS_LABELS[entry.status] ?? entry.status,
    value: entry._count._all,
  }));

  const departmentPerformance = Array.from(departmentMap.values())
    .map((dept) => ({
      name: dept.name,
      completionRate: dept.total ? Number(((dept.completed / dept.total) * 100).toFixed(1)) : 0,
      totalDocuments: dept.total,
      pendingDocuments: dept.pending,
    }))
    .sort((a, b) => b.totalDocuments - a.totalDocuments)
    .slice(0, 8);

  const bottlenecks = Array.from(stageMap.entries())
    .map(([stage, stats]) => ({
      stage,
      stageLabel: WORKFLOW_STAGE_LABELS[stage] ?? stage,
      avgTimeHours: stats.count ? Number((stats.totalTime / stats.count).toFixed(1)) : 0,
      delayedDocuments: stats.delayed,
    }))
    .sort((a, b) => b.avgTimeHours - a.avgTimeHours)
    .slice(0, 5);

  const response: AdminReportsResponse = {
    summary: {
      totalProcessed,
      avgTurnaroundHours,
      pending: totalPending,
      processedChangePct,
    },
    documentVolume: volumeMap.map(({ key, ...rest }) => rest),
    statusDistribution,
    departmentPerformance,
    bottlenecks,
  };

  return response;
};

