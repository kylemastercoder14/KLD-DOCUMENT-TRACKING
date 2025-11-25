import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { redirect, unauthorized } from "next/navigation";
import { getServerSession } from "@/lib/session";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();

  if (!user) {
	redirect("/login");
  }

  // Optional: Verify user role if needed
  if (user.role !== "INSTRUCTOR") {
	unauthorized();
  }

  return (
	<SidebarProvider>
	  <AppSidebar role={user.role} />
	  <SidebarInset>
		<SiteHeader user={user} />
		<main className="flex-1 p-6 overflow-auto">{children}</main>
	  </SidebarInset>
	</SidebarProvider>
  );
}
