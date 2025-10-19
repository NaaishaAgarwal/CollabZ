import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          industries: string[];
          interests: string[];
          skills: Array<{ name: string; level: string }>;
          commitment_level: string | null;
          looking_for: string | null;
          project_stage: string | null;
          project_idea: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          industries?: string[];
          interests?: string[];
          skills?: Array<{ name: string; level: string }>;
          commitment_level?: string | null;
          looking_for?: string | null;
          project_stage?: string | null;
          project_idea?: string | null;
        };
        Update: {
          username?: string;
          full_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          industries?: string[];
          interests?: string[];
          skills?: Array<{ name: string; level: string }>;
          commitment_level?: string | null;
          looking_for?: string | null;
          project_stage?: string | null;
          project_idea?: string | null;
        };
      };
      interactions: {
        Row: {
          id: string;
          user_id: string;
          target_user_id: string;
          interaction_type: 'like' | 'reject';
          is_match: boolean;
          created_at: string;
        };
        Insert: {
          user_id: string;
          target_user_id: string;
          interaction_type: 'like' | 'reject';
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          read: boolean;
          created_at: string;
        };
        Insert: {
          sender_id: string;
          receiver_id: string;
          content: string;
        };
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
        };
      };
      connection_requests: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          message: string | null;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sender_id: string;
          receiver_id: string;
          message?: string | null;
        };
      };
    };
  };
};
