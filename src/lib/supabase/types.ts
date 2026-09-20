/**
 * Database types matching supabase/migrations/20260320120000_init_game_schema.sql
 * Keep in sync when the schema changes.
 */

export type WordTier = "common" | "familiar" | "rare";
export type GameMode = "daily" | "stages" | "challenge";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      words: {
        Row: {
          id: number;
          word: string;
          tier: WordTier;
          is_answer: boolean;
          is_guessable: boolean;
          created_at: string;
        };
        Insert: {
          word: string;
          tier?: WordTier;
          is_answer?: boolean;
          is_guessable?: boolean;
          created_at?: string;
        };
        Update: {
          word?: string;
          tier?: WordTier;
          is_answer?: boolean;
          is_guessable?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_puzzles: {
        Row: {
          date_key: string;
          puzzle_number: number;
          word_id: number;
          created_at: string;
        };
        Insert: {
          date_key: string;
          puzzle_number: number;
          word_id: number;
          created_at?: string;
        };
        Update: {
          date_key?: string;
          puzzle_number?: number;
          word_id?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "daily_puzzles_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: false;
            referencedRelation: "words";
            referencedColumns: ["id"];
          },
        ];
      };
      challenges: {
        Row: {
          code: string;
          word_id: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          code: string;
          word_id: number;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          code?: string;
          word_id?: number;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenges_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: false;
            referencedRelation: "words";
            referencedColumns: ["id"];
          },
        ];
      };
      game_results: {
        Row: {
          id: string;
          user_id: string;
          mode: GameMode;
          date_key: string | null;
          stage_level: number | null;
          challenge_code: string | null;
          won: boolean;
          guesses: number;
          hard_mode: boolean;
          duration_ms: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: GameMode;
          date_key?: string | null;
          stage_level?: number | null;
          challenge_code?: string | null;
          won: boolean;
          guesses: number;
          hard_mode?: boolean;
          duration_ms?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: GameMode;
          date_key?: string | null;
          stage_level?: number | null;
          challenge_code?: string | null;
          won?: boolean;
          guesses?: number;
          hard_mode?: boolean;
          duration_ms?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      leaderboard_scores: {
        Row: {
          user_id: string;
          wins: number;
          played: number;
          current_streak: number;
          max_streak: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          wins?: number;
          played?: number;
          current_streak?: number;
          max_streak?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          wins?: number;
          played?: number;
          current_streak?: number;
          max_streak?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      daily_puzzles_public: {
        Row: {
          date_key: string;
          puzzle_number: number;
          created_at: string;
        };
        Relationships: [];
      };
      leaderboard_public: {
        Row: {
          user_id: string;
          display_name: string | null;
          wins: number;
          played: number;
          current_streak: number;
          max_streak: number;
          updated_at: string;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
