import 'react-native-get-random-values';
import { decode, encode } from 'base-64';
import * as Crypto from 'expo-crypto';

// Polyfill crypto functions for React Native
if (!global.atob) global.atob = decode;
if (!global.btoa) global.btoa = encode;

// Polyfill crypto.getRandomValues using expo-crypto
if (!global.crypto) {
  global.crypto = {
    getRandomValues: (array: Uint8Array) => {
      const randomBytes = Crypto.getRandomBytes(array.length);
      array.set(randomBytes);
      return array;
    },
  } as any;
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/contexts/AuthContext';
import 'react-native-url-polyfill/auto'
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