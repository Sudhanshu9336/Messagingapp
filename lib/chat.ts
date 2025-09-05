import { supabase } from './supabase';
import { EncryptionManager } from './encryption';
import { AuthManager, UserProfile } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markActive } from './activity'; // 👈 added import

export interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  created_by: string;
  group_key_version: number;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
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
  private retryTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
    this.authManager = AuthManager.getInstance();
    this.startRetryMechanism();
  }

  static getInstance(): ChatManager {
    if (!ChatManager.instance) {
      ChatManager.instance = new ChatManager();
    }
    return ChatManager.instance;
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
      // Create chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name,
          is_group: isGroup,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add participants
      const participants = [
        { chat_id: chat.id, user_id: currentUser.id, role: 'admin' },
        ...participantIds.map(id => ({ chat_id: chat.id, user_id: id, role: 'member' as const }))
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      // Generate group key if it's a group chat
      if (isGroup) {
        await this.generateGroupKey(chat.id, participantIds);
      }

      return chat;
    } catch (error) {
      throw new Error(`Failed to create chat: ${error}`);
    }
  }

  // Generate group encryption key
  private async generateGroupKey(chatId: string, participantIds: string[]): Promise<void> {
    try {
      // Get participant public keys
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, public_key')
        .in('id', participantIds);

      if (!profiles) return;

      const publicKeys = profiles.map(p => p.public_key);
      const groupKey = this.encryptionManager.generateChatKey(chatId, publicKeys, 1);

      // Encrypt group key for each participant
      const groupKeyEntries = profiles.map(profile => ({
        chat_id: chatId,
        key_version: 1,
        encrypted_key: this.encryptionManager.encryptMessage(groupKey, chatId, [profile.public_key]),
        user_id: profile.id
      }));

      await supabase.from('group_keys').insert(groupKeyEntries);
    } catch (error) {
      console.error('Failed to generate group key:', error);
    }
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
      // Get chat participants for encryption
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id, profiles(public_key)')
        .eq('chat_id', chatId)
        .neq('user_id', currentUser.id);

      if (!participants) throw new Error('Failed to get chat participants');

      const participantKeys = participants
        .map(p => (p.profiles as any)?.public_key)
        .filter(Boolean);

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

      // Create message metadata (no content stored permanently)
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          id: messageId,
          chat_id: chatId,
          sender_id: currentUser.id,
          message_type: messageType,
          file_name: fileName,
          file_size: fileData ? fileData.length : undefined,
        })
        .select()
        .single();

      if (error) throw error;

      // Send encrypted content via realtime (not stored permanently)
      await supabase.channel(`chat:${chatId}`).send({
        type: 'broadcast',
        event: 'new_message',
        payload: {
          message_id: messageId,
          encrypted_content: encryptedContent,
          encrypted_file: encryptedFileData,
          file_key: fileKey,
          sender_public_key: currentUser.public_key,
        }
      });

      // Create delivery status for all participants
      const statusEntries = participants.map(p => ({
        message_id: messageId,
        user_id: p.user_id,
        status: 'sent' as const
      }));

      await supabase.from('message_status').insert(statusEntries);

      // 👇 mark user active after sending
      await markActive(currentUser.id);

      return {
        ...message,
        content, // Include decrypted content for sender
      };
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

      throw new Error(`Failed to send message: ${error}`);
    }
  }

  // Update message status (delivered/seen)
  async updateMessageStatus(messageId: string, status: 'delivered' | 'seen'): Promise<void> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) return;

    try {
      await supabase
        .from('message_status')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('message_id', messageId)
        .eq('user_id', currentUser.id);
    } catch (error) {
      console.error('Failed to update message status:', error);
    }
  }

  // Get chat messages (metadata only)
  async getChatMessages(chatId: string, limit: number = 50): Promise<Message[]> {
    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          message_status(*)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return messages || [];
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
      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_participants(
            *,
            profiles(*)
          )
        `)
        .in('id', 
          supabase
            .from('chat_participants')
            .select('chat_id')
            .eq('user_id', currentUser.id)
        );

      if (error) throw error;
      return chats || [];
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
      // Check if user is admin
      const { data: participant } = await supabase
        .from('chat_participants')
        .select('role')
        .eq('chat_id', chatId)
        .eq('user_id', currentUser.id)
        .single();

      if (!participant || participant.role !== 'admin') {
        throw new Error('Only admins can add members');
      }

      // Add new member
      await supabase
        .from('chat_participants')
        .insert({
          chat_id: chatId,
          user_id: userId,
          role: 'member'
        });

      // Rotate group key
      await this.rotateGroupKey(chatId);
    } catch (error) {
      throw new Error(`Failed to add member: ${error}`);
    }
  }

  // Remove member from group chat
  async removeGroupMember(chatId: string, userId: string): Promise<void> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    try {
      // Check if user is admin
      const { data: participant } = await supabase
        .from('chat_participants')
        .select('role')
        .eq('chat_id', chatId)
        .eq('user_id', currentUser.id)
        .single();

      if (!participant || participant.role !== 'admin') {
        throw new Error('Only admins can remove members');
      }

      // Remove member
      await supabase
        .from('chat_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('chat_id', chatId)
        .eq('user_id', userId);

      // Rotate group key
      await this.rotateGroupKey(chatId);
    } catch (error) {
      throw new Error(`Failed to remove member: ${error}`);
    }
  }

  // Rotate group key when membership changes
  private async rotateGroupKey(chatId: string): Promise<void> {
    try {
      // Increment key version
      await supabase.rpc('rotate_group_key', { chat_uuid: chatId });

      // Get current active participants
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id, profiles(public_key)')
        .eq('chat_id', chatId)
        .is('left_at', null);

      if (!participants) return;

      const publicKeys = participants
        .map(p => (p.profiles as any)?.public_key)
        .filter(Boolean);

      // Generate new group key
      const newGroupKey = this.encryptionManager.rotateChatKey(chatId, publicKeys);

      // Get new key version
      const { data: chat } = await supabase
        .from('chats')
        .select('group_key_version')
        .eq('id', chatId)
        .single();

      if (!chat) return;

      // Encrypt new key for each active participant
      const groupKeyEntries = participants.map(p => ({
        chat_id: chatId,
        key_version: chat.group_key_version,
        encrypted_key: this.encryptionManager.encryptMessage(
          newGroupKey,
          chatId,
          [(p.profiles as any)?.public_key]
        ),
        user_id: p.user_id
      }));

      await supabase.from('group_keys').insert(groupKeyEntries);
    } catch (error) {
      console.error('Failed to rotate group key:', error);
    }
  }

  // Subscribe to chat updates
  subscribeToChat(chatId: string, onMessage: (message: any) => void): () => void {
    const channel = supabase.channel(`chat:${chatId}`)
      .on('broadcast', { event: 'new_message' }, (payload) => {
        try {
          // Decrypt message content
          const decryptedContent = this.encryptionManager.decryptMessage(
            payload.payload.encrypted_content,
            chatId,
            payload.payload.sender_public_key
          );

          // Decrypt file if present
          let decryptedFile: string | undefined;
          if (payload.payload.encrypted_file && payload.payload.file_key) {
            decryptedFile = this.encryptionManager.decryptFile(
              payload.payload.encrypted_file,
              payload.payload.file_key
            );
          }

          onMessage({
            id: payload.payload.message_id,
            content: decryptedContent,
            file_data: decryptedFile,
            sender_public_key: payload.payload.sender_public_key,
          });

          // Update message status to delivered
          this.updateMessageStatus(payload.payload.message_id, 'delivered');

          // 👇 mark user active after receiving a message
          const currentUser = this.authManager.getCurrentUser();
          if (currentUser) {
            markActive(currentUser.id);
          }
        } catch (error) {
          console.error('Failed to decrypt message:', error);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Cleanup expired messages
  static async cleanupExpiredMessages(): Promise<void> {
    try {
      await supabase.rpc('cleanup_expired_messages');
    } catch (error) {
      console.error('Failed to cleanup expired messages:', error);
    }
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

  // Destroy chat manager
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.pendingMessages.clear();
  }
}
