# Secure Messaging App

A privacy-focused messaging application built with React Native and Expo, featuring end-to-end encryption and secure user authentication.

## 🚀 Features

- **Secure Authentication**
  - Username-based registration (no email required)
  - Gender and bio customization
  - Terms & Conditions acceptance flow
  - Secure session management

- **Privacy & Security**
  - End-to-end encryption for messages
  - Public/private key cryptography
  - Secure file sharing
  - QR code-based contact adding
  - Invitation code system

- **Messaging Features**
  - One-on-one chat
  - Group chat support
  - File sharing capabilities
  - Real-time message updates

## 🛠️ Technology Stack

- **Frontend**
  - React Native
  - Expo Framework
  - TypeScript
  - React Navigation

- **Backend & Database**
  - Supabase (Backend as a Service)
  - PostgreSQL Database

- **Security & Encryption**
  - CryptoJS for encryption
  - React Native Get Random Values
  - Secure async storage
  - Public/private key encryption

## 📁 Project Structure

```
├── app/                      # Main application screens
│   ├── (auth)/              # Authentication related screens
│   └── (tabs)/              # Main app tabs
├── assets/                   # Static assets
├── contexts/                 # React Context providers
├── hooks/                    # Custom React hooks
├── lib/                      # Core functionality
│   ├── auth.ts              # Authentication management
│   ├── chat.ts              # Chat functionality
│   ├── encryption.ts        # Encryption utilities
│   ├── file-manager.ts      # File handling
│   ├── qr.ts               # QR code functionality
│   └── supabase.ts         # Supabase client config
├── types/                    # TypeScript type definitions
└── supabase/                # Database migrations
```

## 🔐 Security Architecture

### Authentication Flow
1. User enters username, gender (optional), and accepts T&Cs
2. System generates secure user ID and encryption keys
3. Public key is stored in database, private key stored locally
4. Session token generated and stored securely

### Message Encryption
1. Messages are encrypted using recipient's public key
2. Shared secret generated for each conversation
3. Files encrypted before upload
4. All sensitive data stored encrypted

### Contact Addition
1. Users can add contacts via:
   - QR code scanning
   - Invitation codes
2. Public key exchange happens automatically
3. Secure channel established for communication

## 📦 Database Schema

### Profiles Table
- `id`: UUID (Primary Key)
- `user_id`: Integer (8-digit unique identifier)
- `username`: String (unique)
- `gender`: String (optional)
- `bio`: String (optional)
- `public_key`: String
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Chats Table
- `id`: UUID (Primary Key)
- `name`: String (for group chats)
- `is_group`: Boolean
- `created_by`: UUID (Foreign Key to profiles)
- `created_at`: Timestamp
- `updated_at`: Timestamp

## 🚀 Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npx expo start
   ```

## 🔒 Security Considerations

- All sensitive data is encrypted before storage
- Private keys never leave the user's device
- Network connections are validated before operations
- Session tokens are securely stored
- Proper error handling for all security operations

## 📝 Development Guidelines

1. All new features must maintain end-to-end encryption
2. Use TypeScript for type safety
3. Follow the established security protocols
4. Test all encryption/decryption flows
5. Maintain proper error handling

## 🔄 Data Flow

1. **Authentication**
   - User Registration → Key Generation → Profile Creation
   - Session Management → Secure Storage → Auth Context

2. **Messaging**
   - Message Composition → Encryption → Database Storage
   - Message Retrieval → Decryption → Display

3. **Contact Addition**
   - QR/Code Generation → Key Exchange → Contact Creation
   - Profile Exchange → Secure Channel Establishment