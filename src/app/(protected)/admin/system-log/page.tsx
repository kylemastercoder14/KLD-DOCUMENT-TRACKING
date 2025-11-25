import { format } from "date-fns";

import Heading from "@/components/heading";
import prisma from "@/lib/prisma";

const Page = async () => {
  const logs = await prisma.systemLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="space-y-5">
      <Heading
        title="System Logs"
        description="Recent system activities across the platform."
      />

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                User
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Action
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Status
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                Details
              </th>
              <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length ? (
              logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-3 text-muted-foreground">
                    {format(new Date(log.timestamp), "PPpp")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">
                        {log.user
                          ? `${log.user.firstName} ${log.user.lastName}`
                          : "Unknown"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {log.user?.email ?? "N/A"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        log.status === "Failed"
                          ? "inline-flex items-center rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600"
                          : log.status === "Warning"
                            ? "inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-600"
                            : "inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600"
                      }
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.details}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.ipAddress}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No logs recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Page;

