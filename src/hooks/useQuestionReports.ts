import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ReportStatus = "pending" | "reviewing" | "resolved" | "dismissed";

export interface QuestionReport {
  id: string;
  question_id: string;
  exam_id: string | null;
  exam_title: string;
  exam_kind: string;
  question_number: number | null;
  total_questions: number | null;
  question_text: string;
  section: string | null;
  reason: string;
  message: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  status: ReportStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewQuestionReport {
  questionId: string;
  examId?: string | null;
  examTitle: string;
  examKind?: "practice" | "live";
  questionNumber?: number | null;
  totalQuestions?: number | null;
  questionText: string;
  section?: string | null;
  reason: string;
  message: string;
}

export function useQuestionReports(status: ReportStatus | "all" = "all") {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["question-reports", status],
    enabled: isAdmin,
    queryFn: async () => {
      let query = supabase
        .from("question_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as QuestionReport[];
    },
  });
}

export function usePendingReportCount() {
  const { isAdmin } = useAuth();
  return useQuery({
    queryKey: ["question-reports", "pending-count"],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("question_reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useSubmitQuestionReport() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (report: NewQuestionReport) => {
      if (!user) throw new Error("রিপোর্ট পাঠাতে লগইন করুন।");
      const { error } = await supabase.from("question_reports").insert({
        question_id: report.questionId,
        exam_id: report.examId ?? null,
        exam_title: report.examTitle,
        exam_kind: report.examKind ?? "practice",
        question_number: report.questionNumber ?? null,
        total_questions: report.totalQuestions ?? null,
        question_text: report.questionText.slice(0, 2000),
        section: report.section ?? null,
        reason: report.reason,
        message: report.message.slice(0, 2000),
        user_id: user.id,
        user_email: profile?.email ?? user.email ?? null,
        user_name: profile?.full_name ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["question-reports"] }),
  });
}

export function useUpdateReportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: string; status: ReportStatus; adminNote?: string }) => {
      const { error } = await supabase
        .from("question_reports")
        .update({ status, ...(adminNote !== undefined ? { admin_note: adminNote } : {}) })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["question-reports"] }),
  });
}

export function useDeleteQuestionReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("question_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["question-reports"] }),
  });
}
