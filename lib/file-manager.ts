import { supabase } from './supabase';
import { EncryptionManager } from './encryption';
import * as FileSystem from 'expo-file-system';

export interface FileUploadResult {
  url: string;
  fileName: string;
  fileSize: number;
  encryptionKey?: string;
}

export class FileManager {
  private static instance: FileManager;
  private encryptionManager: EncryptionManager;

  constructor() {
    this.encryptionManager = EncryptionManager.getInstance();
  }

  static getInstance(): FileManager {
    if (!FileManager.instance) {
      FileManager.instance = new FileManager();
    }
    return FileManager.instance;
  }

  // Upload file with encryption
  async uploadFile(
    fileUri: string,
    fileName: string,
    mimeType: string,
    shouldEncrypt: boolean = true
  ): Promise<FileUploadResult> {
    try {
      // Read file
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File not found');
      }

      let fileData: string;
      let encryptionKey: string | undefined;

      if (shouldEncrypt) {
        // Generate encryption key for file
        encryptionKey = this.encryptionManager.generateFileKey();
        
        // Read file as base64
        const base64Data = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Encrypt file data
        fileData = this.encryptionManager.encryptFile(base64Data, encryptionKey);
      } else {
        fileData = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      // Create blob for upload
      const blob = new Blob([fileData], { type: 'text/plain' });
      
      // Generate unique file name
      const timestamp = Date.now();
      const uniqueFileName = `${timestamp}_${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('files')
        .upload(`messages/${uniqueFileName}`, blob, {
          contentType: mimeType,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        fileName,
        fileSize: fileInfo.size || 0,
        encryptionKey,
      };
    } catch (error) {
      throw new Error(`File upload failed: ${error}`);
    }
  }

  // Download and decrypt file
  async downloadFile(url: string, encryptionKey?: string): Promise<string> {
    try {
      const response = await fetch(url);
      const encryptedData = await response.text();

      if (encryptionKey) {
        return this.encryptionManager.decryptFile(encryptedData, encryptionKey);
      }

      return encryptedData;
    } catch (error) {
      throw new Error(`File download failed: ${error}`);
    }
  }

  // Get file preview URL
  getPreviewUrl(url: string): string {
    return url;
  }

  // Check if file type supports preview
  supportsPreview(mimeType: string): boolean {
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('video/') || 
           mimeType.startsWith('audio/') ||
           mimeType === 'application/pdf';
  }

  // Get file icon based on type
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.startsWith('text/')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    return '📎';
  }
}