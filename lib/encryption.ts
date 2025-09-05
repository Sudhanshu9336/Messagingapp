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

  // Generate key pair for user
  generateKeyPair(): KeyPair {
    // Generate a strong private key with additional entropy
    const timestamp = new Date().getTime().toString();
    const random = CryptoJS.lib.WordArray.random(32);
    const entropy = CryptoJS.lib.WordArray.random(16);
    
    const privateKey = CryptoJS.SHA256(
      random.toString() + timestamp + entropy.toString()
    ).toString();
    
    // Generate public key from private key
    const publicKey = CryptoJS.SHA256(privateKey).toString();
    
    this.keyPair = { publicKey, privateKey };
    return this.keyPair;
  }

  // Set existing key pair
  setKeyPair(keyPair: KeyPair): void {
    this.keyPair = keyPair;
  }

  // Encrypt message
  encryptMessage(message: string, recipientPublicKey: string): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    // Create shared secret
    const sharedSecret = CryptoJS.SHA256(this.keyPair.privateKey + recipientPublicKey).toString();
    
    // Encrypt message
    const encrypted = CryptoJS.AES.encrypt(message, sharedSecret).toString();
    return encrypted;
  }

  // Decrypt message
  decryptMessage(encryptedMessage: string, senderPublicKey: string): string {
    if (!this.keyPair) {
      throw new Error('Key pair not initialized');
    }

    try {
      // Create shared secret
      const sharedSecret = CryptoJS.SHA256(this.keyPair.privateKey + senderPublicKey).toString();
      
      // Decrypt message
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, sharedSecret);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Failed to decrypt message');
    }
  }

  // Generate file encryption key
  generateFileKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  // Encrypt file data
  encryptFile(fileData: string, key: string): string {
    return CryptoJS.AES.encrypt(fileData, key).toString();
  }

  // Decrypt file data
  decryptFile(encryptedData: string, key: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  getPublicKey(): string | null {
    return this.keyPair?.publicKey || null;
  }
}