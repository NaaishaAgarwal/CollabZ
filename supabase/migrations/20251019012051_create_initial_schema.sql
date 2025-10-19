/*
  # Initial Schema for Student Collaboration Platform

  ## Overview
  Creates the complete database schema for a student collaboration matching platform
  that connects high school and college students with complementary skills and interests.

  ## Tables Created

  ### 1. profiles
  Stores comprehensive user profile information including interests, skills, and project details.
  - `id` (uuid, primary key, references auth.users)
  - `username` (text, unique)
  - `full_name` (text)
  - `bio` (text)
  - `avatar_url` (text)
  - `industries` (text array) - Selected industries of interest
  - `interests` (text array) - User's passions and interests
  - `skills` (jsonb) - Skills with proficiency levels
  - `commitment_level` (text) - Time commitment availability
  - `looking_for` (text) - What they seek in collaborators
  - `project_stage` (text) - Current project phase
  - `project_idea` (text) - Description of project concept
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. interactions
  Tracks all swipe/like/reject actions between users for matching algorithm.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `target_user_id` (uuid, references profiles)
  - `interaction_type` (text) - 'like' or 'reject'
  - `is_match` (boolean) - True when both users like each other
  - `created_at` (timestamptz)

  ### 3. messages
  Stores all messages between matched users.
  - `id` (uuid, primary key)
  - `sender_id` (uuid, references profiles)
  - `receiver_id` (uuid, references profiles)
  - `content` (text)
  - `read` (boolean)
  - `created_at` (timestamptz)

  ### 4. blocks
  Manages blocked users for safety and user control.
  - `id` (uuid, primary key)
  - `blocker_id` (uuid, references profiles)
  - `blocked_id` (uuid, references profiles)
  - `created_at` (timestamptz)

  ### 5. connection_requests
  Handles connection requests with introduction messages.
  - `id` (uuid, primary key)
  - `sender_id` (uuid, references profiles)
  - `receiver_id` (uuid, references profiles)
  - `message` (text)
  - `status` (text) - 'pending', 'accepted', 'declined'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only read their own profile data
  - Users can read profiles of non-blocked users
  - Users can manage their own interactions
  - Only matched users can message each other
  - Users fully control their blocks and restrictions
  - Connection requests are visible to sender and receiver only

  ## Indexes
  - Optimized indexes on frequently queried fields
  - Composite indexes for complex queries
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  bio text,
  avatar_url text,
  industries text[] DEFAULT '{}',
  interests text[] DEFAULT '{}',
  skills jsonb DEFAULT '[]',
  commitment_level text,
  looking_for text,
  project_stage text,
  project_idea text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('like', 'reject')),
  is_match boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, target_user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create connection_requests table
CREATE TABLE IF NOT EXISTS connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_target_user_id ON interactions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_is_match ON interactions(is_match) WHERE is_match = true;
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(receiver_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_connection_requests_receiver ON connection_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view non-blocked profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id != auth.uid() 
    AND NOT EXISTS (
      SELECT 1 FROM blocks 
      WHERE (blocker_id = auth.uid() AND blocked_id = id)
         OR (blocker_id = id AND blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Interactions policies
CREATE POLICY "Users can view their own interactions"
  ON interactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR target_user_id = auth.uid());

CREATE POLICY "Users can create their own interactions"
  ON interactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own interactions"
  ON interactions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages to matches"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM interactions
      WHERE is_match = true
      AND ((user_id = auth.uid() AND target_user_id = receiver_id)
           OR (target_user_id = auth.uid() AND user_id = receiver_id))
    )
  );

CREATE POLICY "Users can update their received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Blocks policies
CREATE POLICY "Users can view their blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their blocks"
  ON blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Connection requests policies
CREATE POLICY "Users can view requests they sent or received"
  ON connection_requests FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can create connection requests"
  ON connection_requests FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Receivers can update request status"
  ON connection_requests FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_requests_updated_at
  BEFORE UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check and create mutual matches
CREATE OR REPLACE FUNCTION check_mutual_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process 'like' interactions
  IF NEW.interaction_type = 'like' THEN
    -- Check if target user also liked this user
    IF EXISTS (
      SELECT 1 FROM interactions
      WHERE user_id = NEW.target_user_id
      AND target_user_id = NEW.user_id
      AND interaction_type = 'like'
    ) THEN
      -- Set is_match to true for both interactions
      NEW.is_match = true;
      
      UPDATE interactions
      SET is_match = true
      WHERE user_id = NEW.target_user_id
      AND target_user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check for mutual matches
CREATE TRIGGER check_mutual_match_trigger
  BEFORE INSERT ON interactions
  FOR EACH ROW
  EXECUTE FUNCTION check_mutual_match();