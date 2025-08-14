import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Note, NoteFormData } from "@/types";

export const useGetNoteForDate = (date: string) => {
  return useQuery<Note | null>({
    queryKey: ["note", date], 
    queryFn: () => apiClient.get(`/notes?date=${date}`),
  });
};

export const useGetRecentNotes = () => {
    return useQuery<Note[]>({
        queryKey: ["notes", "recent"],
        queryFn: () => apiClient.get("/notes/recent"),
    });
};

export const useUpsertNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteData: NoteFormData) =>
      apiClient.post<Note, NoteFormData>("/notes", noteData),
    onSuccess: (updatedNote) => {
      queryClient.setQueryData(["note", updatedNote.date], updatedNote);
      
      queryClient.invalidateQueries({ queryKey: ["notes", "recent"] });

      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useNotesCalendar = (month: number, year: number) => {
  return useQuery<string[]>({ 
    queryKey: ['notes', 'calendar', year, month], // Include year/month in the key
    queryFn: () => apiClient.get(`/notes/calendar?year=${year}&month=${month}`),
  });
};