import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase environment variables are not set correctly');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Queue name for testing
const QUEUE_NAME = 'entry_processing_queue';

async function runTests() {
  console.log('🧪 Starting Queue Permission Tests');
  console.log('==================================');
  
  // Test 1: Check if queue exists
  try {
    console.log('Test 1: Checking if queue exists...');
    const { data: queues, error } = await supabase.rpc('pgmq.list_queues');
    
    if (error) {
      console.error('❌ Error checking queues:', error);
    } else {
      const queueExists = queues.some((q: any) => q.queue_name === QUEUE_NAME);
      if (queueExists) {
        console.log('✅ Queue exists:', QUEUE_NAME);
      } else {
        console.log('❌ Queue does not exist:', QUEUE_NAME);
        console.log('Available queues:', queues.map((q: any) => q.queue_name).join(', '));
      }
    }
  } catch (error) {
    console.error('❌ Exception in Test 1:', error);
  }
  
  // Test 2: Try to send a message using pgmq directly
  try {
    console.log('\nTest 2: Sending message using pgmq directly...');
    const message = { test: 'direct', timestamp: new Date().toISOString() };
    
    const { data, error } = await supabase.rpc('pgmq.send', {
      queue_name: QUEUE_NAME,
      msg: message,
      delay: 0
    });
    
    if (error) {
      console.error('❌ Error sending message directly:', error);
    } else {
      console.log('✅ Message sent directly, ID:', data);
    }
  } catch (error) {
    console.error('❌ Exception in Test 2:', error);
  }
  
  // Test 3: Try to send a message using pgmq_public
  try {
    console.log('\nTest 3: Sending message using pgmq_public...');
    const message = { test: 'public', timestamp: new Date().toISOString() };
    
    const { data, error } = await supabase.schema('pgmq_public').rpc('send', {
      queue_name: QUEUE_NAME,
      message,
      sleep_seconds: 0
    });
    
    if (error) {
      console.error('❌ Error sending message via pgmq_public:', error);
    } else {
      console.log('✅ Message sent via pgmq_public, ID:', data);
    }
  } catch (error) {
    console.error('❌ Exception in Test 3:', error);
  }
  
  // Test 4: Check RLS status
  try {
    console.log('\nTest 4: Checking RLS status...');
    const { data, error } = await supabase.rpc('check_rls_status', {
      schema_name: 'pgmq',
      table_name: 'q_' + QUEUE_NAME
    });
    
    if (error) {
      console.error('❌ Error checking RLS status:', error);
      console.log('Creating RLS check function...');
      
      // Create a function to check RLS status
      const { error: createError } = await supabase.rpc('create_rls_check_function');
      
      if (createError) {
        console.error('❌ Error creating RLS check function:', createError);
      } else {
        console.log('✅ RLS check function created, please run the script again');
      }
    } else {
      console.log('✅ RLS status:', data);
    }
  } catch (error) {
    console.error('❌ Exception in Test 4:', error);
  }
  
  console.log('\n==================================');
  console.log('🏁 Queue Permission Tests Complete');
}

// Create the RLS check function if it doesn't exist
async function createRlsCheckFunction() {
  const { error } = await supabase.rpc('execute_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION public.check_rls_status(schema_name text, table_name text)
      RETURNS json
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result json;
      BEGIN
        EXECUTE format('
          SELECT json_build_object(
            ''table_exists'', EXISTS(SELECT 1 FROM pg_tables WHERE schemaname = %L AND tablename = %L),
            ''rls_enabled'', (SELECT rowsecurity FROM pg_tables WHERE schemaname = %L AND tablename = %L),
            ''policies'', (
              SELECT json_agg(json_build_object(
                ''policy_name'', polname,
                ''cmd'', CASE polcmd WHEN ''r'' THEN ''SELECT'' WHEN ''a'' THEN ''INSERT'' WHEN ''w'' THEN ''UPDATE'' WHEN ''d'' THEN ''DELETE'' ELSE ''ALL'' END,
                ''roles'', (SELECT array_agg(rolname) FROM pg_roles WHERE oid = ANY(polroles))
              ))
              FROM pg_policy
              WHERE polrelid = (SELECT oid FROM pg_class WHERE relname = %L AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = %L))
            )
          )
        ', schema_name, table_name, schema_name, table_name, table_name, schema_name) INTO result;
        
        RETURN result;
      END;
      $$;
      
      CREATE OR REPLACE FUNCTION public.create_rls_check_function()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- This function exists just to call it from the client
        -- The actual function is created above
        NULL;
      END;
      $$;
      
      GRANT EXECUTE ON FUNCTION public.check_rls_status TO anon, authenticated;
      GRANT EXECUTE ON FUNCTION public.create_rls_check_function TO anon, authenticated;
    `
  });
  
  if (error) {
    console.error('Error creating RLS check functions:', error);
    return false;
  }
  
  return true;
}

// Run the tests
async function main() {
  await createRlsCheckFunction();
  await runTests();
}

main().catch(console.error);
