-- Create comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS comments_entry_id_idx ON comments(entry_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id);

-- Add RLS policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own comments and comments on entries they own
CREATE POLICY "Users can view comments on their entries"
  ON comments FOR SELECT
  USING (
    user_id = auth.uid() OR 
    entry_id IN (SELECT id FROM entries WHERE user_id = auth.uid())
  );

-- Policy to allow users to insert their own comments
CREATE POLICY "Users can insert their own comments"
  ON comments FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy to allow users to update their own comments
CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE
  USING (user_id = auth.uid());

-- Policy to allow users to delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  USING (user_id = auth.uid());
