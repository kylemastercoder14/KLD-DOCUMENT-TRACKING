import { getQueryClient } from "@/lib/query-client";
import { Client } from "./_components/client";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getDesignations, getDocumentCategories } from "@/actions/designation";

const Page = async () => {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["designations"],
      queryFn: getDesignations,
    }),
    queryClient.prefetchQuery({
      queryKey: ["document-categories"],
      queryFn: getDocumentCategories,
    }),
  ]);
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Client />
    </HydrationBoundary>
  );
};

export default Page;
