"use server";

import { addMonths, format, formatDistanceToNow, startOfDay, startOfMonth, subMonths, subDays } from "date-fns";

import prisma from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { DocumentWorkflowStage } from "@/generated/prisma/enums";

const STATUS_DISPLAY_MAP: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STAGE_ORDER: DocumentWorkflowStage[] = [
  "INSTRUCTOR",
  "DEAN",
  "VPAA",
  "VPADA",
  "PRESIDENT",
  "REGISTRAR",
  "ARCHIVES",
];

const STAGE_INDEX_MAP = STAGE_ORDER.reduce<Record<string, number>>(
  (acc, stage, index) => {
    acc[stage] = index;
    return acc;
  },
  {}
);

const determineDocumentTitle = (doc: {
  remarks: string | null;
  fileCategory: { name: string } | null;
  referenceId: string;
}) => doc.remarks || doc.fileCategory?.name || doc.referenceId;

const formatUserName = (user?: { firstName: string; lastName: string } | null) =>
  user ? `${user.firstName} ${user.lastName}` : "Unknown User";

const determineWorkflowStatus = (
  targetStage: DocumentWorkflowStage,
  currentStage: DocumentWorkflowStage,
  status: keyof typeof STATUS_DISPLAY_MAP
) => {
  const targetIndex = STAGE_INDEX_MAP[targetStage] ?? 0;
  const currentIndex = STAGE_INDEX_MAP[currentStage] ?? 0;

  if (status === "APPROVED") {
    return targetIndex <= currentIndex ? "Completed" : "Waiting";
  }

  if (status === "REJECTED" && targetIndex === currentIndex) {
    return "Rejected";
  }

  if (targetIndex < currentIndex) {
    return "Completed";
  }

  if (targetIndex === currentIndex) {
    return "Pending";
  }

  return "Waiting";
};

export const getAdminDashboardAnalytics = async () => {
  const session = await getServerSession();
  if (!session?.id) {
    throw new Error("Unauthorized");
  }

  const admin = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, role: true },
  });

  if (!admin || admin.role !== "SYSTEM_ADMIN") {
    throw new Error("Forbidden");
  }

  const now = new Date();
  const last30Days = subDays(now, 30);
  const todayStart = startOfDay(now);

  const sixMonthsAgoStart = startOfMonth(subMonths(now, 5));

  const [
    totalDocuments,
    pendingDocuments,
    completedDocuments,
    criticalDocuments,
    documentsInLast30Days,
    pendingToday,
    activeAccounts,
    designationCount,
    categoryCount,
    recentDocumentsRaw,
    recentLogs,
    statusCounts,
    priorityCounts,
    documentsForTrend,
    roleSubmitterStats,
    designationSubmitterStats,
  ] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: "PENDING" } }),
    prisma.document.count({ where: { status: "APPROVED" } }),
    prisma.document.count({ where: { status: "PENDING", priority: "HIGH" } }),
    prisma.document.count({ where: { createdAt: { gte: last30Days } } }),
    prisma.document.count({
      where: { status: "PENDING", createdAt: { gte: todayStart } },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.designation.count(),
    prisma.documentCategory.count(),
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        submittedBy: true,
        fileCategory: { select: { name: true } },
        history: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.systemLog.findMany({
      orderBy: { timestamp: "desc" },
      take: 5,
      include: { user: true },
    }),
    prisma.document.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.document.groupBy({
      by: ["priority"],
      _count: { _all: true },
    }),
    prisma.document.findMany({
      where: { createdAt: { gte: sixMonthsAgoStart } },
      select: { createdAt: true, status: true },
    }),
    prisma.user.findMany({
      select: {
        role: true,
        _count: { select: { documentsSubmitted: true } },
      },
    }),
    prisma.user.findMany({
      select: {
        designation: {
          select: { id: true, name: true },
        },
        _count: { select: { documentsSubmitted: true } },
      },
    }),
  ]);

  const statCards = [
    {
      label: "Total Documents",
      value: totalDocuments,
      change: `${documentsInLast30Days} in the last 30 days`,
      icon: "📄",
    },
    {
      label: "Pending Approval",
      value: pendingDocuments,
      change: `${pendingToday} new today`,
      icon: "⏳",
    },
    {
      label: "Completed",
      value: completedDocuments,
      change: `${totalDocuments ? Math.round((completedDocuments / totalDocuments) * 100) : 0}% completion rate`,
      icon: "✅",
    },
    {
      label: "Critical Attention",
      value: criticalDocuments,
      change:
        criticalDocuments > 0
          ? "Requires immediate action"
          : "No critical items",
      icon: "🚨",
    },
  ];

  const recentActivities = recentLogs.map((log) => {
    const details = log.details || "No details provided";
    return {
      id: log.id,
      user: formatUserName(log.user),
      action: log.action,
      target: details.length > 80 ? `${details.slice(0, 77)}...` : details,
      time: formatDistanceToNow(log.timestamp, { addSuffix: true }),
    };
  });

  const dashboardQuickStats = [
    {
      label: "Active Accounts",
      value: activeAccounts,
      description: "System administrators, staff, and directors",
    },
    {
      label: "Designations",
      value: designationCount,
      description: "User roles with defined permissions",
    },
    {
      label: "Document Categories",
      value: categoryCount,
      description: "Configured routing templates",
    },
  ];

  const selectedDocument = recentDocumentsRaw[0];
  let workflowSnapshot: null | {
    documentTitle: string;
    referenceId: string;
    stages: Array<{ label: string; owner: string; status: string }>;
  } = null;

  if (selectedDocument) {
    const currentStage = selectedDocument.history[0]?.stage ?? "INSTRUCTOR";
    const workflowStages = [
      {
        label: "Submission",
        stage: "INSTRUCTOR" as DocumentWorkflowStage,
        owner: formatUserName(selectedDocument.submittedBy),
      },
      {
        label: "Dean Review",
        stage: "DEAN" as DocumentWorkflowStage,
        owner: "Dean's Office",
      },
      {
        label: "VPAA Approval",
        stage: "VPAA" as DocumentWorkflowStage,
        owner: "VPAA Office",
      },
      {
        label: "Final Archive",
        stage: "ARCHIVES" as DocumentWorkflowStage,
        owner: "Records Management",
      },
    ];

    workflowSnapshot = {
      documentTitle: determineDocumentTitle(selectedDocument),
      referenceId: selectedDocument.referenceId,
      stages: workflowStages.map((stage) => ({
        label: stage.label,
        owner: stage.owner,
        status: determineWorkflowStatus(
          stage.stage,
          currentStage,
          selectedDocument.status
        ),
      })),
    };
  }

  const statusDistribution = statusCounts
    .map((entry) => ({
      label: STATUS_DISPLAY_MAP[entry.status] ?? entry.status,
      count: entry._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const priorityBreakdown = priorityCounts
    .map((entry) => ({
      label:
        entry.priority === "HIGH"
          ? "High"
          : entry.priority === "MEDIUM"
            ? "Medium"
            : "Low",
      count: entry._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const months: Array<{ label: string; monthStart: Date }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    months.push({
      label: format(monthStart, "MMM yyyy"),
      monthStart,
    });
  }

  const monthlyTrend = months.map((month, index) => {
    const nextMonthStart =
      index === months.length - 1
        ? addMonths(month.monthStart, 1)
        : months[index + 1].monthStart;
    const monthDocs = documentsForTrend.filter(
      (doc) =>
        doc.createdAt >= month.monthStart && doc.createdAt < nextMonthStart
    );
    return {
      label: month.label,
      submitted: monthDocs.length,
      approved: monthDocs.filter((doc) => doc.status === "APPROVED").length,
    };
  });

  const roleActivity = roleSubmitterStats
    .map((entry) => ({
      role: entry.role,
      count: entry._count.documentsSubmitted,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count);

  const departmentMap = new Map<
    string,
    { name: string; count: number }
  >();

  designationSubmitterStats.forEach((entry) => {
    if (!entry.designation) {
      return;
    }
    const existing = departmentMap.get(entry.designation.id) ?? {
      name: entry.designation.name,
      count: 0,
    };
    existing.count += entry._count.documentsSubmitted;
    departmentMap.set(entry.designation.id, existing);
  });

  const departmentLeaders = Array.from(departmentMap.values()).sort(
    (a, b) => b.count - a.count
  );

  return {
    statCards,
    recentActivities,
    dashboardQuickStats,
    workflowSnapshot,
    statusDistribution,
    priorityBreakdown,
    monthlyTrend,
    roleActivity,
    departmentLeaders,
  };
};

