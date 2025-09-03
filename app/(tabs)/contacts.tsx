import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { AuthManager, UserProfile } from '@/lib/auth';
import { ChatManager } from '@/lib/chat';
import { QRManager, QRUserData } from '@/lib/qr';
import { Search, UserPlus, QrCode, Users, MessageCircle } from 'lucide-react-native';

export default function ContactsScreen() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const authManager = AuthManager.getInstance();
  const chatManager = ChatManager.getInstance();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await authManager.searchUser(searchQuery.trim());
      // Filter out current user
      const filteredResults = results.filter(result => result.id !== user?.id);
      setSearchResults(filteredResults);
    } catch (error) {
      Alert.alert('Search Failed', 'Unable to search for users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleStartChat = async (contact: UserProfile) => {
    try {
      const chat = await chatManager.createChat([contact.id], false);
      router.push(`/chat/${chat.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to start chat');
    }
  };

  const handleQRConnect = async () => {
    if (!qrInput.trim()) {
      Alert.alert('Error', 'Please enter QR code data');
      return;
    }

    try {
      const qrData = QRManager.parseQRData(qrInput.trim());
      if (!qrData) {
        Alert.alert('Error', 'Invalid QR code data');
        return;
      }

      const contact = await authManager.getUserById(qrData.userId);
      if (!contact) {
        Alert.alert('Error', 'User not found');
        return;
      }

      if (contact.id === user?.id) {
        Alert.alert('Error', 'Cannot add yourself as a contact');
        return;
      }

      // Start chat with the user
      await handleStartChat(contact);
      setShowQRModal(false);
      setQrInput('');
    } catch (error) {
      Alert.alert('Error', 'Failed to connect with user');
    }
  };

  const renderSearchResult = ({ item }: { item: UserProfile }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleStartChat(item)}
    >
      <View style={styles.contactAvatar}>
        <Text style={styles.contactInitial}>
          {item.username.charAt(0).toUpperCase()}
        </Text>
      </View>
      
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.username}</Text>
        <Text style={styles.contactId}>ID: {item.user_id}</Text>
        {item.bio && (
          <Text style={styles.contactBio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => handleStartChat(item)}
      >
        <MessageCircle size={20} color="#25D366" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <TouchableOpacity
          style={styles.qrButton}
          onPress={() => setShowQRModal(true)}
        >
          <QrCode size={24} color="#25D366" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or User ID"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowQRModal(true)}
        >
          <QrCode size={20} color="#25D366" />
          <Text style={styles.actionButtonText}>Scan QR Code</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Users size={20} color="#25D366" />
          <Text style={styles.actionButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.id}
        style={styles.resultsList}
        ListEmptyComponent={
          searchQuery.trim() && !loading ? (
            <View style={styles.emptyContainer}>
              <UserPlus size={60} color="#ddd" />
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>
                Try searching with a different username or User ID
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showQRModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowQRModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Connect via QR Code</Text>
            <TouchableOpacity onPress={handleQRConnect}>
              <Text style={styles.modalDone}>Connect</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.qrScanArea}>
              <QrCode size={80} color="#ddd" />
              <Text style={styles.qrScanText}>
                QR Code Scanner would appear here
              </Text>
              <Text style={styles.qrScanSubtext}>
                In a real app, this would use the camera to scan QR codes
              </Text>
            </View>

            <Text style={styles.orText}>Or paste QR code data:</Text>

            <TextInput
              style={styles.qrInput}
              placeholder="Paste QR code data here"
              value={qrInput}
              onChangeText={setQrInput}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.qrHint}>
              Ask your friend to share their QR code data from their profile
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  qrButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#25D366',
    fontWeight: '500',
  },
  resultsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  contactBio: {
    fontSize: 12,
    color: '#666',
  },
  chatButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalDone: {
    fontSize: 16,
    color: '#25D366',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  qrScanArea: {
    alignItems: 'center',
    paddingVertical: 40,
    marginBottom: 30,
  },
  qrScanText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  qrScanSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  orText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  qrInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  qrHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});