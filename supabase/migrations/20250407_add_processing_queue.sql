-- Create a processing queue table for background jobs
CREATE TABLE IF NOT EXISTS satchel.processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES satchel.entries(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  result JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS processing_queue_entry_id_idx ON satchel.processing_queue(entry_id);
CREATE INDEX IF NOT EXISTS processing_queue_status_idx ON satchel.processing_queue(status);
CREATE INDEX IF NOT EXISTS processing_queue_agent_name_idx ON satchel.processing_queue(agent_name);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_processing_queue_updated_at
BEFORE UPDATE ON satchel.processing_queue
FOR EACH ROW
EXECUTE FUNCTION satchel.update_updated_at();

-- Create function to increment attempts counter
CREATE OR REPLACE FUNCTION satchel.increment_attempts(queue_item_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_attempts INTEGER;
BEGIN
  SELECT attempts INTO current_attempts
  FROM satchel.processing_queue
  WHERE id = queue_item_id;
  
  RETURN current_attempts + 1;
END;
$$;

-- Create RLS policies for the processing queue
ALTER TABLE satchel.processing_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for the processing queue
CREATE POLICY "Users can view their own processing queue items"
  ON satchel.processing_queue
  FOR SELECT
  USING (
    entry_id IN (
      SELECT id FROM satchel.entries WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert processing queue items for their entries"
  ON satchel.processing_queue
  FOR INSERT
  WITH CHECK (
    entry_id IN (
      SELECT id FROM satchel.entries WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update processing queue items for their entries"
  ON satchel.processing_queue
  FOR UPDATE
  USING (
    entry_id IN (
      SELECT id FROM satchel.entries WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete processing queue items for their entries"
  ON satchel.processing_queue
  FOR DELETE
  USING (
    entry_id IN (
      SELECT id FROM satchel.entries WHERE user_id = auth.uid()
    )
  );
