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
      // Validate username
      if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      // Check if we have valid Supabase credentials
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || 
          supabaseUrl.includes('your-project') || 
          supabaseKey.includes('your-anon-key')) {
        // Create mock user profile for demo purposes
        const userId = this.generateUserId();
        const keyPair = this.encryptionManager.generateKeyPair();
        
        const mockUser: UserProfile = {
          id: Math.random().toString(36).substring(7),
          user_id: userId,
          username,
          gender,
          bio,
          public_key: keyPair.publicKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        this.currentUser = mockUser;
        
        // Store credentials locally
        await AsyncStorage.setItem('user_session', mockUser.id);
        await AsyncStorage.setItem('private_key', keyPair.privateKey);
        await AsyncStorage.setItem('user_profile', JSON.stringify(mockUser));
        
        return mockUser;
      }

      try {
        // Check network connectivity first
        const { data: networkCheck, error: networkError } = await supabase
          .from('profiles')
          .select('count')
          .limit(1);
        
        if (networkError) {
          throw new Error('Network connection failed. Please check your internet connection.');
        }

        // Check if username already exists
        const { data: existingUser, error: searchError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', username)
          .single();

        if (searchError && searchError.code !== 'PGRST116') {
          throw new Error('Database error. Please try again.');
        }

        if (existingUser) {
          throw new Error('Username already taken. Please choose a different username.');
        }
      } catch (supabaseError) {
        // If Supabase connection fails, create mock user
        const userId = this.generateUserId();
        const keyPair = this.encryptionManager.generateKeyPair();
        
        const mockUser: UserProfile = {
          id: Math.random().toString(36).substring(7),
          user_id: userId,
          username,
          gender,
          bio,
          public_key: keyPair.publicKey,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        this.currentUser = mockUser;
        
        // Store credentials locally
        await AsyncStorage.setItem('user_session', mockUser.id);
        await AsyncStorage.setItem('private_key', keyPair.privateKey);
        await AsyncStorage.setItem('user_profile', JSON.stringify(mockUser));
        
        return mockUser;
      }

      // Generate encryption key pair with enhanced security
      const keyPair = this.encryptionManager.generateKeyPair();
      
      // Generate unique user ID and check for conflicts
      let userId: number;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        userId = this.generateUserId();
        const { data: existingId } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', userId)
          .single();
        
        if (!existingId) break;
        attempts++;
      } while (attempts < maxAttempts);
      
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique user ID. Please try again.');
      }
      
      // Create temporary session
      const sessionId = Math.random().toString(36).substring(7);
      
      // Insert user profile
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          username,
          gender,
          bio,
          public_key: keyPair.publicKey,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        if (error.code === 'PGRST116') {
          throw new Error('Unable to connect to database. Please check your internet connection and try again.');
        } else if (error.message.includes('duplicate')) {
          throw new Error('Username or ID already exists. Please try again.');
        } else {
          throw new Error(`Registration failed: ${error.message || 'Unknown database error'}`);
        }
      }

      this.currentUser = data;
      
      // Store credentials locally
      await AsyncStorage.setItem('user_session', data.id);
      await AsyncStorage.setItem('private_key', keyPair.privateKey);
      await AsyncStorage.setItem('user_profile', JSON.stringify(data));

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('Registration failed due to an unexpected error. Please try again.');
      }
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