"use client";

import { useEffect, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NavUser } from "./nav-user";
import { NotificationBell } from "./notification-bell";
import { User } from "@/generated/prisma/client";

export function SiteHeader({
  user,
}: {
  user: User;
}) {
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
    // Function to update the time
    const updateTime = () => {
      const now = new Date();

      const formattedDate = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "Asia/Manila",
      });
      const formattedTime = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Manila",
      });

      const gmtOffset = "GMT+8 PH Time";

      setCurrentDateTime(`${formattedDate} - ${formattedTime} (${gmtOffset})`);
    };

    updateTime();

    const intervalId = setInterval(updateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center py-2 gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        {/* Dynamic Real-time Clock */}
        <h1 className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
          {currentDateTime}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <NavUser user={user} />
        </div>
      </div>
    </header>
  );
}
