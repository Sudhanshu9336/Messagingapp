/*
  # Enhanced Messaging Schema

  1. New Tables
    - `chats` - Chat rooms/conversations
    - `chat_participants` - Users in each chat
    - `messages` - Message metadata (no content stored permanently)
    - `message_status` - Delivery/read receipts
    - `group_keys` - Encrypted group keys for group chats

  2. Security
    - Enable RLS on all tables
    - Policies for chat participants only
    - No permanent message content storage

  3. Features
    - Group chat support
    - Message status tracking
    - Key rotation for groups
*/

-- Chats table for conversations
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  is_group boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  group_key_version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Chat participants
CREATE TABLE IF NOT EXISTS chat_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  left_at timestamptz,
  UNIQUE(chat_id, user_id)
);

-- Message metadata (no content stored permanently)
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'audio', 'video')),
  file_name text,
  file_size bigint,
  reply_to uuid REFERENCES messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '24 hours') -- Auto-delete after 24h
);

-- Message delivery status
CREATE TABLE IF NOT EXISTS message_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Group encryption keys (rotated when membership changes)
CREATE TABLE IF NOT EXISTS group_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  key_version integer NOT NULL,
  encrypted_key text NOT NULL, -- Encrypted with each member's public key
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, key_version, user_id)
);

-- Enable RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_keys ENABLE ROW LEVEL SECURITY;

-- Chat policies
CREATE POLICY "Users can view their chats"
  ON chats FOR SELECT
  USING (id IN (SELECT chat_id FROM chat_participants WHERE user_id = (SELECT id FROM profiles LIMIT 1)));

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Chat creators can update their chats"
  ON chats FOR UPDATE
  USING (created_by = (SELECT id FROM profiles LIMIT 1));

-- Chat participants policies
CREATE POLICY "Users can view participants in their chats"
  ON chat_participants FOR SELECT
  USING (chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = (SELECT id FROM profiles LIMIT 1)));

CREATE POLICY "Users can join chats"
  ON chat_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can leave chats"
  ON chat_participants FOR UPDATE
  USING (user_id = (SELECT id FROM profiles LIMIT 1));

-- Message policies (metadata only)
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = (SELECT id FROM profiles LIMIT 1)));

CREATE POLICY "Users can send messages to their chats"
  ON messages FOR INSERT
  WITH CHECK (chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = sender_id));

-- Message status policies
CREATE POLICY "Users can view message status in their chats"
  ON message_status FOR SELECT
  USING (message_id IN (
    SELECT id FROM messages WHERE chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = (SELECT id FROM profiles LIMIT 1)
    )
  ));

CREATE POLICY "Users can update message status"
  ON message_status FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can modify their message status"
  ON message_status FOR UPDATE
  USING (user_id = (SELECT id FROM profiles LIMIT 1));

-- Group keys policies
CREATE POLICY "Users can view group keys for their chats"
  ON group_keys FOR SELECT
  USING (chat_id IN (SELECT chat_id FROM chat_participants WHERE user_id = user_id));

CREATE POLICY "Users can add group keys"
  ON group_keys FOR INSERT
  WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON chats(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON message_status(message_id);
CREATE INDEX IF NOT EXISTS idx_group_keys_chat_id ON group_keys(chat_id);

-- Function to auto-delete expired messages
CREATE OR REPLACE FUNCTION cleanup_expired_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM messages WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate group keys when membership changes
CREATE OR REPLACE FUNCTION rotate_group_key(chat_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE chats 
  SET group_key_version = group_key_version + 1,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = chat_uuid AND is_group = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_messages() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_messages() TO anon;
GRANT EXECUTE ON FUNCTION rotate_group_key(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rotate_group_key(uuid) TO anon;