# Messaging App Architecture

## Overview

This document outlines the technical architecture of the Secure Messaging App, detailing the system components, data flow, and security implementations.

## System Components

### 1. Frontend Architecture

#### Core Components
- **Navigation**: Uses Expo Router for type-safe navigation
- **State Management**: React Context for global state
- **UI Framework**: React Native with Expo
- **Type System**: TypeScript for type safety

#### Key Modules
- **AuthContext**: Manages authentication state and user sessions
- **EncryptionManager**: Handles all cryptographic operations
- **FileManager**: Manages secure file operations
- **QR System**: Handles contact exchange via QR codes

### 2. Backend Architecture (Supabase)

#### Database Layer
- PostgreSQL database with real-time capabilities
- Row Level Security (RLS) policies
- Encrypted data storage

#### Authentication
- Custom authentication system
- Session management
- Token-based security

## Security Implementation

### 1. Encryption System

```typescript
class EncryptionManager {
  // Key Generation
  generateKeyPair(): KeyPair {
    // Generate strong private key with entropy
    const timestamp = new Date().getTime().toString();
    const random = CryptoJS.lib.WordArray.random(32);
    const entropy = CryptoJS.lib.WordArray.random(16);
    
    const privateKey = CryptoJS.SHA256(
      random.toString() + timestamp + entropy.toString()
    ).toString();
    
    // Derive public key
    const publicKey = CryptoJS.SHA256(privateKey).toString();
    
    return { publicKey, privateKey };
  }

  // Message Encryption
  encryptMessage(message: string, recipientPublicKey: string): string {
    // Create shared secret for E2E encryption
    const sharedSecret = CryptoJS.SHA256(
      this.keyPair.privateKey + recipientPublicKey
    ).toString();
    
    // Encrypt using AES
    return CryptoJS.AES.encrypt(message, sharedSecret).toString();
  }
}
```

### 2. Authentication Flow

```typescript
class AuthManager {
  async register(username: string, gender?: string): Promise<UserProfile> {
    // 1. Validate input
    // 2. Generate secure user ID
    // 3. Create encryption keys
    // 4. Store public key
    // 5. Create user profile
    // 6. Establish secure session
  }

  async loginWithSession(): Promise<UserProfile | null> {
    // 1. Retrieve stored credentials
    // 2. Validate session
    // 3. Restore encryption keys
    // 4. Return user profile
  }
}
```

## Data Flow Diagrams

### 1. Message Sending Flow
```
[Sender]
    ↓ 1. Compose Message
    ↓ 2. Get Recipient's Public Key
    ↓ 3. Generate Shared Secret
    ↓ 4. Encrypt Message
    ↓ 5. Send to Server
[Supabase]
    ↓ 6. Store Encrypted Message
    ↓ 7. Notify Recipient
[Recipient]
    ↓ 8. Receive Notification
    ↓ 9. Generate Shared Secret
    ↓ 10. Decrypt Message
    ↓ 11. Display Message
```

### 2. Contact Addition Flow
```
[User A]
    ↓ 1. Generate QR/Invitation Code
    ↓ 2. Share Code
[User B]
    ↓ 3. Scan/Enter Code
    ↓ 4. Exchange Public Keys
    ↓ 5. Verify Keys
[Both Users]
    ↓ 6. Create Contact Entry
    ↓ 7. Enable Secure Chat
```

## Database Schema Details

### Tables

#### 1. profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id INTEGER UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  gender TEXT,
  bio TEXT,
  public_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. chats
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  is_group BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Performance Considerations

### 1. Message Handling
- Batch processing for multiple messages
- Lazy loading for chat history
- Message pagination
- Optimistic updates

### 2. Encryption Performance
- Key caching
- Shared secret caching
- Async encryption operations

### 3. File Handling
- Progressive upload
- Chunked encryption
- Thumbnail generation
- Cache management

## Error Handling

### 1. Network Errors
- Automatic retry mechanism
- Offline queue system
- Connection status monitoring

### 2. Cryptographic Errors
- Key verification
- Fallback mechanisms
- Error reporting

### 3. Database Errors
- Conflict resolution
- Data reconciliation
- Automatic recovery

## Testing Strategy

### 1. Unit Tests
- Encryption/Decryption
- Authentication flows
- Data transformations

### 2. Integration Tests
- API interactions
- Database operations
- File operations

### 3. Security Tests
- Key generation
- Encryption strength
- Session management
