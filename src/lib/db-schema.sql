-- Create entry_type enum
CREATE TYPE entry_type AS ENUM ('ARTICLE', 'COMPANY', 'NOTE');

-- Create the entry table
CREATE TABLE IF NOT EXISTS entry (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  title TEXT NOT NULL,
  description TEXT,
  type entry_type NOT NULL,
  user_id TEXT NOT NULL,
  embedding TEXT
);

-- Create the article table
CREATE TABLE IF NOT EXISTS article (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  author TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  content TEXT,
  summary TEXT,
  key_points TEXT,
  image_url TEXT,
  CONSTRAINT article_entry_id_unique UNIQUE (entry_id)
);

-- Create the company table
CREATE TABLE IF NOT EXISTS company (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  website TEXT,
  industry TEXT,
  founded INTEGER,
  location TEXT,
  employee_count INTEGER,
  funding DECIMAL(10, 2),
  funding_round TEXT,
  company_stage TEXT,
  key_people TEXT,
  competitors TEXT,
  product_offering TEXT,
  CONSTRAINT company_entry_id_unique UNIQUE (entry_id)
);

-- Create the note table
CREATE TABLE IF NOT EXISTS note (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  category TEXT,
  insights TEXT,
  CONSTRAINT note_entry_id_unique UNIQUE (entry_id)
);

-- Create the tag table
CREATE TABLE IF NOT EXISTS tag (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  CONSTRAINT tag_name_unique UNIQUE (name)
);

-- Create the entry_tags join table
CREATE TABLE IF NOT EXISTS entry_tag (
  entry_id TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  CONSTRAINT entry_tag_pkey PRIMARY KEY (entry_id, tag_id)
);

-- Create connections tables
CREATE TABLE IF NOT EXISTS connection_from (
  id TEXT PRIMARY KEY,
  from_entry_id TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  to_entry_id TEXT NOT NULL,
  strength INTEGER DEFAULT 1,
  description TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT connection_from_unique UNIQUE (from_entry_id, to_entry_id)
);

CREATE TABLE IF NOT EXISTS connection_to (
  id TEXT PRIMARY KEY,
  to_entry_id TEXT NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  from_entry_id TEXT NOT NULL,
  strength INTEGER DEFAULT 1,
  description TEXT,
  ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT connection_to_unique UNIQUE (from_entry_id, to_entry_id)
);

-- Create functions and triggers for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_entry_updated_at
BEFORE UPDATE ON entry
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();
