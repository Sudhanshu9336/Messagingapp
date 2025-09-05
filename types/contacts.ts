// Local contact management types
export interface LocalContact {
  id: string;
  user_id: number;
  original_username: string;
  display_name: string; // User can customize this locally
  public_key: string;
  bio?: string;
  gender?: string;
  custom_avatar?: string; // Local custom avatar
  notes?: string; // Private notes about this contact
  is_favorite: boolean;
  created_at: string;
  last_contacted?: string;
}

export interface ContactCustomization {
  contact_id: string;
  display_name?: string;
  custom_avatar?: string;
  notes?: string;
  is_favorite?: boolean;
}