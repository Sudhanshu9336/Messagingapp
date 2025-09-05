import 'react-native-get-random-values';
import { decode, encode } from 'base-64';
import * as Crypto from 'expo-crypto';

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
  if (!global.TextEncoder) {
    global.TextEncoder = require('util').TextEncoder;
  }
  if (!global.TextDecoder) {
    global.TextDecoder = require('util').TextDecoder;
  }
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