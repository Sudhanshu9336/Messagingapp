import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalContact, ContactCustomization } from '@/types/contacts';
import { UserProfile } from './auth';

export class ContactManager {
  private static instance: ContactManager;
  private contacts: LocalContact[] = [];

  static getInstance(): ContactManager {
    if (!ContactManager.instance) {
      ContactManager.instance = new ContactManager();
    }
    return ContactManager.instance;
  }

  // Load contacts from local storage
  async loadContacts(): Promise<LocalContact[]> {
    try {
      const contactsData = await AsyncStorage.getItem('local_contacts');
      if (contactsData) {
        this.contacts = JSON.parse(contactsData);
      }
      return this.contacts;
    } catch (error) {
      console.error('Failed to load contacts:', error);
      return [];
    }
  }

  // Save contacts to local storage
  private async saveContacts(): Promise<void> {
    try {
      await AsyncStorage.setItem('local_contacts', JSON.stringify(this.contacts));
    } catch (error) {
      console.error('Failed to save contacts:', error);
    }
  }

  // Add a new contact from user profile
  async addContact(userProfile: UserProfile): Promise<LocalContact> {
    const existingContact = this.contacts.find(c => c.user_id === userProfile.user_id);
    
    if (existingContact) {
      // Update existing contact with latest profile info
      existingContact.original_username = userProfile.username;
      existingContact.public_key = userProfile.public_key;
      existingContact.bio = userProfile.bio;
      existingContact.gender = userProfile.gender;
      await this.saveContacts();
      return existingContact;
    }

    const newContact: LocalContact = {
      id: `contact_${userProfile.user_id}_${Date.now()}`,
      user_id: userProfile.user_id,
      original_username: userProfile.username,
      display_name: userProfile.username, // Initially same as original
      public_key: userProfile.public_key,
      bio: userProfile.bio,
      gender: userProfile.gender,
      is_favorite: false,
      created_at: new Date().toISOString(),
    };

    this.contacts.push(newContact);
    await this.saveContacts();
    return newContact;
  }

  // Customize contact display
  async customizeContact(contactId: string, customization: ContactCustomization): Promise<void> {
    const contact = this.contacts.find(c => c.id === contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    if (customization.display_name !== undefined) {
      contact.display_name = customization.display_name;
    }
    if (customization.custom_avatar !== undefined) {
      contact.custom_avatar = customization.custom_avatar;
    }
    if (customization.notes !== undefined) {
      contact.notes = customization.notes;
    }
    if (customization.is_favorite !== undefined) {
      contact.is_favorite = customization.is_favorite;
    }

    await this.saveContacts();
  }

  // Get all contacts
  getContacts(): LocalContact[] {
    return this.contacts;
  }

  // Get contact by user ID
  getContactByUserId(userId: number): LocalContact | null {
    return this.contacts.find(c => c.user_id === userId) || null;
  }

  // Search contacts by display name or original username
  searchContacts(query: string): LocalContact[] {
    const lowerQuery = query.toLowerCase();
    return this.contacts.filter(contact => 
      contact.display_name.toLowerCase().includes(lowerQuery) ||
      contact.original_username.toLowerCase().includes(lowerQuery) ||
      contact.user_id.toString().includes(query)
    );
  }

  // Remove contact
  async removeContact(contactId: string): Promise<void> {
    this.contacts = this.contacts.filter(c => c.id !== contactId);
    await this.saveContacts();
  }

  // Update last contacted timestamp
  async updateLastContacted(userId: number): Promise<void> {
    const contact = this.contacts.find(c => c.user_id === userId);
    if (contact) {
      contact.last_contacted = new Date().toISOString();
      await this.saveContacts();
    }
  }

  // Get favorite contacts
  getFavoriteContacts(): LocalContact[] {
    return this.contacts.filter(c => c.is_favorite);
  }

  // Clear all contacts (for logout)
  async clearContacts(): Promise<void> {
    this.contacts = [];
    await AsyncStorage.removeItem('local_contacts');
  }
}