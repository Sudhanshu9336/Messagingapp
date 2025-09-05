/*
  # Create Missing Database Functions

  1. Functions
    - `cleanup_inactive_profiles()` - Remove profiles inactive for 60+ days
    - `update_last_activity(uuid)` - Update user's last activity timestamp

  2. Security
    - Grant execute permissions to authenticated and anonymous users
    - Ensure functions can be called by the application
*/

-- Function to cleanup inactive profiles (60+ days)
CREATE OR REPLACE FUNCTION cleanup_inactive_profiles()
RETURNS void AS $$
BEGIN
  DELETE FROM profiles 
  WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '60 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last activity timestamp
CREATE OR REPLACE FUNCTION update_last_activity(profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET last_activity = CURRENT_TIMESTAMP 
  WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_inactive_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_profiles() TO anon;
GRANT EXECUTE ON FUNCTION update_last_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_activity(uuid) TO anon;