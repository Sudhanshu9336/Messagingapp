/*
  # Fix Database Function Permissions

  1. Grant Execute Permissions
    - Allow authenticated users to execute cleanup_inactive_profiles function
    - Allow authenticated users to execute update_last_activity function

  2. Security
    - Ensure functions can be called by the application
*/

-- Grant execute permissions for cleanup function
GRANT EXECUTE ON FUNCTION cleanup_inactive_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_inactive_profiles() TO anon;

-- Grant execute permissions for update activity function  
GRANT EXECUTE ON FUNCTION update_last_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_last_activity(uuid) TO anon;