import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Use placeholder values if environment variables are not set
const defaultUrl = 'https://placeholder.supabase.co';
const defaultKey = 'placeholder-anon-key';

export const supabase = createClient<Database>(
  supabaseUrl || defaultUrl, 
  supabaseKey || defaultKey
);