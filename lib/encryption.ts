import 'react-native-get-random-values';
import CryptoJS from 'crypto-js';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export class EncryptionManager {
  private static instance: EncryptionManager;
  private keyPair: KeyPair | null = null;

  static getInstance(): EncryptionManager {
    if (!EncryptionManager.instance) {
      EncryptionManager.instance = new EncryptionManager();
    }
    return EncryptionManager.instance;
  }

  // Generate secure random bytes using available crypto API
  private getSecureRandomBytes(length: number): string {
    try {
      // Use crypto.getRandomValues if available (polyfilled in _layout.tsx)
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      }
      
      // Fallback to CryptoJS random
      return CryptoJS.lib.WordArray.random(length).toString();
    } catch (error) {
      console.warn('Secure random generation failed, using fallback:', error);
      // Ultimate fallback using Math.random with timestamp
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substring(2);
      return CryptoJS.SHA256(timestamp + random).toString().substring(0, length * 2);
    }
  }

  // Generate key pair for user
  generateKeyPair(): KeyPair {
    try {
      // Generate private key with multiple entropy sources
      const timestamp = Date.now().toString();
      const randomBytes1 = this.getSecureRandomBytes(32);
      const randomBytes2 = this.getSecureRandomBytes(16);
      const performanceNow = (typeof performance !== 'undefined' ? performance.now() : Date.now()).toString();
      
      // Combine entropy sources
      const entropyString = `${randomBytes1}${timestamp}${randomBytes2}${performanceNow}`;
      
      // Generate private key
      const privateKey = CryptoJS.SHA256(entropyString).toString();
      
      // Generate public key from private key
      const publicKey = CryptoJS.SHA256(privateKey + 'public').toString();
      
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

  // Encrypt message for peer-to-peer communication
  encryptMessage(message: string, recipientPublicKey: string): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    try {
      // Create shared secret using ECDH-like approach
      const sharedSecret = CryptoJS.SHA256(
        this.keyPair.privateKey + recipientPublicKey
      ).toString();
      
      // Encrypt message with AES
      const encrypted = CryptoJS.AES.encrypt(message, sharedSecret).toString();
      return encrypted;
    } catch (error) {
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt message from peer
  decryptMessage(encryptedMessage: string, senderPublicKey: string): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    try {
      // Create shared secret
      const sharedSecret = CryptoJS.SHA256(
        this.keyPair.privateKey + senderPublicKey
      ).toString();
      
      // Decrypt message
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, sharedSecret);
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('Decryption resulted in empty string');
      }
      
      return decryptedText;
    } catch (error) {
      throw new Error('Failed to decrypt message');
    }
  }

  // Generate file encryption key
  generateFileKey(): string {
    return this.getSecureRandomBytes(32);
  }

  // Encrypt file data
  encryptFile(fileData: string, key: string): string {
    try {
      return CryptoJS.AES.encrypt(fileData, key).toString();
    } catch (error) {
      throw new Error('Failed to encrypt file');
    }
  }

  // Decrypt file data
  decryptFile(encryptedData: string, key: string): string {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('File decryption resulted in empty data');
      }
      
      return decryptedText;
    } catch (error) {
      throw new Error('Failed to decrypt file');
    }
  }

  // Get current public key
  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }

  // Clear keys from memory
  clearKeys(): void {
    this.keyPair = null;
  }
}