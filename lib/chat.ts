import { supabase } from './supabase';
import { EncryptionManager } from './encryption';
import { AuthManager } from './auth';

export interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants?: ChatParticipant[];
  last_message?: Message;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
    public_key: string;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'audio' | 'video';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  encrypted_key?: string;
  status: 'sent' | 'delivered' | 'read';
  reply_to?: string;
  created_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export class ChatManager {
  private static instance: ChatManager;
  private encryptionManager: EncryptionManager;
  private authManager: AuthManager;

  constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
    this.authManager = AuthManager.getInstance();
  }

  static getInstance(): ChatManager {
    if (!ChatManager.instance) {
      ChatManager.instance = new ChatManager();
    }
    return ChatManager.instance;
  }

  // Create new chat
  async createChat(participantIds: string[], isGroup: boolean = false, name?: string): Promise<Chat> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

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
        { chat_id: chat.id, user_id: currentUser.id, role: 'admin' as const },
        ...participantIds.map(id => ({
          chat_id: chat.id,
          user_id: id,
          role: 'member' as const,
        })),
      ];

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      return chat;
    } catch (error) {
      throw new Error(`Failed to create chat: ${error}`);
    }
  }

  // Get user's chats
  async getUserChats(): Promise<Chat[]> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select(`
          *,
          chats:chat_id (
            *,
            participants:chat_participants (
              *,
              profile:user_id (
                username,
                avatar_url,
                public_key
              )
            )
          )
        `)
        .eq('user_id', currentUser.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => item.chats).filter(Boolean) || [];
    } catch (error) {
      throw new Error(`Failed to get chats: ${error}`);
    }
  }

  // Send message
  async sendMessage(
    chatId: string,
    content: string,
    messageType: 'text' | 'file' | 'image' | 'audio' | 'video' = 'text',
    fileUrl?: string,
    fileName?: string,
    fileSize?: number
  ): Promise<Message> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    try {
      // Get chat participants to encrypt message for each
      const { data: participants } = await supabase
        .from('chat_participants')
        .select(`
          user_id,
          profile:user_id (public_key)
        `)
        .eq('chat_id', chatId);

      if (!participants) throw new Error('Chat not found');

      // For now, we'll store one encrypted version
      // In a production app, you'd encrypt for each participant
      const recipientKey = participants.find(p => p.user_id !== currentUser.id)?.profile?.public_key;
      
      let encryptedContent = content;
      if (recipientKey && messageType === 'text') {
        encryptedContent = this.encryptionManager.encryptMessage(content, recipientKey);
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: currentUser.id,
          content: encryptedContent,
          message_type: messageType,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize,
        })
        .select(`
          *,
          sender:sender_id (
            username,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  // Get messages for chat
  async getChatMessages(chatId: string, limit: number = 50): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id (
            username,
            avatar_url
          ),
          reactions:message_reactions (*)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Decrypt messages
      return (data || []).map(message => {
        if (message.message_type === 'text' && message.content) {
          try {
            // Get sender's public key and decrypt
            // This is simplified - in production, you'd need proper key management
            message.content = message.content; // For now, keep as is
          } catch (decryptError) {
            console.warn('Failed to decrypt message:', decryptError);
          }
        }
        return message;
      }).reverse();
    } catch (error) {
      throw new Error(`Failed to get messages: ${error}`);
    }
  }

  // Subscribe to new messages
  subscribeToMessages(chatId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();
  }

  // Update typing indicator
  async updateTypingIndicator(chatId: string, isTyping: boolean): Promise<void> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) return;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          chat_id: chatId,
          user_id: currentUser.id,
          is_typing: isTyping,
        });
    } catch (error) {
      console.warn('Failed to update typing indicator:', error);
    }
  }

  // Add reaction to message
  async addReaction(messageId: string, emoji: string): Promise<void> {
    const currentUser = this.authManager.getCurrentUser();
    if (!currentUser) throw new Error('User not authenticated');

    try {
      await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: currentUser.id,
          emoji,
        });
    } catch (error) {
      throw new Error(`Failed to add reaction: ${error}`);
    }
  }
}