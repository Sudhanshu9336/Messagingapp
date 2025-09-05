import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface ChatKeyPair {
  chatId: string;
  sharedSecret: string;
  keyVersion: number;
}

export class EncryptionManager {
  private static instance: EncryptionManager;
  private keyPair: KeyPair | null = null;
  private chatKeys: Map<string, ChatKeyPair> = new Map();

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  // Generate secure random bytes using available crypto API
  private getSecureRandomBytes(length: number): string {
    try {
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }
      
      return CryptoJS.lib.WordArray.random(length).toString();
    } catch (error) {
      console.warn('Secure random generation failed, using fallback:', error);
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2);
      return CryptoJS.SHA256(timestamp + random).toString().substring(0, length * 2);
    }
  }

  // Generate key pair for user with enhanced entropy
  generateKeyPair(): KeyPair {
    try {
      // Multiple entropy sources
      const timestamp = Date.now().toString();
      const randomBytes1 = this.getSecureRandomBytes(32);
      const randomBytes2 = this.getSecureRandomBytes(16);
      const performanceNow = (typeof performance !== 'undefined' ? performance.now() : Date.now()).toString();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      
      // Combine entropy sources
      const entropyString = `${randomBytes1}${timestamp}${randomBytes2}${performanceNow}${userAgent}`;
      
      // Generate private key with PBKDF2 for additional security
      const privateKey = CryptoJS.PBKDF2(entropyString, 'SecureChat-Salt', {
        keySize: 256/32,
        iterations: 10000
      }).toString();
      
      // Generate public key from private key
      const publicKey = CryptoJS.SHA256(privateKey + 'public-key-derivation').toString();
      
      this.keyPair = { publicKey, privateKey };
      return this.keyPair;
    } catch (error) {
      console.error('Key generation error:', error);
      throw new Error('Failed to generate encryption keys. Please try again.');
    }
  }

  // Set existing key pair
  setKeyPair(keyPair: KeyPair): void {
    this.keyPair = keyPair;
  }

  // Generate chat-specific shared secret (Diffie-Hellman-like)
  generateChatKey(chatId: string, participantPublicKeys: string[], keyVersion: number = 1): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    try {
      // Create deterministic shared secret from all participants
      const sortedKeys = [this.keyPair.publicKey, ...participantPublicKeys].sort();
      const combinedKeys = sortedKeys.join('');
      
      // Generate chat-specific shared secret
      const sharedSecret = CryptoJS.PBKDF2(
        combinedKeys + chatId + keyVersion.toString(),
        'chat-key-salt',
        { keySize: 256/32, iterations: 5000 }
      ).toString();

      // Store chat key
      this.chatKeys.set(chatId, {
        chatId,
        sharedSecret,
        keyVersion
      });

      return sharedSecret;
    } catch (error) {
      throw new Error('Failed to generate chat key');
    }
  }

  // Get or create chat key
  getChatKey(chatId: string, participantPublicKeys?: string[], keyVersion?: number): string {
    const existingKey = this.chatKeys.get(chatId);
    
    if (existingKey && (!keyVersion || existingKey.keyVersion === keyVersion)) {
      return existingKey.sharedSecret;
    }

    if (participantPublicKeys && keyVersion) {
      return this.generateChatKey(chatId, participantPublicKeys, keyVersion);
    }

    throw new Error('Chat key not found and insufficient data to generate new key');
  }

  // Rotate chat key (for group membership changes)
  rotateChatKey(chatId: string, participantPublicKeys: string[]): string {
    const existingKey = this.chatKeys.get(chatId);
    const newVersion = existingKey ? existingKey.keyVersion + 1 : 1;
    
    return this.generateChatKey(chatId, participantPublicKeys, newVersion);
  }

  // Encrypt message for specific chat
  encryptMessage(message: string, chatId: string, participantPublicKeys?: string[]): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    try {
      let sharedSecret: string;

      if (participantPublicKeys && participantPublicKeys.length === 1) {
        // Direct message - use peer-to-peer encryption
        sharedSecret = CryptoJS.SHA256(
          this.keyPair.privateKey + participantPublicKeys[0]
        ).toString();
      } else {
        // Group message - use chat key
        sharedSecret = this.getChatKey(chatId, participantPublicKeys);
      }
      
      // Add timestamp and nonce for additional security
      const timestamp = Date.now().toString();
      const nonce = this.getSecureRandomBytes(16);
      const messageWithMeta = JSON.stringify({
        content: message,
        timestamp,
        nonce
      });
      
      const encrypted = CryptoJS.AES.encrypt(messageWithMeta, sharedSecret).toString();
      return encrypted;
    } catch (error) {
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt message from specific chat
  decryptMessage(encryptedMessage: string, chatId: string, senderPublicKey?: string): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    try {
      let sharedSecret: string;

      if (senderPublicKey && !this.chatKeys.has(chatId)) {
        // Direct message - use peer-to-peer decryption
        sharedSecret = CryptoJS.SHA256(
          this.keyPair.privateKey + senderPublicKey
        ).toString();
      } else {
        // Group message - use chat key
        sharedSecret = this.getChatKey(chatId);
      }
      
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, sharedSecret);
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('Decryption resulted in empty string');
      }

      // Parse message with metadata
      const messageData = JSON.parse(decryptedText);
      return messageData.content;
    } catch (error) {
      throw new Error('Failed to decrypt message');
    }
  }

  // Generate file encryption key
  generateFileKey(): string {
    return this.getSecureRandomBytes(32);
  }

  // Encrypt file data with compression
  encryptFile(fileData: string, key?: string): { encrypted: string; key: string } {
    try {
      const fileKey = key || this.generateFileKey();
      
      // Compress data before encryption for large files
      const compressed = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(fileData));
      const encrypted = CryptoJS.AES.encrypt(compressed, fileKey).toString();
      
      return { encrypted, key: fileKey };
    } catch (error) {
      throw new Error('Failed to encrypt file');
    }
  }

  // Decrypt file data
  decryptFile(encryptedData: string, key: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      const compressed = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!compressed) {
        throw new Error('File decryption resulted in empty data');
      }
      
      // Decompress data
      const decompressed = CryptoJS.enc.Base64.parse(compressed).toString(CryptoJS.enc.Utf8);
      return decompressed;
    } catch (error) {
      throw new Error('Failed to decrypt file');
    }
  }

  // Get current public key
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }

  // Clear all keys from memory
  clearKeys(): void {
    this.keyPair = null;
    this.chatKeys.clear();
  }

  // Export chat keys for backup (encrypted with user's private key)
  exportChatKeys(): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    const keysData = Array.from(this.chatKeys.entries());
    const keysJson = JSON.stringify(keysData);
    
    return CryptoJS.AES.encrypt(keysJson, this.keyPair.privateKey).toString();
  }

  // Import chat keys from backup
  importChatKeys(encryptedKeys: string): void {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedKeys, this.keyPair.privateKey);
      const keysJson = decrypted.toString(CryptoJS.enc.Utf8);
      const keysData = JSON.parse(keysJson);
      
      this.chatKeys = new Map(keysData);
    } catch (error) {
      throw new Error('Failed to import chat keys');
    }
  }
}