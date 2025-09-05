import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle, Users, Shield, Info } from 'lucide-react-native';

export default function HomeScreen() {
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Please log in to continue</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SecureChat</Text>
        <Text style={styles.headerSubtitle}>Profile-Only Messaging</Text>
      </View>

      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome, {user.username}!</Text>
        <Text style={styles.userIdText}>Your ID: {user.user_id}</Text>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Shield size={32} color="#25D366" />
          <Text style={styles.infoTitle}>Privacy First</Text>
          <Text style={styles.infoText}>
            No messages or files are stored in our database. Only your profile exists for contact discovery.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <MessageCircle size={32} color="#25D366" />
          <Text style={styles.infoTitle}>Peer-to-Peer</Text>
          <Text style={styles.infoText}>
            All communication happens directly between devices using end-to-end encryption.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Users size={32} color="#25D366" />
          <Text style={styles.infoTitle}>Find Contacts</Text>
          <Text style={styles.infoText}>
            Use the Contacts tab to find friends by username, ID, or QR code.
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(tabs)/contacts')}
        >
          <Users size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Find Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Text style={styles.secondaryButtonText}>View My Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Info size={16} color="#999" />
          <Text style={styles.footerText}>
            Profiles inactive for 60+ days are automatically deleted
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#25D366',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  userIdText: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  infoSection: {
    paddingHorizontal: 20,
    gap: 16,
  },
  infoCard: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});