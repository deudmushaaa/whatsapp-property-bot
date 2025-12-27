import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setup() {
  console.log('\n🚀 WhatsApp Property Bot Setup\n');
  console.log('This will help you configure your .env file\n');

  // Check if .env already exists
  if (fs.existsSync('.env')) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  // Get Supabase credentials
  console.log('\n📊 Supabase Configuration');
  console.log('Get these from: https://app.supabase.com/project/_/settings/api\n');
  
  const supabaseUrl = await question('Supabase URL: ');
  const supabaseKey = await question('Supabase anon/public key: ');

  // Get Groq API key
  console.log('\n🤖 Groq AI Configuration');
  console.log('Get your API key from: https://console.groq.com/keys\n');
  
  const groqKey = await question('Groq API Key: ');

  // Create .env file
  const envContent = `# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_KEY=${supabaseKey}

# Groq API Configuration
GROQ_API_KEY=${groqKey}

# Optional: Logging
ENABLE_LOGGING=true
`;

  fs.writeFileSync('.env', envContent);

  console.log('\n✅ .env file created successfully!\n');
  console.log('Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Run: npm start');
  console.log('3. Scan QR code with your WhatsApp\n');

  // Create .gitignore if it doesn't exist
  if (!fs.existsSync('.gitignore')) {
    const gitignore = `# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local
.env.*.local

# WhatsApp session (SENSITIVE!)
auth_info/
*.session.json

# Temporary files
*.log
*.tmp
/tmp/

# PDF receipts
receipts/
*.pdf

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
`;
    fs.writeFileSync('.gitignore', gitignore);
    console.log('✅ .gitignore created\n');
  }

  rl.close();
}

setup().catch(error => {
  console.error('Setup error:', error);
  rl.close();
  process.exit(1);
});