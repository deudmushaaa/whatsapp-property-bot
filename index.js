import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
// readlineSync is no longer needed for deployment
// import readlineSync from 'readline-sync'; 
import { processMessage } from './messageHandler.js';
import { testConnection } from './supabaseClient.js';
import dotenv from 'dotenv';

dotenv.config();

// Test database connection before starting
const dbConnected = await testConnection();
if (!dbConnected) {
  console.error('❌ Cannot start bot without database connection');
  process.exit(1);
}

let sock;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  
  sock = makeWASocket({
    auth: state,
    // IMPORTANT: Set to true for server deployments to see QR code in logs
    printQRInTerminal: true, 
  });

  // REMOVED: The interactive pairing code block is not suitable for server deployment
  // It would cause the app to hang, waiting for user input that can't be provided.
  // The QR code printed in the terminal is the standard way for servers.

  // Save credentials when updated
  sock.ev.on('creds.update', saveCreds);

  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('❌ Connection closed:', lastDisconnect?.error?.message || 'Unknown reason');
      
      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 3 seconds...');
        setTimeout(() => connectToWhatsApp(), 3000);
      } else {
        console.log('⚠️  Logged out. Delete the auth_info folder on the server volume and restart.');
      }
    } else if (connection === 'open') {
      console.log(`
✅ Connected to WhatsApp!`);
      console.log(`🤖 Property Management Bot is running...`);
      console.log(`💬 Send a message from a registered landlord number to test.
`);
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;
      
      const text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text ||
                   msg.message.imageMessage?.caption;
      
      if (!text) continue;
      
      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      
      if (isGroup) continue;
      
      const maskedPhone = from.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
      console.log(`
📩 Message from ${maskedPhone}:`);
      console.log(`   "${text}"`);
      
      try {
        await sock.sendPresenceUpdate('composing', from);
        const response = await processMessage(text, from, sock);
        await sock.sendPresenceUpdate('paused', from);
        await sock.sendMessage(from, { text: response });
        console.log(`✅ Replied: ${response}
`);
        
      } catch (error) {
        console.error('❌ Error processing message:', error.message);
        
        try {
          await sock.sendMessage(from, { 
            text: '❌ Sorry, something went wrong. Please try again or contact support.' 
          });
        } catch (sendError) {
          console.error('Failed to send error message:', sendError);
        }
      }
    }
  });

  return sock;
}

// Graceful shutdown
const shutdown = async () => {
  console.log(`
🛑 Shutting down bot...`);
  if (sock) {
    // Using logout() is cleaner for a graceful shutdown
    await sock.logout('Bot shutting down');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot
console.log(`🚀 Starting WhatsApp Property Management Bot...\n`);
connectToWhatsApp().catch(err => {
  console.error('❌ Failed to start bot:', err);
  process.exit(1);
});
