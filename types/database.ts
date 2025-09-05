export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: number;
          username: string;
          gender?: string;
          bio?: string;
          public_key: string;
          created_at: string;
          updated_at: string;
          last_activity: string;
        };
        Insert: {
          id?: string;
          user_id: number;
          username: string;
          gender?: string;
          bio?: string;
          public_key: string;
          created_at?: string;
          updated_at?: string;
          last_activity?: string;
        };
        Update: {
          id?: string;
          user_id?: number;
          username?: string;
          gender?: string;
          bio?: string;
          public_key?: string;
          created_at?: string;
          updated_at?: string;
          last_activity?: string;
        };
      };
    };
    Functions: {
      cleanup_inactive_profiles: {
        Args: {};
        Returns: void;
      };
      update_last_activity: {
        Args: {
          profile_id: string;
        };
        Returns: void;
      };
    };
  };
}