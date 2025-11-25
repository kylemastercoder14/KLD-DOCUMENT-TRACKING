import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import React from "react";
import { getQueryClient } from '@/lib/query-client';
import { Client } from './_components/client';

const Page = async () => {
	const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Client />
    </HydrationBoundary>
  );
};

export default Page;

