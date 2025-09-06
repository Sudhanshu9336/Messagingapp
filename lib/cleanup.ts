import { AuthManager } from './auth';
import { supabase } from './supabase';

export class CleanupManager {
  private static instance: CleanupManager;
  private cleanupInterval: NodeJS.Timeout | null = null;

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  // Start automatic cleanup process
  startCleanupProcess(): void {
    // Run cleanup every 24 hours
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (error) {
        console.error('Scheduled cleanup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    // Run initial cleanup
    this.performCleanup().catch(error => {
      console.error('Initial cleanup failed:', error);
    });
  }

  // Stop cleanup process
  stopCleanupProcess(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Perform cleanup of inactive profiles
  private async performCleanup(): Promise<void> {
    try {
      console.log('Starting cleanup of inactive profiles...');
      await supabase.rpc('cleanup_inactive_profiles_default');
      console.log('Cleanup completed successfully');
    } catch (error) {
      console.error('Cleanup process failed:', error);
      throw error;
    }
  }

  // Perform cleanup with custom cutoff period
  async performCleanupWithCutoff(cutoff: string = '30 days'): Promise<void> {
    try {
      console.log(`Starting cleanup of inactive profiles with cutoff: ${cutoff}...`);
      await supabase.rpc('cleanup_inactive_profiles_with_cutoff', { p_cutoff: cutoff });
      console.log('Cleanup with cutoff completed successfully');
    } catch (error) {
      console.error('Cleanup with cutoff process failed:', error);
      throw error;
    }
  }

  // Manual cleanup trigger (for admin use)
  async triggerCleanup(): Promise<void> {
    await this.performCleanup();
  }

  // Get cleanup status
  isCleanupRunning(): boolean {
    return this.cleanupInterval !== null;
  }
}

// Initialize cleanup manager
export const cleanupManager = CleanupManager.getInstance();