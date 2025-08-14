import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Goal, GoalFormData, UpdateGoalFormData } from "@/types";

export const useGetGoals = () => {
  return useQuery<Goal[]>({
    queryKey: ["goals"],
    queryFn: () => apiClient.get("/goals"),
  });
};

export const useCreateGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newGoal: GoalFormData) =>
      apiClient.post<Goal, GoalFormData>("/goals", newGoal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useUpdateGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: UpdateGoalFormData }) =>
      apiClient.put<Goal, UpdateGoalFormData>(`/goals/${goalId}`, data),
    onSuccess: (updatedGoal) => {
      queryClient.setQueryData(['goals'], (oldData: Goal[] | undefined) => 
        oldData ? oldData.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal) : []
      );
      if(updatedGoal.progress === 100) {
        queryClient.invalidateQueries({ queryKey: ["analytics"] });
      }
    },
  });
};

export const useDeleteGoal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => apiClient.delete<void>(`/goals/${goalId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};
