-- Create schema for our application
CREATE SCHEMA IF NOT EXISTS satchel;

-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create entries table
CREATE TABLE IF NOT EXISTS satchel.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('article', 'company', 'note')),
  url TEXT,
  processing_state TEXT NOT NULL DEFAULT 'started' CHECK (processing_state IN ('started', 'inProcess', 'completed')),
  processing_progress INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create comments table
CREATE TABLE IF NOT EXISTS satchel.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entry_id UUID NOT NULL REFERENCES satchel.entries(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS entries_user_id_idx ON satchel.entries(user_id);
CREATE INDEX IF NOT EXISTS entries_type_idx ON satchel.entries(type);
CREATE INDEX IF NOT EXISTS comments_entry_id_idx ON satchel.comments(entry_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION satchel.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_entries_updated_at
BEFORE UPDATE ON satchel.entries
FOR EACH ROW
EXECUTE FUNCTION satchel.update_updated_at();

-- Create RLS (Row Level Security) policies
ALTER TABLE satchel.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE satchel.comments ENABLE ROW LEVEL SECURITY;

-- Create policies for entries
CREATE POLICY "Users can view their own entries"
  ON satchel.entries
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own entries"
  ON satchel.entries
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own entries"
  ON satchel.entries
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own entries"
  ON satchel.entries
  FOR DELETE
  USING (user_id = auth.uid());

-- Create policies for comments
CREATE POLICY "Users can view comments on their entries"
  ON satchel.comments
  FOR SELECT
  USING (
    entry_id IN (
      SELECT id FROM satchel.entries WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert comments on their entries"
  ON satchel.comments
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    entry_id IN (
      SELECT id FROM satchel.entries WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments"
  ON satchel.comments
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
  ON satchel.comments
  FOR DELETE
  USING (user_id = auth.uid());
