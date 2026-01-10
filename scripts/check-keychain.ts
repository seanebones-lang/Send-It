#!/usr/bin/env ts-node

/**
 * Check for Vercel token in macOS keychain
 */

import * as keytar from 'keytar';

const SERVICE_NAME = 'send-it';

async function checkKeychain() {
  console.log('Checking for Vercel token in keychain...\n');
  
  // Try different account name variations
  const accountNames = [
    'vercel-token',
    'vercel',
    'Vercel',
    'VERCEL_TOKEN',
  ];

  for (const accountName of accountNames) {
    try {
      console.log(`Trying: Service="${SERVICE_NAME}", Account="${accountName}"...`);
      const token = await keytar.getPassword(SERVICE_NAME, accountName);
      if (token) {
        console.log(`✓ Found token with account name: "${accountName}"`);
        console.log(`  Token preview: ${token.substring(0, 10)}...${token.substring(token.length - 4)}\n`);
        return { accountName, token };
      } else {
        console.log(`  ✗ No token found\n`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error instanceof Error ? error.message : error}\n`);
    }
  }

  // Try to find all passwords for the service
  try {
    console.log(`\nAttempting to find all accounts for service "${SERVICE_NAME}"...`);
    // Note: keytar doesn't have a built-in list function, but we can try common names
    console.log('Note: keytar does not support listing all accounts. You may need to store the token using the app.\n');
  } catch (error) {
    console.error('Error:', error);
  }

  return null;
}

checkKeychain()
  .then((result) => {
    if (!result) {
      console.log('❌ No Vercel token found in keychain.');
      console.log('\nTo store a Vercel token in your keychain, you can:');
      console.log('1. Use your Electron app to store it');
      console.log('2. Store it manually using this command:');
      console.log(`   node -e "require('keytar').setPassword('${SERVICE_NAME}', 'vercel-token', 'YOUR_TOKEN_HERE')"`);
      process.exit(1);
    } else {
      console.log('✓ Token found! You can use it to deploy.');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('Error checking keychain:', error);
    process.exit(1);
  });
