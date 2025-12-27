import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { processMessage } from './messageHandler.js';
import { testConnection } from './supabaseClient.js';
import dotenv from 'dotenv';
import path from 'path';
import qrcode from 'qrcode-terminal';

dotenv.config();

const authInfoPath = process.env.AUTH_DIR_PATH || './auth_info';
console.log(`🔐 Using auth state from: ${path.resolve(authInfoPath)}`);

const dbConnected = await testConnection();
if (!dbConnected) {
  console.error('❌ Cannot start bot without database connection');
  process.exit(1);
}

let sock;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(authInfoPath);

  sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // --- FINAL SOLUTION --- //
      // Log the raw QR string. You can copy this and paste it into any online QR code generator.
      console.log('\n[FINAL ATTEMPT] Your QR code is ready.');
      console.log('\nCOPY THE STRING BELOW AND PASTE IT INTO a QR GENERATOR ONLINE (e.g., the-qrcode-generator.com)');
      console.log('===================================================');
      console.log('QR CODE STRING:', qr);
      console.log('===================================================\n');

      // We still generate it visually in the terminal as a backup.
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Connection closed:', lastDisconnect?.error?.message || 'Unknown reason');
      if (shouldReconnect) {
        console.log('🔄 Reconnecting...');
        connectToWhatsApp();
      } else {
        console.log('⚠️ Logged out. You will need to delete the auth_info folder and restart.');
      }
    } else if (connection === 'open') {
      console.log('\n✅ Connected to WhatsApp!');
      console.log('🤖 Property Management Bot is running...\n');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption;
      if (!text) continue;
      const from = msg.key.remoteJid;
      if (from.endsWith('@g.us')) continue;
      const maskedPhone = from.replace(/(\d{3})\d+(\d{3})/, '$1***$2');
      console.log(`\n📩 Message from ${maskedPhone}:
   \"${text}\"`);
      try {
        await sock.sendPresenceUpdate('composing', from);
        const response = await processMessage(text, from, sock);
        await sock.sendPresenceUpdate('paused', from);
        await sock.sendMessage(from, { text: response });
        console.log(`✅ Replied: ${response}\n`);
      } catch (error) {
        console.error('❌ Error processing message:', error.message);
        try {
          await sock.sendMessage(from, { text: '❌ Sorry, something went wrong. Please try again.' });
        } catch (sendError) {
          console.error('Failed to send error message:', sendError);
        }
      }
    }
  });

  return sock;
}

const shutdown = async () => {
  console.log('\n🛑 Shutting down bot...');
  if (sock) {
    await sock.logout('Bot shutting down');
  }
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('🚀 Starting WhatsApp Property Management Bot...\n');
connectToWhatsApp().catch(err => {
  console.error('❌ Failed to start bot:', err);
  process.exit(1);
});
