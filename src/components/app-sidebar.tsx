"use client";

import {
  BarChartIcon,
  ArchiveIcon,
  BookOpenIcon,
  Building2Icon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  SettingsIcon,
  UsersIcon,
  FileTextIcon,
  FolderOpenIcon,
  HistoryIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const menuItems = {
  SYSTEM_ADMIN: [
    { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboardIcon },
    { title: "Designation", url: "/admin/designation", icon: Building2Icon },
    {
      title: "Document Category",
      url: "/admin/document-category",
      icon: BookOpenIcon,
    },
    { title: "Accounts", url: "/admin/accounts", icon: UsersIcon },
    { title: "Backup & Restore", url: "/admin/backup", icon: ArchiveIcon },
    { title: "Reports & Analytics", url: "/admin/reports", icon: BarChartIcon },
    { title: "System Log", url: "/admin/system-log", icon: ScrollTextIcon },
    { title: "Settings", url: "/admin/settings", icon: SettingsIcon },
  ],
  PRESIDENT: [
    {
      title: "Dashboard",
      url: "/president/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Document Repository",
      url: "/president/document-repository",
      icon: FolderOpenIcon,
    },
    {
      title: "Designate Document",
      url: "/president/designate-document",
      icon: FileTextIcon,
    },
    {
      title: "Document Tracking",
      url: "/president/document-tracking",
      icon: HistoryIcon,
    },
    {
      title: "Archived Documents",
      url: "/president/archived-documents",
      icon: ArchiveIcon,
    },
    {
      title: "Organization Chart",
      url: "/president/organization-chart",
      icon: UsersIcon,
    },
    { title: "Settings", url: "/president/settings", icon: SettingsIcon },
  ],
  VPAA: [
    { title: "Dashboard", url: "/vpaa/dashboard", icon: LayoutDashboardIcon },
    {
      title: "Document Repository",
      url: "/vpaa/document-repository",
      icon: FolderOpenIcon,
    },
    {
      title: "Designate Document",
      url: "/vpaa/designate-document",
      icon: FileTextIcon,
    },
    {
      title: "Document Tracking",
      url: "/vpaa/document-tracking",
      icon: HistoryIcon,
    },
    {
      title: "Archived Documents",
      url: "/vpaa/archived-documents",
      icon: ArchiveIcon,
    },
    {
      title: "Organization Chart",
      url: "/vpaa/organization-chart",
      icon: UsersIcon,
    },
    { title: "Settings", url: "/vpaa/settings", icon: SettingsIcon },
  ],
  VPADA: [
    { title: "Dashboard", url: "/vpada/dashboard", icon: LayoutDashboardIcon },
    {
      title: "Document Repository",
      url: "/vpada/document-repository",
      icon: FolderOpenIcon,
    },
    {
      title: "Designate Document",
      url: "/vpada/designate-document",
      icon: FileTextIcon,
    },
    {
      title: "Document Tracking",
      url: "/vpada/document-tracking",
      icon: HistoryIcon,
    },
    {
      title: "Archived Documents",
      url: "/vpada/archived-documents",
      icon: ArchiveIcon,
    },
    {
      title: "Organization Chart",
      url: "/vpada/organization-chart",
      icon: UsersIcon,
    },
    { title: "Settings", url: "/vpada/settings", icon: SettingsIcon },
  ],
  HR: [
    { title: "Dashboard", url: "/hr/dashboard", icon: LayoutDashboardIcon },
    {
      title: "Document Repository",
      url: "/hr/document-repository",
      icon: FolderOpenIcon,
    },
    {
      title: "Designate Document",
      url: "/hr/designate-document",
      icon: FileTextIcon,
    },
    {
      title: "Document Tracking",
      url: "/hr/document-tracking",
      icon: HistoryIcon,
    },
    {
      title: "Archived Documents",
      url: "/hr/archived-documents",
      icon: ArchiveIcon,
    },
    {
      title: "Organization Chart",
      url: "/hr/organization-chart",
      icon: UsersIcon,
    },
    { title: "Settings", url: "/hr/settings", icon: SettingsIcon },
  ],
  DEAN: [
    { title: "Dashboard", url: "/dean/dashboard", icon: LayoutDashboardIcon },
    {
      title: "Document Repository",
      url: "/dean/document-repository",
      icon: FolderOpenIcon,
    },
    {
      title: "Designate Document",
      url: "/dean/designate-document",
      icon: FileTextIcon,
    },
    {
      title: "Document Tracking",
      url: "/dean/document-tracking",
      icon: HistoryIcon,
    },
    {
      title: "Archived Documents",
      url: "/dean/archived-documents",
      icon: ArchiveIcon,
    },
    {
      title: "Organization Chart",
      url: "/dean/organization-chart",
      icon: UsersIcon,
    },
    { title: "Settings", url: "/dean/settings", icon: SettingsIcon },
  ],
  INSTRUCTOR: [
    {
      title: "Dashboard",
      url: "/instructor/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Document Repository",
      url: "/instructor/document-repository",
      icon: FolderOpenIcon,
    },
    {
      title: "Designate Document",
      url: "/instructor/designate-document",
      icon: FileTextIcon,
    },
    {
      title: "Document Tracking",
      url: "/instructor/document-tracking",
      icon: HistoryIcon,
    },
    {
      title: "Archived Documents",
      url: "/instructor/archived-documents",
      icon: ArchiveIcon,
    },
    {
      title: "Organization Chart",
      url: "/instructor/organization-chart",
      icon: UsersIcon,
    },
    { title: "Settings", url: "/instructor/settings", icon: SettingsIcon },
  ],
};

export function AppSidebar({ role }: { role?: string }) {
  const pathname = usePathname();

  // Get role from session or fetched role, default to USER
  // This allows the sidebar to render immediately with USER menu while role is being fetched
  const userRole = role || "INSTRUCTOR";

  const userMenuItems =
    menuItems[userRole as keyof typeof menuItems] || menuItems.INSTRUCTOR;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-8 relative">
            <Image
              src="/kld-logo.webp"
              alt="KLD Logo"
              fill
              className="size-full"
            />
          </div>
          <div>
            <h2 className="font-semibold text-sm">KLD Document Monitoring</h2>
            <p className="text-xs text-muted-foreground">Tracking System</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      pathname.startsWith(`${item.url}/`)
                    }
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
