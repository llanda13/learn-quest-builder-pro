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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      collaboration_messages: {
        Row: {
          document_id: string
          document_type: string
          id: string
          message: string
          timestamp: string | null
          user_email: string
          user_name: string
        }
        Insert: {
          document_id: string
          document_type: string
          id?: string
          message: string
          timestamp?: string | null
          user_email: string
          user_name: string
        }
        Update: {
          document_id?: string
          document_type?: string
          id?: string
          message?: string
          timestamp?: string | null
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      document_activity: {
        Row: {
          action_details: Json | null
          action_type: string
          document_id: string
          document_type: string
          id: string
          timestamp: string | null
          user_email: string
          user_name: string
        }
        Insert: {
          action_details?: Json | null
          action_type: string
          document_id: string
          document_type: string
          id?: string
          timestamp?: string | null
          user_email: string
          user_name: string
        }
        Update: {
          action_details?: Json | null
          action_type?: string
          document_id?: string
          document_type?: string
          id?: string
          timestamp?: string | null
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      document_collaborators: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          document_id: string
          document_type: string
          id: string
          invited_at: string | null
          invited_by: string | null
          last_active: string | null
          role: string
          user_email: string
          user_name: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          document_id: string
          document_type: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active?: string | null
          role?: string
          user_email: string
          user_name: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          document_id?: string
          document_type?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_active?: string | null
          role?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      document_presence: {
        Row: {
          created_at: string | null
          cursor_position: Json | null
          document_id: string
          document_type: string
          id: string
          is_active: boolean | null
          last_seen: string | null
          user_color: string
          user_email: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          cursor_position?: Json | null
          document_id: string
          document_type: string
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          user_color: string
          user_email: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          cursor_position?: Json | null
          document_id?: string
          document_type?: string
          id?: string
          is_active?: boolean | null
          last_seen?: string | null
          user_color?: string
          user_email?: string
          user_name?: string
        }
        Relationships: []
      }
      essay_scores: {
        Row: {
          created_at: string | null
          graded_by: string | null
          id: string
          question_id: string | null
          scores: Json
          student_id: string
          student_name: string | null
          total: number | null
        }
        Insert: {
          created_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          scores?: Json
          student_id: string
          student_name?: string | null
          total?: number | null
        }
        Update: {
          created_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          scores?: Json
          student_id?: string
          student_name?: string | null
          total?: number | null
        }
        Relationships: []
      }
      generated_tests: {
        Row: {
          answer_keys: Json
          course: string | null
          created_at: string | null
          created_by: string | null
          exam_period: string | null
          id: string
          instructions: string | null
          num_versions: number
          points_per_question: number | null
          school_year: string | null
          shuffle_choices: boolean | null
          shuffle_questions: boolean | null
          subject: string
          time_limit: number | null
          title: string
          tos_id: string | null
          version_label: string | null
          version_number: number | null
          versions: Json
          year_section: string | null
        }
        Insert: {
          answer_keys: Json
          course?: string | null
          created_at?: string | null
          created_by?: string | null
          exam_period?: string | null
          id?: string
          instructions?: string | null
          num_versions: number
          points_per_question?: number | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          subject: string
          time_limit?: number | null
          title: string
          tos_id?: string | null
          version_label?: string | null
          version_number?: number | null
          versions: Json
          year_section?: string | null
        }
        Update: {
          answer_keys?: Json
          course?: string | null
          created_at?: string | null
          created_by?: string | null
          exam_period?: string | null
          id?: string
          instructions?: string | null
          num_versions?: number
          points_per_question?: number | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          subject?: string
          time_limit?: number | null
          title?: string
          tos_id?: string | null
          version_label?: string | null
          version_number?: number | null
          versions?: Json
          year_section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_tests_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_competencies: {
        Row: {
          analyzing_items: number
          applying_items: number
          created_at: string
          creating_items: number
          evaluating_items: number
          hours: number
          id: string
          item_numbers: Json
          percentage: number
          remembering_items: number
          topic_name: string
          tos_id: string | null
          total_items: number
          understanding_items: number
        }
        Insert: {
          analyzing_items?: number
          applying_items?: number
          created_at?: string
          creating_items?: number
          evaluating_items?: number
          hours: number
          id?: string
          item_numbers?: Json
          percentage: number
          remembering_items?: number
          topic_name: string
          tos_id?: string | null
          total_items: number
          understanding_items?: number
        }
        Update: {
          analyzing_items?: number
          applying_items?: number
          created_at?: string
          creating_items?: number
          evaluating_items?: number
          hours?: number
          id?: string
          item_numbers?: Json
          percentage?: number
          remembering_items?: number
          topic_name?: string
          tos_id?: string | null
          total_items?: number
          understanding_items?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_competencies_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          ai_confidence_score: number | null
          approval_confidence: number | null
          approval_notes: string | null
          approval_timestamp: string | null
          approved: boolean
          approved_by: string | null
          bloom_level: string
          choices: Json | null
          correct_answer: string | null
          created_at: string | null
          created_by: string
          deleted: boolean | null
          difficulty: string
          id: string
          knowledge_dimension: string | null
          metadata: Json | null
          needs_review: boolean | null
          question_text: string
          question_type: string
          topic: string
          tos_id: string | null
          updated_at: string | null
          used_count: number | null
          used_history: Json | null
        }
        Insert: {
          ai_confidence_score?: number | null
          approval_confidence?: number | null
          approval_notes?: string | null
          approval_timestamp?: string | null
          approved?: boolean
          approved_by?: string | null
          bloom_level: string
          choices?: Json | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string
          deleted?: boolean | null
          difficulty: string
          id?: string
          knowledge_dimension?: string | null
          metadata?: Json | null
          needs_review?: boolean | null
          question_text: string
          question_type: string
          topic: string
          tos_id?: string | null
          updated_at?: string | null
          used_count?: number | null
          used_history?: Json | null
        }
        Update: {
          ai_confidence_score?: number | null
          approval_confidence?: number | null
          approval_notes?: string | null
          approval_timestamp?: string | null
          approved?: boolean
          approved_by?: string | null
          bloom_level?: string
          choices?: Json | null
          correct_answer?: string | null
          created_at?: string | null
          created_by?: string
          deleted?: boolean | null
          difficulty?: string
          id?: string
          knowledge_dimension?: string | null
          metadata?: Json | null
          needs_review?: boolean | null
          question_text?: string
          question_type?: string
          topic?: string
          tos_id?: string | null
          updated_at?: string | null
          used_count?: number | null
          used_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_criteria: {
        Row: {
          created_at: string | null
          id: string
          max_score: number | null
          name: string
          order_index: number | null
          rubric_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_score?: number | null
          name: string
          order_index?: number | null
          rubric_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          max_score?: number | null
          name?: string
          order_index?: number | null
          rubric_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_scores: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          question_id: string | null
          scorer_id: string | null
          scores: Json
          student_id: string | null
          student_name: string | null
          test_id: string | null
          total_score: number
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          scorer_id?: string | null
          scores?: Json
          student_id?: string | null
          student_name?: string | null
          test_id?: string | null
          total_score?: number
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          question_id?: string | null
          scorer_id?: string | null
          scores?: Json
          student_id?: string | null
          student_name?: string | null
          test_id?: string | null
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubric_scores_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubric_scores_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "generated_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      student_responses: {
        Row: {
          graded: boolean | null
          graded_at: string | null
          graded_by: string | null
          id: string
          question_id: string | null
          response_text: string
          student_id: string | null
          student_name: string
          submitted_at: string | null
          total_score: number | null
        }
        Insert: {
          graded?: boolean | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          response_text: string
          student_id?: string | null
          student_name: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Update: {
          graded?: boolean | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          question_id?: string | null
          response_text?: string
          student_id?: string | null
          student_name?: string
          submitted_at?: string | null
          total_score?: number | null
        }
        Relationships: []
      }
      test_exports: {
        Row: {
          export_type: string
          exported_at: string | null
          exported_by: string
          file_name: string
          id: string
          test_version_id: string | null
        }
        Insert: {
          export_type: string
          exported_at?: string | null
          exported_by: string
          file_name: string
          id?: string
          test_version_id?: string | null
        }
        Update: {
          export_type?: string
          exported_at?: string | null
          exported_by?: string
          file_name?: string
          id?: string
          test_version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_exports_test_version_id_fkey"
            columns: ["test_version_id"]
            isOneToOne: false
            referencedRelation: "test_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_metadata: {
        Row: {
          course: string | null
          created_at: string | null
          created_by: string
          exam_period: string | null
          id: string
          instructions: string
          number_of_versions: number | null
          points_per_question: number | null
          school_year: string | null
          shuffle_choices: boolean | null
          shuffle_questions: boolean | null
          subject: string
          time_limit: number | null
          title: string
          total_questions: number
          updated_at: string | null
          year_section: string | null
        }
        Insert: {
          course?: string | null
          created_at?: string | null
          created_by?: string
          exam_period?: string | null
          id?: string
          instructions?: string
          number_of_versions?: number | null
          points_per_question?: number | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          subject: string
          time_limit?: number | null
          title: string
          total_questions: number
          updated_at?: string | null
          year_section?: string | null
        }
        Update: {
          course?: string | null
          created_at?: string | null
          created_by?: string
          exam_period?: string | null
          id?: string
          instructions?: string
          number_of_versions?: number | null
          points_per_question?: number | null
          school_year?: string | null
          shuffle_choices?: boolean | null
          shuffle_questions?: boolean | null
          subject?: string
          time_limit?: number | null
          title?: string
          total_questions?: number
          updated_at?: string | null
          year_section?: string | null
        }
        Relationships: []
      }
      test_versions: {
        Row: {
          answer_key: Json
          created_at: string | null
          id: string
          question_order: number[]
          questions: Json
          test_metadata_id: string | null
          total_points: number
          version_label: string
        }
        Insert: {
          answer_key: Json
          created_at?: string | null
          id?: string
          question_order: number[]
          questions: Json
          test_metadata_id?: string | null
          total_points: number
          version_label: string
        }
        Update: {
          answer_key?: Json
          created_at?: string | null
          id?: string
          question_order?: number[]
          questions?: Json
          test_metadata_id?: string | null
          total_points?: number
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_versions_test_metadata_id_fkey"
            columns: ["test_metadata_id"]
            isOneToOne: false
            referencedRelation: "test_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      tos: {
        Row: {
          bloom_distribution: Json
          course: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          matrix: Json
          noted_by: string | null
          period: string
          prepared_by: string | null
          school_year: string
          subject_no: string
          topics: Json
          total_items: number
          year_section: string
        }
        Insert: {
          bloom_distribution: Json
          course: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          matrix: Json
          noted_by?: string | null
          period: string
          prepared_by?: string | null
          school_year: string
          subject_no: string
          topics: Json
          total_items: number
          year_section: string
        }
        Update: {
          bloom_distribution?: Json
          course?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          matrix?: Json
          noted_by?: string | null
          period?: string
          prepared_by?: string | null
          school_year?: string
          subject_no?: string
          topics?: Json
          total_items?: number
          year_section?: string
        }
        Relationships: []
      }
      tos_collaborators: {
        Row: {
          can_edit: boolean | null
          invited_at: string | null
          tos_id: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          invited_at?: string | null
          tos_id: string
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          invited_at?: string | null
          tos_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tos_collaborators_tos_id_fkey"
            columns: ["tos_id"]
            isOneToOne: false
            referencedRelation: "tos_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      tos_entries: {
        Row: {
          course: string
          created_at: string
          created_by: string
          description: string
          distribution: Json | null
          exam_period: string
          id: string
          matrix: Json | null
          noted_by: string
          owner: string | null
          prepared_by: string
          school_year: string
          subject_no: string
          title: string
          topics: Json | null
          total_items: number
          updated_at: string
          year_section: string
        }
        Insert: {
          course: string
          created_at?: string
          created_by?: string
          description: string
          distribution?: Json | null
          exam_period: string
          id?: string
          matrix?: Json | null
          noted_by: string
          owner?: string | null
          prepared_by: string
          school_year: string
          subject_no: string
          title: string
          topics?: Json | null
          total_items: number
          updated_at?: string
          year_section: string
        }
        Update: {
          course?: string
          created_at?: string
          created_by?: string
          description?: string
          distribution?: Json | null
          exam_period?: string
          id?: string
          matrix?: Json | null
          noted_by?: string
          owner?: string | null
          prepared_by?: string
          school_year?: string
          subject_no?: string
          title?: string
          topics?: Json | null
          total_items?: number
          updated_at?: string
          year_section?: string
        }
        Relationships: []
      }
    }
    Views: {
      analytics_approval_stats: {
        Row: {
          name: string | null
          value: number | null
        }
        Relationships: []
      }
      analytics_bloom_distribution: {
        Row: {
          name: string | null
          percentage: number | null
          value: number | null
        }
        Relationships: []
      }
      analytics_creator_stats: {
        Row: {
          name: string | null
          value: number | null
        }
        Relationships: []
      }
      analytics_difficulty_spread: {
        Row: {
          name: string | null
          percentage: number | null
          value: number | null
        }
        Relationships: []
      }
      analytics_topic_analysis: {
        Row: {
          approved: number | null
          count: number | null
          topic: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_admin_role: {
        Args: { user_email: string }
        Returns: undefined
      }
      cleanup_old_presence: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_question_stats: {
        Args: { user_uuid: string }
        Returns: {
          approved_count: number
          bloom_level: string
          count: number
          difficulty: string
          knowledge_dimension: string
        }[]
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      bloom_taxonomy:
        | "remember"
        | "understand"
        | "apply"
        | "analyze"
        | "evaluate"
        | "create"
      difficulty_level: "easy" | "medium" | "hard"
      question_type: "multiple_choice" | "true_false" | "essay" | "fill_blank"
      user_role: "admin" | "teacher"
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
      bloom_taxonomy: [
        "remember",
        "understand",
        "apply",
        "analyze",
        "evaluate",
        "create",
      ],
      difficulty_level: ["easy", "medium", "hard"],
      question_type: ["multiple_choice", "true_false", "essay", "fill_blank"],
      user_role: ["admin", "teacher"],
    },
  },
} as const
