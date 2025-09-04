import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthManager, UserProfile } from '@/lib/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (username: string, gender?: string, bio?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const authManager = AuthManager.getInstance();

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        const userData = await authManager.loginWithSession();
        if (isMounted) {
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (username: string, gender?: string, bio?: string) => {
    try {
      const userData = await authManager.register(username, gender, bio);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authManager.logout();
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authManager.loginWithSession();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}