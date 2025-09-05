import { supabase } from './supabase';

/**
 * Updates the user's last_activity timestamp in Supabase.
 */
export async function markActive(profileId: string) {
  try {
    await supabase.rpc('touch_last_activity', { p_profile_id: profileId });
    console.log('last_activity updated for', profileId);
  } catch (err) {
    console.error('Failed to update last activity', err);
  }
}
