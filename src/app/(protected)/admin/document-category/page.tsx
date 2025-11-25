import { getQueryClient } from "@/lib/query-client";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getDocumentCategories } from "@/actions/document-category";
import { getDesignations } from "@/actions/designation";
import { Client } from "./_components/client";

const Page = async () => {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["document-categories"],
      queryFn: getDocumentCategories,
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
