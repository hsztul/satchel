#!/usr/bin/env node

/**
 * This script helps set up the Supabase environment variables
 * and tests the connection to your Supabase project.
 */

const { execSync } = require('child_process');
const { writeFileSync, existsSync, readFileSync } = require('fs');
const { join } = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = join(process.cwd(), '.env.local');

// Check if .env.local already exists
let existingEnv = {};
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      existingEnv[key.trim()] = value.trim();
    }
  });
}

console.log('🔧 Satchel Supabase Setup');
console.log('-------------------------');
console.log('This script will help you set up your Supabase environment variables.');
console.log('You can find these values in your Supabase project settings under "API".');
console.log('');

const questions = [
  {
    key: 'NEXT_PUBLIC_SUPABASE_URL',
    question: 'Enter your Supabase URL (e.g., https://your-project.supabase.co):',
    default: existingEnv.NEXT_PUBLIC_SUPABASE_URL || ''
  },
  {
    key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    question: 'Enter your Supabase anon key:',
    default: existingEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  }
];

const answers = {};

function askQuestion(index) {
  if (index >= questions.length) {
    saveEnvFile();
    return;
  }

  const { key, question, default: defaultValue } = questions[index];
  const defaultPrompt = defaultValue ? ` (${defaultValue})` : '';

  rl.question(`${question}${defaultPrompt} `, (answer) => {
    answers[key] = answer || defaultValue;
    askQuestion(index + 1);
  });
}

function saveEnvFile() {
  // Merge with existing env vars
  const envVars = { ...existingEnv, ...answers };
  
  // Convert to string
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Save to .env.local
  writeFileSync(envPath, envContent);
  
  console.log('\n✅ Environment variables saved to .env.local');
  
  // Test the connection
  console.log('\n🔍 Testing connection to Supabase...');
  
  try {
    // Create a temporary test file
    const testFile = join(process.cwd(), 'test-supabase.js');
    writeFileSync(testFile, `
      require('dotenv').config({ path: '.env.local' });
      const { createClient } = require('@supabase/supabase-js');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase environment variables');
        process.exit(1);
      }
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      async function testConnection() {
        try {
          const { data, error } = await supabase.from('satchel.entries').select('count(*)', { count: 'exact' }).limit(0);
          
          if (error) {
            if (error.code === '42P01') {
              console.log('⚠️ The satchel.entries table does not exist yet. Please run the database schema script.');
            } else {
              throw error;
            }
          } else {
            console.log('✅ Successfully connected to Supabase!');
          }
        } catch (err) {
          console.error('❌ Failed to connect to Supabase:', err.message);
        }
        process.exit(0);
      }
      
      testConnection();
    `);
    
    // Run the test
    execSync('node test-supabase.js', { stdio: 'inherit' });
    
    // Clean up
    execSync('rm test-supabase.js');
    
    console.log('\n🚀 Setup complete! You can now run your application with:');
    console.log('npm run dev');
  } catch (error) {
    console.error('\n❌ Failed to test Supabase connection:', error.message);
  }
  
  rl.close();
}

// Start asking questions
askQuestion(0);
