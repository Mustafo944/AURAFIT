// supabase/schema.sql bilan qo'lda mos qilib yozilgan tur ta'riflari
// (Supabase CLI orqali avtomatik generatsiya qilingan emas).

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: string;
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          age: number;
          gender: "male" | "female";
          weight_kg: number;
          height_cm: number;
          goal: "lose" | "maintain" | "gain";
          target_weight_kg: number | null;
          avatar_url: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name?: string;
          last_name?: string;
          age?: number;
          gender?: "male" | "female";
          weight_kg?: number;
          height_cm?: number;
          goal?: "lose" | "maintain" | "gain";
          target_weight_kg?: number | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      body_weight_logs: {
        Row: {
          id: string;
          user_id: string;
          weight_kg: number;
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight_kg: number;
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["body_weight_logs"]["Insert"]>;
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          meal_name: string;
          meal_type: "breakfast" | "lunch" | "dinner" | "snack";
          calories: number;
          protein_g: number;
          fat_g: number;
          carb_g: number;
          items: string[];
          logged_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_name: string;
          meal_type?: "breakfast" | "lunch" | "dinner" | "snack";
          calories: number;
          protein_g: number;
          fat_g: number;
          carb_g: number;
          items: string[];
          logged_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meals"]["Insert"]>;
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          finished_at: string;
          exercises: unknown;
          cardio: unknown;
          total_volume_kg: number;
          total_sets: number;
          calories_burned: number;
          recovery_advice: string | null;
          progress_advice: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at: string;
          finished_at: string;
          exercises: unknown;
          cardio?: unknown;
          total_volume_kg: number;
          total_sets: number;
          calories_burned: number;
          recovery_advice?: string | null;
          progress_advice?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["workout_sessions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
