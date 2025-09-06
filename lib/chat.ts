import { supabase } from './supabase';
import { EncryptionManager } from './encryption';
import { AuthManager, UserProfile } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markActive } from './activity';

export interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  created_by: string;
  participants: string[]; // Array of profile IDs
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  left_at?: string;
  profile?: UserProfile;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message_type: 'text' | 'file' | 'image' | 'audio' | 'video';
  file_name?: string;
  file_size?: number;
  reply_to?: string;
  created_at: string;
  expires_at: string;
  content?: string; // Decrypted content (not stored in DB)
  status?: MessageStatus[];
}

export interface MessageStatus {
  id: string;
  message_id: string;
  user_id: string;
  status: 'sent' | 'delivered' | 'seen';
  updated_at: string;
}

export interface PendingMessage {
  id: string;
  chat_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'audio' | 'video';
  file_data?: string;
  file_name?: string;
  retry_count: number;
  created_at: string;
}

export class ChatManager {
  private static instance: ChatManager;
  private encryptionManager: EncryptionManager;
  private authManager: AuthManager;
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private chats: Map<string, Chat> = new Map();
  private messages: Map<string, Message[]> = new Map();
  private retryTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
    this.authManager = AuthManager.getInstance();
    this.loadChatsFromStorage();
    this.startRetryMechanism();
  }

  static getInstance(): ChatManager {
    if (!ChatManager.instance) {
      ChatManager.instance = new ChatManager();
    }
    return ChatManager.instance;
  }

  // Load chats from local storage
  private async loadChatsFromStorage(): Promise<void> {
    try {
      const chatsData = await AsyncStorage.getItem('local_chats');
      const messagesData = await AsyncStorage.getItem('local_messages');
      
      if (chatsData) {
        const chatsArray: Chat[] = JSON.parse(chatsData);
        chatsArray.forEach(chat => {
          this.chats.set(chat.id, chat);
        });
      }
      
      if (messagesData) {
        const messagesMap: Record<string, Message[]> = JSON.parse(messagesData);
        Object.entries(messagesMap).forEach(([chatId, messages]) => {
          this.messages.set(chatId, messages);
        });
      }
    } catch (error) {
      console.error('Failed to load chats from storage:', error);
    }
  }

  // Save chats to local storage
  private async saveChatsToStorage(): Promise<void> {
    try {
      const chatsArray = Array.from(this.chats.values());
      const messagesMap: Record<string, Message[]> = {};
      
      this.messages.forEach((messages, chatId) => {
        messagesMap[chatId] = messages;
      });
      
      await AsyncStorage.setItem('local_chats', JSON.stringify(chatsArray));
      await AsyncStorage.setItem('local_messages', JSON.stringify(messagesMap));
    } catch (error) {
      console.error('Failed to save chats to storage:', error);
    }
  }

  // Start retry mechanism for failed messages
  private startRetryMechanism(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
    }

    this.retryTimer = setInterval(async () => {
      await this.retryPendingMessages();
    }, 30000); // Retry every 30 seconds
  }

  // Load pending messages from storage
  private async loadPendingMessages(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('pending_messages');
      if (stored) {
        const messages: PendingMessage[] = JSON.parse(stored);
        messages.forEach(msg => {
          this.pendingMessages.set(msg.id, msg);
        });
      }
    } catch (error) {
      console.error('Failed to load pending messages:', error);
    }
  }

  // Save pending messages to storage
  private async savePendingMessages(): Promise<void> {
    try {
      const messages = Array.from(this.pendingMessages.values());
      await AsyncStorage.setItem('pending_messages', JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save pending messages:', error);
    }
  }

  // Retry sending pending messages
  private async retryPendingMessages(): Promise<void> {
    const messages = Array.from(this.pendingMessages.values());
    
    for (const message of messages) {
      if (message.retry_count < 5) { // Max 5 retries
        try {
          await this.sendMessage(
            message.chat_id,
            message.content,
            message.message_type,
            message.file_data,
            message.file_name
          );
          
          // Remove from pending if successful
          this.pendingMessages.delete(message.id);
        } catch (error) {
          // Increment retry count
          message.retry_count++;
          this.pendingMessages.set(message.id, message);
        }
      } else {
        // Remove after max retries
        this.pendingMessages.delete(message.id);
      }
    }

    await this.savePendingMessages();
  }

  // Create a new chat
  async createChat(participantIds: string[], isGroup: boolean = false, name?: string): Promise<Chat> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Validate participant IDs - they should be profile UUIDs
      if (!participantIds || participantIds.length === 0) {
        throw new Error('At least one participant is required');
      }

      // Verify participants exist in the database
      const { data: participants, error: participantsError } = await supabase
        .from('profiles')
        .select('id, username, public_key')
        .in('id', participantIds);

      if (participantsError) {
        console.error('Error fetching participants:', participantsError);
        throw new Error('Failed to verify participants');
      }

      if (!participants || participants.length !== participantIds.length) {
        throw new Error('One or more participants not found');
      }

      // For direct messages, check if chat already exists
      if (!isGroup && participantIds.length === 1) {
        const existingChat = this.findExistingDirectChat(currentUser.id, participantIds[0]);
        if (existingChat) {
          return existingChat;
        }
      }

      // Create new chat
      const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const allParticipants = [currentUser.id, ...participantIds];

      const newChat: Chat = {
        id: chatId,
        name: isGroup ? name : undefined,
        is_group: isGroup,
        created_by: currentUser.id,
        participants: allParticipants,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store chat locally
      this.chats.set(chatId, newChat);
      this.messages.set(chatId, []);
      
      // Save to storage
      await this.saveChatsToStorage();

      // Mark user as active
      await markActive(currentUser.id);

      return newChat;
    } catch (error) {
      console.error('Chat creation error:', error);
      throw new Error(`Failed to create chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Find existing direct chat between two users
  private findExistingDirectChat(userId1: string, userId2: string): Chat | null {
    for (const chat of this.chats.values()) {
      if (!chat.is_group && 
          chat.participants.length === 2 &&
          chat.participants.includes(userId1) && 
          chat.participants.includes(userId2)) {
        return chat;
      }
    }
    return null;
  }

  // Send a message
  async sendMessage(
    chatId: string,
    content: string,
    messageType: 'text' | 'file' | 'image' | 'audio' | 'video' = 'text',
    fileData?: string,
    fileName?: string
  ): Promise<Message> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Get chat
      const chat = this.chats.get(chatId);
      if (!chat) {
        throw new Error('Chat not found');
      }

      // Verify user is participant
      if (!chat.participants.includes(currentUser.id)) {
        throw new Error('User is not a participant in this chat');
      }

      // Get participant public keys for encryption
      const { data: participantProfiles } = await supabase
        .from('profiles')
        .select('id, public_key')
        .in('id', chat.participants.filter(id => id !== currentUser.id));

      const participantKeys = participantProfiles?.map(p => p.public_key) || [];

      // Encrypt message content
      const encryptedContent = this.encryptionManager.encryptMessage(
        content,
        chatId,
        participantKeys
      );

      // Handle file encryption if needed
      let encryptedFileData: string | undefined;
      let fileKey: string | undefined;

      if (fileData && messageType !== 'text') {
        const fileEncryption = this.encryptionManager.encryptFile(fileData);
        encryptedFileData = fileEncryption.encrypted;
        fileKey = fileEncryption.key;
      }

      // Create message
      const message: Message = {
        id: messageId,
        chat_id: chatId,
        sender_id: currentUser.id,
        message_type: messageType,
        file_name: fileName,
        file_size: fileData ? fileData.length : undefined,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        content, // Store decrypted content locally for sender
      };

      // Add message to local storage
      const chatMessages = this.messages.get(chatId) || [];
      chatMessages.push(message);
      this.messages.set(chatId, chatMessages);

      // Update chat's last message
      chat.last_message = content.substring(0, 100);
      chat.last_message_at = message.created_at;
      chat.updated_at = message.created_at;
      this.chats.set(chatId, chat);

      // Save to storage
      await this.saveChatsToStorage();

      // Mark user active after sending
      await markActive(currentUser.id);

      return message;
    } catch (error) {
      // Add to pending messages for retry
      const pendingMessage: PendingMessage = {
        id: messageId,
        chat_id: chatId,
        content,
        message_type: messageType,
        file_data: fileData,
        file_name: fileName,
        retry_count: 0,
        created_at: new Date().toISOString(),
      };

      this.pendingMessages.set(messageId, pendingMessage);
      await this.savePendingMessages();

      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update message status (delivered/seen)
  async updateMessageStatus(messageId: string, status: 'delivered' | 'seen'): Promise<void> {
    // In local storage mode, we don't track message status
    // This could be implemented with local storage if needed
  }

  // Get chat messages
  async getChatMessages(chatId: string, limit: number = 50): Promise<Message[]> {
    try {
      const messages = this.messages.get(chatId) || [];
      return messages
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  // Get user's chats
  async getUserChats(): Promise<Chat[]> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) return [];

    try {
      // Filter chats where current user is a participant
      const userChats = Array.from(this.chats.values())
        .filter(chat => chat.participants.includes(currentUser.id))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      return userChats;
    } catch (error) {
      console.error('Failed to get chats:', error);
      return [];
    }
  }

  // Add member to group chat
  async addGroupMember(chatId: string, userId: string): Promise<void> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const chat = this.chats.get(chatId);
      if (!chat) throw new Error('Chat not found');

      if (!chat.is_group) throw new Error('Cannot add members to direct chat');
      if (chat.created_by !== currentUser.id) throw new Error('Only chat creator can add members');

      // Verify user exists
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (!userProfile) throw new Error('User not found');

      // Add to participants if not already present
      if (!chat.participants.includes(userId)) {
        chat.participants.push(userId);
        chat.updated_at = new Date().toISOString();
        this.chats.set(chatId, chat);
        await this.saveChatsToStorage();
      }
    } catch (error) {
      throw new Error(`Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Remove member from group chat
  async removeGroupMember(chatId: string, userId: string): Promise<void> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const chat = this.chats.get(chatId);
      if (!chat) throw new Error('Chat not found');

      if (!chat.is_group) throw new Error('Cannot remove members from direct chat');
      if (chat.created_by !== currentUser.id) throw new Error('Only chat creator can remove members');

      // Remove from participants
      chat.participants = chat.participants.filter(id => id !== userId);
      chat.updated_at = new Date().toISOString();
      this.chats.set(chatId, chat);
      await this.saveChatsToStorage();
    } catch (error) {
      throw new Error(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Subscribe to chat updates (mock implementation for local storage)
  subscribeToChat(chatId: string, onMessage: (message: any) => void): () => void {
    // In a real implementation, this would use WebSockets or Server-Sent Events
    // For now, return a no-op unsubscribe function
    return () => {};
  }

  // Cleanup expired messages
  static async cleanupExpiredMessages(): Promise<void> {
    // This would clean up messages older than their expiry date
    // Implementation depends on storage strategy
  }

  // Clear all pending messages
  async clearPendingMessages(): Promise<void> {
    this.pendingMessages.clear();
    await AsyncStorage.removeItem('pending_messages');
  }

  // Get pending messages count
  getPendingMessagesCount(): number {
    return this.pendingMessages.size;
  }

  // Clear all chats (for logout)
  async clearAllChats(): Promise<void> {
    this.chats.clear();
    this.messages.clear();
    this.pendingMessages.clear();
    await AsyncStorage.multiRemove(['local_chats', 'local_messages', 'pending_messages']);
  }

  // Destroy chat manager
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.pendingMessages.clear();
  }
}