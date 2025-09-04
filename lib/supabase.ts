import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set up your Supabase connection.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);