-- Create schema
CREATE SCHEMA IF NOT EXISTS satchel;

-- Set search path
SET search_path TO satchel, public;

-- Create entries table
CREATE TABLE IF NOT EXISTS satchel.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('article', 'company', 'note')),
  url TEXT,
  processing_state TEXT NOT NULL DEFAULT 'started' CHECK (processing_state IN ('started', 'inProcess', 'completed', 'failed')),
  processing_progress INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS satchel.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES satchel.entries(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON satchel.entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_type ON satchel.entries(type);
CREATE INDEX IF NOT EXISTS idx_comments_entry_id ON satchel.comments(entry_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION satchel.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER set_entries_updated_at
BEFORE UPDATE ON satchel.entries
FOR EACH ROW
EXECUTE FUNCTION satchel.update_updated_at();

CREATE TRIGGER set_comments_updated_at
BEFORE UPDATE ON satchel.comments
FOR EACH ROW
EXECUTE FUNCTION satchel.update_updated_at();
