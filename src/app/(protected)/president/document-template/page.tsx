import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from "react";
import { getQueryClient } from '@/lib/query-client';
import { getDesignations } from "@/actions/designation";
import { getDocumentCategories } from "@/actions/document-category";
import { Client } from './_components/client';

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

