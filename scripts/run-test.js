// Simple script to run TypeScript files directly
require('dotenv').config({ path: '.env.local' });
require('ts-node').register();

// Check which script to run
const scriptName = process.argv[2];

if (!scriptName) {
  console.error('Please specify a script to run: test-queue-permissions or fix-queue-permissions');
  process.exit(1);
}

try {
  if (scriptName === 'test') {
    require('./test-queue-permissions.ts');
  } else if (scriptName === 'fix') {
    require('./fix-queue-permissions.ts');
  } else {
    console.error('Unknown script:', scriptName);
    console.error('Available scripts: test, fix');
    process.exit(1);
  }
} catch (error) {
  console.error('Error running script:', error);
  process.exit(1);
}
