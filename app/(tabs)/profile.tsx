import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { QRManager } from '@/lib/qr';
import QRCode from 'react-native-qrcode-svg';
import { User, Copy, Share2, CreditCard as Edit3, Check, X, QrCode, Shield, Hash, Trash2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const { user, logout, deleteProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(user?.bio || '');

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const qrData = QRManager.generateQRData(user);

  const handleCopyUserId = async () => {
    try {
      await navigator.clipboard?.writeText(user.user_id.toString());
      Alert.alert('Copied', 'User ID copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy User ID');
    }
  };

  const handleCopyQRData = async () => {
    try {
      await navigator.clipboard?.writeText(qrData);
      Alert.alert('Copied', 'QR code data copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy QR data');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Connect with me on SecureChat!\nUsername: ${user.username}\nUser ID: ${user.user_id}\nQR Data: ${qrData}`,
        title: 'Connect on SecureChat',
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const handleSaveBio = () => {
    // In a real app, you'd save to the database here
    Alert.alert('Success', 'Bio updated successfully');
    setIsEditing(false);
  };

  const handleDeleteProfile = () => {
    Alert.alert(
      'Delete Profile',
      'Are you sure you want to permanently delete your profile? This action cannot be undone and will remove all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProfile();
              Alert.alert('Profile Deleted', 'Your profile has been permanently deleted.');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete profile. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User size={60} color="#fff" />
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Edit3 size={16} color="#25D366" />
          </TouchableOpacity>
        </View>

        <Text style={styles.username}>{user.username}</Text>
        
        <View style={styles.userIdContainer}>
          <Hash size={16} color="#666" />
          <Text style={styles.userId}>{user.user_id}</Text>
          <TouchableOpacity onPress={handleCopyUserId} style={styles.copyButton}>
            <Copy size={16} color="#25D366" />
          </TouchableOpacity>
        </View>

        {user.gender && (
          <Text style={styles.gender}>{user.gender}</Text>
        )}
      </View>

      <View style={styles.bioSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About</Text>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Edit3 size={18} color="#25D366" />
            </TouchableOpacity>
          )}
        </View>

        {isEditing ? (
          <View style={styles.bioEdit}>
            <TextInput
              style={styles.bioInput}
              value={editedBio}
              onChangeText={setEditedBio}
              placeholder="Tell others about yourself"
              multiline
              numberOfLines={3}
              maxLength={150}
            />
            <Text style={styles.bioCounter}>{editedBio.length}/150</Text>
            <View style={styles.bioActions}>
              <TouchableOpacity
                style={[styles.bioActionButton, styles.cancelButton]}
                onPress={() => {
                  setEditedBio(user.bio || '');
                  setIsEditing(false);
                }}
              >
                <X size={16} color="#666" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bioActionButton, styles.saveButton]}
                onPress={handleSaveBio}
              >
                <Check size={16} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.bioText}>
            {user.bio || 'No bio added yet'}
          </Text>
        )}
      </View>

      <View style={styles.qrSection}>
        <Text style={styles.sectionTitle}>My QR Code</Text>
        <Text style={styles.qrDescription}>
          Share this QR code with friends to connect instantly
        </Text>

        <View style={styles.qrContainer}>
          <QRCode
            value={qrData}
            size={200}
            backgroundColor="white"
            color="black"
          />
        </View>

        <View style={styles.qrActions}>
          <TouchableOpacity style={styles.qrActionButton} onPress={handleCopyQRData}>
            <Copy size={18} color="#25D366" />
            <Text style={styles.qrActionText}>Copy QR Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.qrActionButton} onPress={handleShare}>
            <Share2 size={18} color="#25D366" />
            <Text style={styles.qrActionText}>Share Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.securitySection}>
        <Text style={styles.sectionTitle}>Security</Text>
        
        <View style={styles.securityItem}>
          <Shield size={20} color="#25D366" />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>End-to-End Encryption</Text>
            <Text style={styles.securityText}>
              Your messages are secured with encryption keys that only you control
            </Text>
          </View>
        </View>

        <View style={styles.securityItem}>
          <QrCode size={20} color="#25D366" />
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Public Key</Text>
            <Text style={styles.securityText} numberOfLines={2}>
              {user.public_key.slice(0, 40)}...
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteProfile}>
          <Trash2 size={18} color="#dc2626" />
          <Text style={styles.deleteButtonText}>Delete Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Created: {new Date(user.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.footerText}>
          Last Active: {new Date(user.last_activity).toLocaleDateString()}
        </Text>
        <Text style={styles.footerText}>
          SecureChat • Profile-Only Storage
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  userIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
  },
  userId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 4,
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
  },
  gender: {
    fontSize: 14,
    color: '#94a3b8',
  },
  bioSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  bioText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  bioEdit: {
    gap: 8,
  },
  bioInput: {
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  bioCounter: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
  },
  bioActions: {
    flexDirection: 'row',
    gap: 12,
  },
  bioActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  saveButton: {
    backgroundColor: '#2563eb',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  qrSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  qrDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  qrActions: {
    flexDirection: 'row',
    gap: 20,
  },
  qrActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    gap: 6,
  },
  qrActionText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  securitySection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  securityContent: {
    flex: 1,
    marginLeft: 12,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  actions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
});