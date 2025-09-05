import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate credentials
if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials are missing in environment variables. Using fallback configuration for development.');
}

// Create client with error handling
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    }
  }
);