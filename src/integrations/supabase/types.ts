export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      batches: {
        Row: {
          created_at: string
          id: string
          name: string
          next_number: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          next_number?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          next_number?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      event_banners: {
        Row: {
          active: boolean
          caption: string
          created_at: string
          id: string
          image: string
          target_date: string
        }
        Insert: {
          active?: boolean
          caption?: string
          created_at?: string
          id?: string
          image?: string
          target_date?: string
        }
        Update: {
          active?: boolean
          caption?: string
          created_at?: string
          id?: string
          image?: string
          target_date?: string
        }
        Relationships: []
      }
      exam_answers: {
        Row: {
          attempt_id: string
          correct_answer: string
          created_at: string
          id: string
          is_correct: boolean
          question_id: string
          selected_answer: string
        }
        Insert: {
          attempt_id: string
          correct_answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_answer?: string
        }
        Update: {
          attempt_id?: string
          correct_answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_answer?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "exam_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_attempts: {
        Row: {
          correct_answers: number
          created_at: string
          exam_id: string
          id: string
          score: number
          total_questions: number
          user_id: string
          wrong_answers: number
        }
        Insert: {
          correct_answers?: number
          created_at?: string
          exam_id: string
          id?: string
          score?: number
          total_questions?: number
          user_id: string
          wrong_answers?: number
        }
        Update: {
          correct_answers?: number
          created_at?: string
          exam_id?: string
          id?: string
          score?: number
          total_questions?: number
          user_id?: string
          wrong_answers?: number
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_premium_batches: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          premium_batch_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          premium_batch_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          premium_batch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_premium_batches_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_premium_batches_premium_batch_id_fkey"
            columns: ["premium_batch_id"]
            isOneToOne: false
            referencedRelation: "premium_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          category: string
          chapter: string
          chapter_id: string | null
          created_at: string
          difficulty: string
          duration: number
          featured: boolean
          id: string
          mandatory_subjects: Json
          negative_marking: number
          published: boolean
          question_count: number
          section_id: string | null
          subject: string
          title: string
        }
        Insert: {
          category?: string
          chapter?: string
          chapter_id?: string | null
          created_at?: string
          difficulty?: string
          duration?: number
          featured?: boolean
          id?: string
          mandatory_subjects?: Json
          negative_marking?: number
          published?: boolean
          question_count?: number
          section_id?: string | null
          subject?: string
          title: string
        }
        Update: {
          category?: string
          chapter?: string
          chapter_id?: string | null
          created_at?: string
          difficulty?: string
          duration?: number
          featured?: boolean
          id?: string
          mandatory_subjects?: Json
          negative_marking?: number
          published?: boolean
          question_count?: number
          section_id?: string | null
          subject?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "paper_chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exam_answers: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          live_exam_id: string
          participant_id: string
          question_id: string
          selected_answer: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          live_exam_id: string
          participant_id: string
          question_id: string
          selected_answer?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          live_exam_id?: string
          participant_id?: string
          question_id?: string
          selected_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_answers_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_exam_answers_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "live_exam_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exam_participants: {
        Row: {
          correct: number
          created_at: string
          id: string
          live_exam_id: string
          max_score: number
          negative_marks: number
          percentage: number
          score: number
          skipped: number
          started_at: string | null
          status: string
          submitted_at: string | null
          time_taken_seconds: number
          user_id: string
          wrong: number
        }
        Insert: {
          correct?: number
          created_at?: string
          id?: string
          live_exam_id: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          score?: number
          skipped?: number
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          time_taken_seconds?: number
          user_id: string
          wrong?: number
        }
        Update: {
          correct?: number
          created_at?: string
          id?: string
          live_exam_id?: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          score?: number
          skipped?: number
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          time_taken_seconds?: number
          user_id?: string
          wrong?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_participants_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exam_premium_batches: {
        Row: {
          created_at: string
          id: string
          live_exam_id: string
          premium_batch_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_exam_id: string
          premium_batch_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_exam_id?: string
          premium_batch_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_exam_premium_batches_live_exam_id_fkey"
            columns: ["live_exam_id"]
            isOneToOne: false
            referencedRelation: "live_exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_exam_premium_batches_premium_batch_id_fkey"
            columns: ["premium_batch_id"]
            isOneToOne: false
            referencedRelation: "premium_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      live_exams: {
        Row: {
          access_mode: string
          created_at: string
          description: string
          duration: number
          end_time: string
          exam_id: string
          id: string
          negative_marking: number | null
          show_leaderboard: boolean
          start_time: string
          status: string
          title: string
        }
        Insert: {
          access_mode?: string
          created_at?: string
          description?: string
          duration?: number
          end_time: string
          exam_id: string
          id?: string
          negative_marking?: number | null
          show_leaderboard?: boolean
          start_time: string
          status?: string
          title: string
        }
        Update: {
          access_mode?: string
          created_at?: string
          description?: string
          duration?: number
          end_time?: string
          exam_id?: string
          id?: string
          negative_marking?: number | null
          show_leaderboard?: boolean
          start_time?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_exams_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string
          id: string
          image: string | null
          pinned: boolean
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image?: string | null
          pinned?: boolean
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image?: string | null
          pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      page_visits: {
        Row: {
          created_at: string
          id: string
          page_path: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_path?: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          page_path?: string
          session_id?: string
        }
        Relationships: []
      }
      paper_chapters: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          paper_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
          paper_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          paper_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "paper_chapters_paper_id_fkey"
            columns: ["paper_id"]
            isOneToOne: false
            referencedRelation: "subject_papers"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_batch_members: {
        Row: {
          created_at: string
          id: string
          premium_batch_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          premium_batch_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          premium_batch_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_batch_members_premium_batch_id_fkey"
            columns: ["premium_batch_id"]
            isOneToOne: false
            referencedRelation: "premium_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      premium_batches: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batch_id: string | null
          batch_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          unique_code: string | null
          unique_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          batch_id?: string | null
          batch_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          unique_code?: string | null
          unique_number?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          batch_id?: string | null
          batch_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          unique_code?: string | null
          unique_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string
          created_at: string
          exam_id: string
          explanation: string
          id: string
          option_images: Json | null
          options: Json
          question: string
          question_image: string | null
          section: string
          sort_order: number
          type: string
        }
        Insert: {
          answer?: string
          created_at?: string
          exam_id: string
          explanation?: string
          id?: string
          option_images?: Json | null
          options?: Json
          question: string
          question_image?: string | null
          section?: string
          sort_order?: number
          type?: string
        }
        Update: {
          answer?: string
          created_at?: string
          exam_id?: string
          explanation?: string
          id?: string
          option_images?: Json | null
          options?: Json
          question?: string
          question_image?: string | null
          section?: string
          sort_order?: number
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          color: string
          created_at: string
          description: string
          id: string
          target_date: string
          title: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          target_date?: string
          title: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          id?: string
          target_date?: string
          title?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          answers: Json
          correct: number
          created_at: string
          exam_id: string
          exam_title: string
          final_score: number
          id: string
          max_score: number
          negative_marks: number
          percentage: number
          session_id: string
          skipped: number
          total_questions: number
          wrong: number
        }
        Insert: {
          answers?: Json
          correct?: number
          created_at?: string
          exam_id: string
          exam_title?: string
          final_score?: number
          id?: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          session_id: string
          skipped?: number
          total_questions?: number
          wrong?: number
        }
        Update: {
          answers?: Json
          correct?: number
          created_at?: string
          exam_id?: string
          exam_title?: string
          final_score?: number
          id?: string
          max_score?: number
          negative_marks?: number
          percentage?: number
          session_id?: string
          skipped?: number
          total_questions?: number
          wrong?: number
        }
        Relationships: []
      }
      section_premium_batches: {
        Row: {
          created_at: string
          id: string
          premium_batch_id: string
          section_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          premium_batch_id: string
          section_id: string
        }
        Update: {
          created_at?: string
          id?: string
          premium_batch_id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "section_premium_batches_premium_batch_id_fkey"
            columns: ["premium_batch_id"]
            isOneToOne: false
            referencedRelation: "premium_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_premium_batches_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          caption: string | null
          created_at: string
          description: string
          id: string
          image: string | null
          name: string
          order: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name: string
          order?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name?: string
          order?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          about_content: string
          about_title: string
          active_theme_id: string
          brand_emoji: string
          brand_name: string
          contact_content: string
          contact_title: string
          created_at: string
          custom_theme: Json | null
          features_content: string
          features_title: string
          footer_description: string
          footer_links: Json
          hero_subtitle: string
          hero_tagline: string
          id: string
          report_settings: Json | null
          social_links: Json
          ui_labels: Json | null
          updated_at: string
        }
        Insert: {
          about_content?: string
          about_title?: string
          active_theme_id?: string
          brand_emoji?: string
          brand_name?: string
          contact_content?: string
          contact_title?: string
          created_at?: string
          custom_theme?: Json | null
          features_content?: string
          features_title?: string
          footer_description?: string
          footer_links?: Json
          hero_subtitle?: string
          hero_tagline?: string
          id?: string
          report_settings?: Json | null
          social_links?: Json
          ui_labels?: Json | null
          updated_at?: string
        }
        Update: {
          about_content?: string
          about_title?: string
          active_theme_id?: string
          brand_emoji?: string
          brand_name?: string
          contact_content?: string
          contact_title?: string
          created_at?: string
          custom_theme?: Json | null
          features_content?: string
          features_title?: string
          footer_description?: string
          footer_links?: Json
          hero_subtitle?: string
          hero_tagline?: string
          id?: string
          report_settings?: Json | null
          social_links?: Json
          ui_labels?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      subject_papers: {
        Row: {
          created_at: string
          description: string
          id: string
          image: string | null
          name: string
          sort_order: number
          subject_id: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name: string
          sort_order?: number
          subject_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name?: string
          sort_order?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_papers_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_premium_batches: {
        Row: {
          created_at: string
          id: string
          premium_batch_id: string
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          premium_batch_id: string
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          premium_batch_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_premium_batches_premium_batch_id_fkey"
            columns: ["premium_batch_id"]
            isOneToOne: false
            referencedRelation: "premium_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_premium_batches_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          description: string
          id: string
          image: string | null
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image?: string | null
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wrong_answers: {
        Row: {
          correct_answer: string
          created_at: string
          exam_id: string
          exam_title: string
          explanation: string
          id: string
          option_images: Json | null
          options: Json
          question_id: string
          question_image: string | null
          question_text: string
          section: string
          session_id: string
          user_answer: string
        }
        Insert: {
          correct_answer?: string
          created_at?: string
          exam_id: string
          exam_title?: string
          explanation?: string
          id?: string
          option_images?: Json | null
          options?: Json
          question_id: string
          question_image?: string | null
          question_text?: string
          section?: string
          session_id: string
          user_answer?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          exam_id?: string
          exam_title?: string
          explanation?: string
          id?: string
          option_images?: Json | null
          options?: Json
          question_id?: string
          question_image?: string | null
          question_text?: string
          section?: string
          session_id?: string
          user_answer?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_batch_to_profile: {
        Args: { _batch_id: string; _user_id: string }
        Returns: undefined
      }
      can_view_exam: { Args: { _exam_id: string }; Returns: boolean }
      can_view_live_exam: { Args: { _live_exam_id: string }; Returns: boolean }
      can_view_section: { Args: { _section_id: string }; Returns: boolean }
      can_view_subject: { Args: { _subject_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
