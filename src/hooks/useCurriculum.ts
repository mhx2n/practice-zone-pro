import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SubjectRow {
  id: string;
  name: string;
  description: string;
  image: string | null;
  sort_order: number;
}

export interface PaperRow {
  id: string;
  subject_id: string;
  name: string;
  description: string;
  image: string | null;
  sort_order: number;
}

export interface ChapterRow {
  id: string;
  paper_id: string;
  name: string;
  description: string;
  sort_order: number;
}

function notifyError(error: unknown) {
  toast({
    title: "ত্রুটি",
    description: error instanceof Error ? error.message : "কিছু একটা ভুল হয়েছে",
    variant: "destructive",
  });
}

export function useSubjectRows() {
  return useQuery({
    queryKey: ["curriculum", "subjects"],
    queryFn: async (): Promise<SubjectRow[]> => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id,name,description,image,sort_order")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as SubjectRow[];
    },
  });
}

export function usePapers() {
  return useQuery({
    queryKey: ["curriculum", "papers"],
    queryFn: async (): Promise<PaperRow[]> => {
      const { data, error } = await supabase
        .from("subject_papers")
        .select("id,subject_id,name,description,image,sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as PaperRow[];
    },
  });
}

export function useChapters() {
  return useQuery({
    queryKey: ["curriculum", "chapters"],
    queryFn: async (): Promise<ChapterRow[]> => {
      const { data, error } = await supabase
        .from("paper_chapters")
        .select("id,paper_id,name,description,sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as ChapterRow[];
    },
  });
}

function useCurriculumMutation<TVars>(
  fn: (vars: TVars) => Promise<void>,
  successTitle: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["curriculum"] });
      qc.invalidateQueries({ queryKey: ["exams"] });
      toast({ title: successTitle });
    },
    onError: notifyError,
  });
}

export function useUpsertSubject() {
  return useCurriculumMutation<Partial<SubjectRow> & { name: string }>(async (subject) => {
    const payload: Record<string, unknown> = {
      name: subject.name,
      description: subject.description ?? "",
      image: subject.image ?? null,
      sort_order: subject.sort_order ?? 0,
    };
    if (subject.id) payload.id = subject.id;
    const { error } = await supabase.from("subjects").upsert(payload as never);
    if (error) throw error;
  }, "বিষয় সংরক্ষিত হয়েছে ");
}

export function useDeleteSubject() {
  return useCurriculumMutation<string>(async (id) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) throw error;
  }, "বিষয় মুছে ফেলা হয়েছে");
}

export function useUpsertPaper() {
  return useCurriculumMutation<Partial<PaperRow> & { subject_id: string; name: string }>(async (paper) => {
    const payload: Record<string, unknown> = {
      subject_id: paper.subject_id,
      name: paper.name,
      description: paper.description ?? "",
      image: paper.image ?? null,
      sort_order: paper.sort_order ?? 0,
    };
    if (paper.id) payload.id = paper.id;
    const { error } = await supabase.from("subject_papers").upsert(payload as never);
    if (error) throw error;
  }, "পত্র সংরক্ষিত হয়েছে ");
}

export function useDeletePaper() {
  return useCurriculumMutation<string>(async (id) => {
    const { error } = await supabase.from("subject_papers").delete().eq("id", id);
    if (error) throw error;
  }, "পত্র মুছে ফেলা হয়েছে");
}

export function useUpsertChapter() {
  return useCurriculumMutation<Partial<ChapterRow> & { paper_id: string; name: string }>(async (chapter) => {
    const payload: Record<string, unknown> = {
      paper_id: chapter.paper_id,
      name: chapter.name,
      description: chapter.description ?? "",
      sort_order: chapter.sort_order ?? 0,
    };
    if (chapter.id) payload.id = chapter.id;
    const { error } = await supabase.from("paper_chapters").upsert(payload as never);
    if (error) throw error;
  }, "অধ্যায় সংরক্ষিত হয়েছে ");
}

export function useDeleteChapter() {
  return useCurriculumMutation<string>(async (id) => {
    const { error } = await supabase.from("paper_chapters").delete().eq("id", id);
    if (error) throw error;
  }, "অধ্যায় মুছে ফেলা হয়েছে");
}

export function useAssignExamChapter() {
  return useCurriculumMutation<{ examId: string; chapterId: string | null }>(async ({ examId, chapterId }) => {
    const { error } = await supabase.from("exams").update({ chapter_id: chapterId } as never).eq("id", examId);
    if (error) throw error;
  }, "পরীক্ষা আপডেট হয়েছে ");
}
