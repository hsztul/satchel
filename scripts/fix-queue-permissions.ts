import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Note: Using service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not set correctly');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Queue name for testing
const QUEUE_NAME = 'entry_processing_queue';

async function fixQueuePermissions() {
  console.log('🔧 Starting Queue Permission Fixes');
  console.log('==================================');
  
  try {
    console.log('Step 1: Checking if queue exists...');
    const { data: queues, error: listError } = await supabase.rpc('pgmq.list_queues');
    
    if (listError) {
      console.error('❌ Error checking queues:', listError);
      return;
    }
    
    const queueExists = queues.some((q: any) => q.queue_name === QUEUE_NAME);
    if (!queueExists) {
      console.log('❌ Queue does not exist, creating it...');
      
      const { error: createError } = await supabase.rpc('pgmq.create_queue', {
        queue_name: QUEUE_NAME,
        is_unlogged: false,
        is_partitioned: false
      });
      
      if (createError) {
        console.error('❌ Error creating queue:', createError);
        return;
      }
      
      console.log('✅ Queue created successfully');
    } else {
      console.log('✅ Queue exists:', QUEUE_NAME);
    }
    
    console.log('\nStep 2: Applying SQL fixes for permissions...');
    
    // SQL to fix permissions
    const fixSql = `
      -- Grant usage on schemas
      GRANT USAGE ON SCHEMA pgmq TO anon, authenticated;
      GRANT USAGE ON SCHEMA pgmq_public TO anon, authenticated;
      
      -- Grant execute on all functions in pgmq_public
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq_public TO anon, authenticated;
      
      -- Enable RLS on queue tables
      ALTER TABLE pgmq.q_${QUEUE_NAME} ENABLE ROW LEVEL SECURITY;
      ALTER TABLE pgmq.a_${QUEUE_NAME} ENABLE ROW LEVEL SECURITY;
      
      -- Create policies for active queue
      DO $$
      BEGIN
        -- Drop existing policies if they exist
        BEGIN
          DROP POLICY IF EXISTS "Allow all access to queue" ON pgmq.q_${QUEUE_NAME};
        EXCEPTION WHEN OTHERS THEN
          -- Policy doesn't exist, continue
        END;
        
        -- Create new policy
        CREATE POLICY "Allow all access to queue" 
        ON pgmq.q_${QUEUE_NAME}
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
          DROP POLICY IF EXISTS "Allow all access to archive queue" ON pgmq.a_${QUEUE_NAME};
        EXCEPTION WHEN OTHERS THEN
          -- Policy doesn't exist, continue
        END;
        
        -- Create new policy
        CREATE POLICY "Allow all access to archive queue" 
        ON pgmq.a_${QUEUE_NAME}
        FOR ALL
        TO anon, authenticated
        USING (true);
      END;
      $$;
      
      -- Grant table permissions
      GRANT ALL ON pgmq.q_${QUEUE_NAME} TO anon, authenticated;
      GRANT ALL ON pgmq.a_${QUEUE_NAME} TO anon, authenticated;
      
      -- Ensure sequence permissions
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pgmq TO anon, authenticated;
    `;
    
    const { error: sqlError } = await supabase.rpc('execute_sql', { sql: fixSql });
    
    if (sqlError) {
      console.error('❌ Error applying SQL fixes:', sqlError);
      
      // Create a function to execute SQL if it doesn't exist
      console.log('Creating SQL execution function...');
      const createSqlFunc = `
        CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
        RETURNS void
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$;
        
        GRANT EXECUTE ON FUNCTION public.execute_sql TO postgres, service_role;
      `;
      
      const { error: createFuncError } = await supabase.rpc('execute_sql', { sql: createSqlFunc });
      
      if (createFuncError) {
        console.error('❌ Error creating SQL execution function:', createFuncError);
        console.log('\n⚠️ Please run the following SQL in the Supabase SQL Editor:');
        console.log(createSqlFunc);
        console.log('\nThen run this script again.');
      } else {
        console.log('✅ SQL execution function created, please run the script again');
      }
      
      return;
    }
    
    console.log('✅ SQL fixes applied successfully');
    
    console.log('\nStep 3: Testing queue access...');
    
    // Test sending a message
    const message = { test: 'permission-fix', timestamp: new Date().toISOString() };
    
    const { data: sendData, error: sendError } = await supabase.schema('pgmq_public').rpc('send', {
      queue_name: QUEUE_NAME,
      message,
      sleep_seconds: 0
    });
    
    if (sendError) {
      console.error('❌ Error sending test message:', sendError);
    } else {
      console.log('✅ Test message sent successfully, ID:', sendData);
      
      // Try to read the message back
      const { data: readData, error: readError } = await supabase.schema('pgmq_public').rpc('read', {
        queue_name: QUEUE_NAME,
        sleep_seconds: 0,
        n: 10
      });
      
      if (readError) {
        console.error('❌ Error reading messages:', readError);
      } else {
        console.log('✅ Messages read successfully, count:', readData ? readData.length : 0);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  console.log('\n==================================');
  console.log('🏁 Queue Permission Fixes Complete');
}

// Run the fixes
fixQueuePermissions().catch(console.error);
