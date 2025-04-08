-- Fix Queue Permissions for Supabase PGMQ
-- Run this script in the Supabase SQL Editor

-- Grant usage on schemas
GRANT USAGE ON SCHEMA pgmq TO anon, authenticated;
GRANT USAGE ON SCHEMA pgmq_public TO anon, authenticated;

-- Grant execute on all functions in pgmq_public
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq_public TO anon, authenticated;

-- Enable RLS on queue tables
ALTER TABLE pgmq.q_entry_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pgmq.a_entry_processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for active queue
DO $$
BEGIN
  -- Drop existing policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Allow all access to queue" ON pgmq.q_entry_processing_queue;
  EXCEPTION WHEN OTHERS THEN
    -- Policy doesn't exist, continue
  END;
  
  -- Create new policy
  CREATE POLICY "Allow all access to queue" 
  ON pgmq.q_entry_processing_queue
  FOR ALL
  TO anon, authenticated
  USING (true);
END;
$$;

-- Create policies for archive queue
DO $$
BEGIN
  -- Drop existing policies if they exist
  BEGIN
    DROP POLICY IF EXISTS "Allow all access to archive queue" ON pgmq.a_entry_processing_queue;
  EXCEPTION WHEN OTHERS THEN
    -- Policy doesn't exist, continue
  END;
  
  -- Create new policy
  CREATE POLICY "Allow all access to archive queue" 
  ON pgmq.a_entry_processing_queue
  FOR ALL
  TO anon, authenticated
  USING (true);
END;
$$;

-- Grant table permissions
GRANT ALL ON pgmq.q_entry_processing_queue TO anon, authenticated;
GRANT ALL ON pgmq.a_entry_processing_queue TO anon, authenticated;

-- Ensure sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pgmq TO anon, authenticated;

-- Grant direct access to pgmq tables (this is important for the pgmq_public functions to work)
GRANT SELECT, INSERT, UPDATE, DELETE ON pgmq.q_entry_processing_queue TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pgmq.a_entry_processing_queue TO anon, authenticated;

-- Verify RLS is enabled
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM 
    pg_tables 
WHERE 
    schemaname = 'pgmq' AND 
    tablename IN ('q_entry_processing_queue', 'a_entry_processing_queue');
