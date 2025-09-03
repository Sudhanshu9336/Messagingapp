import { UserProfile } from './auth';

export interface QRUserData {
  userId: number;
  username: string;
  publicKey: string;
}

export class QRManager {
  // Generate QR data for user
  static generateQRData(user: UserProfile): string {
    const qrData: QRUserData = {
      userId: user.user_id,
      username: user.username,
      publicKey: user.public_key,
    };
    return JSON.stringify(qrData);
  }

  // Parse QR data
  static parseQRData(qrString: string): QRUserData | null {
    try {
      const data = JSON.parse(qrString);
      if (data.userId && data.username && data.publicKey) {
        return data as QRUserData;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}