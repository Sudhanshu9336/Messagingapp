import { supabase } from './supabase';
import { EncryptionManager } from './encryption';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  user_id: number;
  username: string;
  gender?: string;
  bio?: string;
  public_key: string;
  created_at: string;
  updated_at: string;
  last_activity: string;
}

export class AuthManager {
  private static instance: AuthManager;
  private currentUser: UserProfile | null = null;
  private encryptionManager: EncryptionManager;

  constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  // Generate unique 8-digit user ID
  private generateUserId(): number {
    return Math.floor(10000000 + Math.random() * 90000000);
  }

  // Validate username format
  private validateUsername(username: string): void {
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    if (username.length > 20) {
      throw new Error('Username must be less than 20 characters');
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
  }

  // Check if username is available
  private async checkUsernameAvailability(username: string): Promise<void> {
    const { data: existingUser, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error('Unable to check username availability. Please try again.');
    }

    if (existingUser) {
      throw new Error('Username already taken. Please choose a different username.');
    }
  }

  // Generate unique user ID (with collision checking)
  private async generateUniqueUserId(): Promise<number> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const userId = this.generateUserId();
      
      const { data: existingId } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!existingId) {
        return userId;
      }
      
      attempts++;
    }

    throw new Error('Unable to generate unique user ID. Please try again.');
  }

  // Create user profile in database
  private async createProfileInDatabase(
    userId: number,
    username: string,
    publicKey: string,
    gender?: string,
    bio?: string
  ): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        username,
        gender,
        bio,
        public_key: publicKey,
      })
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      if (error.code === 'PGRST116') {
        throw new Error('Unable to connect to database. Please check your internet connection.');
      } else if (error.message?.includes('duplicate')) {
        throw new Error('Username or ID already exists. Please try again.');
      } else {
        throw new Error('Failed to create user profile. Please try again.');
      }
    }

    if (!data) {
      throw new Error('Failed to create user profile. Please try again.');
    }

    return data;
  }

  // Store credentials locally
  private async storeCredentials(profile: UserProfile, privateKey: string): Promise<void> {
    await AsyncStorage.setItem('user_session', profile.id);
    await AsyncStorage.setItem('private_key', privateKey);
    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));
  }

  // Register new user
  async register(username: string, gender?: string, bio?: string): Promise<UserProfile> {
    try {
      // Validate input
      this.validateUsername(username);

      // Check username availability
      await this.checkUsernameAvailability(username);

      // Generate encryption keys
      const keyPair = this.encryptionManager.generateKeyPair();
      if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
        throw new Error('Failed to generate security keys.');
      }

      // Generate unique user ID
      const userId = await this.generateUniqueUserId();

      // Create profile in database
      const profile = await this.createProfileInDatabase(
        userId,
        username,
        keyPair.publicKey,
        gender,
        bio
      );

      // Store credentials locally
      await this.storeCredentials(profile, keyPair.privateKey);

      // Set current user
      this.currentUser = profile;

      return profile;
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Registration failed due to an unexpected error. Please try again.');
      }
    }
  }

  // Login with stored session
  async loginWithSession(): Promise<UserProfile | null> {
    try {
      const sessionId = await AsyncStorage.getItem('user_session');
      const privateKey = await AsyncStorage.getItem('private_key');
      const profileData = await AsyncStorage.getItem('user_profile');

      if (!sessionId || !privateKey || !profileData) {
        return null;
      }

      const profile = JSON.parse(profileData);
      
      // Restore encryption keys
      this.encryptionManager.setKeyPair({
        publicKey: profile.public_key,
        privateKey,
      });

      // Update last activity
      await this.updateLastActivity(profile.id);

      this.currentUser = profile;
      return profile;
    } catch (error) {
      console.error('Session login error:', error);
      return null;
    }
  }

  // Update last activity timestamp
  async updateLastActivity(profileId: string): Promise<void> {
    try {
      await supabase.rpc('update_last_activity', { profile_id: profileId });
    } catch (error) {
      console.warn('Failed to update last activity:', error);
    }
  }

  // Delete user profile
  async deleteProfile(): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      // Delete from database
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', this.currentUser.id);

      if (error) {
        throw new Error('Failed to delete profile from database');
      }

      // Clear local storage
      await this.logout();
    } catch (error) {
      throw new Error(`Profile deletion failed: ${error}`);
    }
  }

  // Search users by username or ID
  async searchUser(query: string): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,user_id.eq.${parseInt(query) || 0}`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Search failed: ${error}`);
    }
  }

  // Get user by ID
  async getUserById(userId: number): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) return null;
      return data;
    } catch (error) {
      return null;
    }
  }

  // Get current user
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  // Logout and clear session
  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['user_session', 'private_key', 'user_profile']);
      this.currentUser = null;
    } catch (error) {
      throw new Error(`Logout failed: ${error}`);
    }
  }

  // Cleanup inactive profiles (admin function)
  static async cleanupInactiveProfiles(): Promise<void> {
    try {
      await supabase.rpc('cleanup_inactive_profiles');
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}