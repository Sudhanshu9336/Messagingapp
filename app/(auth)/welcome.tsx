import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Users, Shield, Zap } from 'lucide-react-native';

export default function WelcomeScreen() {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MessageCircle size={80} color="#25D366" />
        <Text style={styles.title}>SecureChat</Text>
        <Text style={styles.subtitle}>
          Private, secure messaging with end-to-end encryption
        </Text>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Shield size={32} color="#25D366" />
          <Text style={styles.featureTitle}>End-to-End Encryption</Text>
          <Text style={styles.featureText}>
            Your messages are secured with military-grade encryption
          </Text>
        </View>

        <View style={styles.feature}>
          <Users size={32} color="#25D366" />
          <Text style={styles.featureTitle}>Group Chats</Text>
          <Text style={styles.featureText}>
            Create groups and chat with multiple people securely
          </Text>
        </View>

        <View style={styles.feature}>
          <Zap size={32} color="#25D366" />
          <Text style={styles.featureTitle}>File Sharing</Text>
          <Text style={styles.featureText}>
            Share any type of file with encrypted protection
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/register')}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#25D366',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  features: {
    flex: 0.4,
    paddingVertical: 40,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 15,
    flex: 1,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 15,
    flex: 2,
    marginTop: 2,
  },
  actions: {
    flex: 0.2,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },
  primaryButton: {
    backgroundColor: '#25D366',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});