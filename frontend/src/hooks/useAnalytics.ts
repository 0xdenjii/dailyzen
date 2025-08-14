import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { AnalyticsResponse } from "@/types";

type TimeRange = 'weekly' | 'monthly' | 'yearly';

export const useGetAnalytics = (range: TimeRange = 'monthly') => {
  return useQuery<AnalyticsResponse>({
    queryKey: ["analytics", range],
    queryFn: () => apiClient.get(`/analytics?range=${range}`),
  });
};