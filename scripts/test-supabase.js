// Simple script to test Supabase connection and operations
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 5 chars):', supabaseKey.substring(0, 5) + '...');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test query - Supabase uses count() not count(*)
    const { data, error } = await supabase
      .from('satchel.entries')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Error querying entries:', error);
      return;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Query result:', data);
    
    // Test insert
    console.log('\nTesting insert operation...');
    const testEntry = {
      user_id: 'test-user-script',
      type: 'article',
      url: 'https://example.com/test',
      processing_state: 'started',
      processing_progress: 0,
      metadata: { title: 'Test Article from Script' }
    };
    
    console.log('Attempting to insert:', testEntry);
    
    try {
      const insertResult = await supabase
        .from('satchel.entries')
        .insert(testEntry)
        .select();
      
      console.log('Raw insert result:', JSON.stringify(insertResult, null, 2));
      
      if (insertResult.error) {
        console.error('Error inserting test entry:', insertResult.error);
        if (Object.keys(insertResult.error).length === 0) {
          console.log('Empty error object received. Checking status...');
          console.log('Status:', insertResult.status);
          console.log('Status text:', insertResult.statusText);
        }
        return;
      }
    } catch (e) {
      console.error('Exception during insert:', e);
      return;
    }
    
    console.log('Successfully inserted test entry!');
    console.log('Insert result:', insertResult.data);
    
    // Test fetch
    console.log('\nTesting fetch operation...');
    const fetchResult = await supabase
      .from('satchel.entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (fetchResult.error) {
      console.error('Error fetching entries:', fetchResult.error);
      return;
    }
    
    console.log('Successfully fetched entries!');
    console.log('Recent entries:', fetchResult.data);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the test
testConnection();
