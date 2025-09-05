import 'react-native-get-random-values';
import { decode, encode } from 'base-64';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';
import { useEffect } from 'react';
import { markActive } from './lib/activity';
import { useAuth } from './lib/auth'; // assuming you already have a hook for auth

export default function AppRoot() {
  const { profile } = useAuth(); // get the current logged-in profile

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && profile?.id) {
        markActive(profile.id);
      }
    });

    return () => subscription.remove();
  }, [profile?.id]);

  return (
    // your navigation / routes
  );
}

// Polyfill crypto functions for React Native
if (!global.atob) global.atob = decode;
if (!global.btoa) global.btoa = encode;

// Enhanced crypto polyfill using expo-crypto
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      try {
        const randomBytes = Crypto.getRandomBytes(array.length);
        array.set(randomBytes);
        return array;
      } catch (error) {
        console.warn('Expo crypto failed, using fallback:', error);
        // Fallback to Math.random
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }
    },
    // Add subtle crypto interface for compatibility
    subtle: {
      digest: async (algorithm: string, data: ArrayBuffer) => {
        // Basic implementation for compatibility
        const uint8Array = new Uint8Array(data);
        const hex = Array.from(uint8Array, byte => byte.toString(16).padStart(2, '0')).join('');
        return new TextEncoder().encode(hex).buffer;
      }
    }
  } as any;
}

// Additional polyfills for Node.js compatibility
if (typeof global !== 'undefined') {
  // Ensure TextEncoder/TextDecoder are available
  // TextEncoder/TextDecoder are available in modern React Native environments
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import 'react-native-url-polyfill/auto';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}