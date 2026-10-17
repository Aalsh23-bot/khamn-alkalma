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
      analytics_events: {
        Row: {
          id: string;
          created_at: string;
          device_id: string;
          name: string;
          payload: Record<string, unknown>;
          app_version: string | null;
          platform: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          device_id: string;
          name: string;
          payload?: Record<string, unknown>;
          app_version?: string | null;
          platform?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          device_id?: string;
          name?: string;
          payload?: Record<string, unknown>;
          app_version?: string | null;
          platform?: string | null;
        };
        Relationships: [];
      };
      ad_reports: {
        Row: {
          id: string;
          created_at: string;
          device_id: string;
          reason: string;
          note: string | null;
          app_version: string | null;
          platform: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          device_id: string;
          reason: string;
          note?: string | null;
          app_version?: string | null;
          platform?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          device_id?: string;
          reason?: string;
          note?: string | null;
          app_version?: string | null;
          platform?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      app_config: {
        Row: {
          key: string;
          value: Record<string, unknown> | boolean | string | number | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Record<string, unknown> | boolean | string | number | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Record<string, unknown> | boolean | string | number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      hint_balances: {
        Row: {
          device_id: string;
          user_id: string | null;
          balance: number;
          updated_at: string;
        };
        Insert: {
          device_id: string;
          user_id?: string | null;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          device_id?: string;
          user_id?: string | null;
          balance?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      hint_purchase_ledger: {
        Row: {
          transaction_id: string;
          product_id: string;
          store_product_id: string | null;
          hints_added: number;
          device_id: string;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          transaction_id: string;
          product_id: string;
          store_product_id?: string | null;
          hints_added: number;
          device_id: string;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          transaction_id?: string;
          product_id?: string;
          store_product_id?: string | null;
          hints_added?: number;
          device_id?: string;
          user_id?: string | null;
          created_at?: string;
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
    Functions: {
      get_daily_meta: {
        Args: { p_date?: string };
        Returns: unknown;
      };
      submit_daily_result: {
        Args: {
          p_guesses: string[];
          p_won: boolean;
          p_hard_mode?: boolean;
          p_duration_ms?: number | null;
        };
        Returns: unknown;
      };
      create_friend_challenge: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      join_friend_challenge: {
        Args: { p_code: string };
        Returns: unknown;
      };
      get_challenge_lobby: {
        Args: { p_code: string };
        Returns: unknown;
      };
      submit_challenge_result: {
        Args: { p_code: string; p_guesses: string[]; p_won: boolean };
        Returns: unknown;
      };
      rematch_friend_challenge: {
        Args: { p_code: string };
        Returns: unknown;
      };
      get_friend_challenge: {
        Args: { p_code: string };
        Returns: unknown;
      };
      get_leaderboard: {
        Args: { p_limit?: number };
        Returns: unknown;
      };
      get_lexicon_snapshot: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      is_app_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      admin_list_words: {
        Args: {
          p_search?: string | null;
          p_limit?: number;
          p_offset?: number;
          p_active_only?: boolean | null;
        };
        Returns: unknown;
      };
      admin_upsert_word: {
        Args: {
          p_word: string;
          p_tier?: string;
          p_is_answer?: boolean;
          p_is_guessable?: boolean;
          p_active?: boolean;
          p_notes?: string | null;
        };
        Returns: unknown;
      };
      admin_set_word_flags: {
        Args: {
          p_id: number;
          p_is_answer?: boolean | null;
          p_is_guessable?: boolean | null;
          p_active?: boolean | null;
          p_tier?: string | null;
          p_notes?: string | null;
        };
        Returns: unknown;
      };
      delete_own_account: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      get_hint_balance: {
        Args: Record<string, never>;
        Returns: number;
      };
      spend_hint_balance: {
        Args: Record<string, never>;
        Returns: number;
      };
      credit_hint_purchase: {
        Args: {
          p_transaction_id: string;
          p_product_id: string;
          p_store_product_id: string;
          p_hints: number;
          p_device_id?: string | null;
        };
        Returns: number;
      };
      credit_hint_purchase_for_user: {
        Args: {
          p_user_id: string;
          p_transaction_id: string;
          p_product_id: string;
          p_store_product_id: string;
          p_hints: number;
          p_device_id?: string | null;
        };
        Returns: number;
      };
      get_app_config_bool: {
        Args: { p_key: string; p_default?: boolean };
        Returns: boolean;
      };
      submit_ad_report: {
        Args: {
          p_device_id: string;
          p_reason: string;
          p_note?: string | null;
          p_app_version?: string | null;
          p_platform?: string | null;
        };
        Returns: unknown;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
