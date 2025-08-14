import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Entry, EntryFormData } from "@/types";

// Type for the API response which includes entries and total points
interface GetEntriesResponse {
    entries: Entry[];
    totalPoints: number;
}

// Hook to fetch entries for a specific date
export const useGetEntriesForDate = (date: string) => {
  return useQuery<GetEntriesResponse>({
    queryKey: ["entries", date], // The query key includes the date
    queryFn: () => apiClient.get(`/entries?date=${date}`),
  });
};

// Hook to create a new entry (complete a task)
export const useCreateEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newEntry: EntryFormData) =>
      apiClient.post<Entry, EntryFormData>("/entries", newEntry),
    onSuccess: (data) => {
      // When an entry is created, we need to refetch several things:
      // 1. The list of entries for that specific day
      queryClient.invalidateQueries({ queryKey: ["entries", data.date] });
      // 2. The current user's data (total points will have changed)
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      // 3. Any analytics data, as it is now stale
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

// Hook to delete an entry (un-complete a task)
export const useDeleteEntry = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ entryId, date }: { entryId: string, date: string }) =>
            apiClient.delete<void>(`/entries/${entryId}`),
        onSuccess: (data, variables) => {
            // Invalidate the same queries as creation
            queryClient.invalidateQueries({ queryKey: ["entries", variables.date] });
            queryClient.invalidateQueries({ queryKey: ["currentUser"] });
            queryClient.invalidateQueries({ queryKey: ["analytics"] });
        }
    })
}