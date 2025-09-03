import { supabase } from './supabase';
import { EncryptionManager } from './encryption';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  user_id: number;
  username: string;
  gender?: string;
  avatar_url?: string;
  bio?: string;
  public_key: string;
  created_at: string;
  updated_at: string;
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

  // Generate unique user ID
  private generateUserId(): number {
    return Math.floor(10000000 + Math.random() * 90000000); // 8-digit ID
  }

  // Register new user
  async register(username: string, gender?: string, bio?: string): Promise<UserProfile> {
    try {
      // Generate encryption key pair
      const keyPair = this.encryptionManager.generateKeyPair();
      
      // Generate unique user ID
      const userId = this.generateUserId();
      
      // Create temporary session
      const sessionId = Math.random().toString(36).substring(7);
      
      // Insert user profile
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: sessionId,
          user_id: userId,
          username,
          gender,
          bio,
          public_key: keyPair.publicKey,
        })
        .select()
        .single();

      if (error) throw error;

      this.currentUser = data;
      
      // Store credentials locally
      await AsyncStorage.setItem('user_session', sessionId);
      await AsyncStorage.setItem('private_key', keyPair.privateKey);
      await AsyncStorage.setItem('user_profile', JSON.stringify(data));

      return data;
    } catch (error) {
      throw new Error(`Registration failed: ${error}`);
    }
  }

  // Login with session
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

      this.currentUser = profile;
      return profile;
    } catch (error) {
      return null;
    }
  }

  // Search user by username or ID
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

  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['user_session', 'private_key', 'user_profile']);
      this.currentUser = null;
    } catch (error) {
      throw new Error(`Logout failed: ${error}`);
    }
  }
}