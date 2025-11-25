import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { getQueryClient } from "@/lib/query-client";
import { getBackups } from "@/actions/backup";
import { getDesignations } from "@/actions/designation";
import { Client } from "./_components/client";

const Page = async () => {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["backups"],
      queryFn: getBackups,
    }),
    queryClient.prefetchQuery({
      queryKey: ["designations"],
      queryFn: getDesignations,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Client />
    </HydrationBoundary>
  );
};

export default Page;

