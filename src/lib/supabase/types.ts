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
          age: number;
          gender: "male" | "female";
          weight_kg: number;
          height_cm: number;
          goal: "lose" | "maintain" | "gain";
          updated_at: string;
        };
        Insert: {
          id: string;
          age?: number;
          gender?: "male" | "female";
          weight_kg?: number;
          height_cm?: number;
          goal?: "lose" | "maintain" | "gain";
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          meal_name: string;
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
