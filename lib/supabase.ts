import { createClient } from '@supabase/supabase-js';

// Temporary mock Supabase client for development
const supabaseUrl = 'https://mock-project.supabase.co';
const supabaseKey = 'mock-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: number;
          username: string;
          gender?: string;
          avatar_url?: string;
          bio?: string;
          public_key: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: number;
          username: string;
          gender?: string;
          avatar_url?: string;
          bio?: string;
          public_key: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: number;
          username?: string;
          gender?: string;
          avatar_url?: string;
          bio?: string;
          public_key?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chats: {
        Row: {
          id: string;
          name?: string;
          is_group: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          is_group: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          is_group?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_participants: {
        Row: {
          id: string;
          chat_id: string;
          user_id: string;
          role: 'admin' | 'member';
          joined_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          user_id: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          user_id?: string;
          role?: 'admin' | 'member';
          joined_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          message_type: 'text' | 'file' | 'image' | 'audio' | 'video';
          file_url?: string;
          file_name?: string;
          file_size?: number;
          encrypted_key?: string;
          status: 'sent' | 'delivered' | 'read';
          reply_to?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          chat_id: string;
          sender_id: string;
          content: string;
          message_type?: 'text' | 'file' | 'image' | 'audio' | 'video';
          file_url?: string;
          file_name?: string;
          file_size?: number;
          encrypted_key?: string;
          status?: 'sent' | 'delivered' | 'read';
          reply_to?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          chat_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: 'text' | 'file' | 'image' | 'audio' | 'video';
          file_url?: string;
          file_name?: string;
          file_size?: number;
          encrypted_key?: string;
          status?: 'sent' | 'delivered' | 'read';
          reply_to?: string;
          created_at?: string;
        };
      };
      message_reactions: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          emoji: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          message_id?: string;
          user_id?: string;
          emoji?: string;
          created_at?: string;
        };
      };
      typing_indicators: {
        Row: {
          chat_id: string;
          user_id: string;
          is_typing: boolean;
          updated_at: string;
        };
        Insert: {
          chat_id: string;
          user_id: string;
          is_typing?: boolean;
          updated_at?: string;
        };
        Update: {
          chat_id?: string;
          user_id?: string;
          is_typing?: boolean;
          updated_at?: string;
        };
      };
    };
  };
}