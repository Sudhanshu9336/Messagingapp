/*
  # Remove Username Uniqueness Constraint

  1. Database Changes
    - Remove unique constraint from username column
    - Allow multiple users to have the same display name
    - Keep user_id as the primary unique identifier

  2. Rationale
    - Users are identified by unique tokens/IDs, not usernames
    - Display names can be customized locally by contacts
    - Multiple users can have the same display name
*/

-- Remove unique constraint from username if it exists
DO $$
BEGIN
  -- Drop unique constraint on username
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_username_key' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_username_key;
  END IF;
  
  -- Also check for any unique index on username
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'profiles_username_key' 
    AND tablename = 'profiles'
  ) THEN
    DROP INDEX profiles_username_key;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if constraint doesn't exist
    NULL;
END $$;

-- Ensure user_id remains unique (this should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_user_id_key' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if already exists
    NULL;
END $$;