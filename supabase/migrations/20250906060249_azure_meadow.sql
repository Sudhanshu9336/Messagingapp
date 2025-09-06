/*
  # Rename cleanup functions to avoid overloading conflicts

  This migration renames the overloaded cleanup_inactive_profiles functions
  to have distinct names, resolving Supabase RPC ambiguity issues.

  ## Changes
  1. Rename cleanup_inactive_profiles() to cleanup_inactive_profiles_default()
  2. Rename cleanup_inactive_profiles(p_cutoff interval) to cleanup_inactive_profiles_with_cutoff(p_cutoff interval)

  ## Background
  Supabase RPC cannot handle function overloading properly when functions have
  the same name but different parameters. This causes PGRST203 errors when
  the client tries to call the functions.
*/

-- Rename the no-parameter version
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'cleanup_inactive_profiles'
    AND p.pronargs = 0
  ) THEN
    ALTER FUNCTION public.cleanup_inactive_profiles() 
    RENAME TO cleanup_inactive_profiles_default;
  END IF;
END $$;

-- Rename the parameter version
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'cleanup_inactive_profiles'
    AND p.pronargs = 1
  ) THEN
    ALTER FUNCTION public.cleanup_inactive_profiles(p_cutoff interval) 
    RENAME TO cleanup_inactive_profiles_with_cutoff;
  END IF;
END $$;