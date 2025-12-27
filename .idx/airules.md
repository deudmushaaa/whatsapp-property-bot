# Gemini AI Rules for WhatsApp Property Management Bot

## 1. Project Overview
This is a WhatsApp bot for property management in Uganda. The bot allows landlords to record rent payments via natural language WhatsApp messages and automatically generates/sends receipts to tenants.

**Tech Stack:**
- Node.js 18+
- Baileys (WhatsApp Web API)
- Groq AI (for natural language processing)
- Supabase (PostgreSQL database)
- Puppeteer (PDF generation)

## 2. Code Style & Standards

### Always Follow These Rules:
- Use ES6 modules (`import/export`, not `require`)
- Use `async/await` for all asynchronous operations
- Add comprehensive error handling with try-catch blocks
- Log all important events to console for debugging
- Use descriptive variable names (no single letters except in loops)
- Add comments explaining WHY, not WHAT the code does

### File Organization:
```
whatsapp-bot/
├── index.js              # Main bot connection & message handling
├── messageHandler.js     # AI processing logic with Groq
├── receiptGenerator.js   # PDF receipt creation & sending
├── supabaseClient.js     # Database connection
├── .env                  # Environment variables (NEVER commit)
└── package.json          # Dependencies
```

## 3. Key Technical Requirements

### Baileys Configuration:
- Always use `useMultiFileAuthState` to persist WhatsApp sessions
- Store auth in `./auth_info` directory
- Handle reconnections gracefully on disconnect
- Use `printQRInTerminal: true` for initial setup
- Ignore messages from self (`msg.key.fromMe`)

### Supabase Schema (Already Exists):
```sql
landlords: id (uuid), name (text), phone (text), email (text)
properties: id (uuid), landlord_id (uuid), address (text)
tenants: id (uuid), property_id (uuid), name (text), phone (text), rent_amount (int)
payments: id (uuid), tenant_id (uuid), amount (int), period (text), recorded_at (timestamp)
```

### Groq AI Processing:
- Use model: `llama-3.3-70b-versatile`
- Keep temperature low (0.1) for consistent extraction
- Always request JSON-only responses (no markdown)
- Extract: tenant_name, amount, period, action type
- Handle failed parsing gracefully

### WhatsApp Message Format:
- Reply messages should use emojis: ✅ ❌ 🔍 📄 🤔
- Keep responses concise (2-3 lines max)
- Always confirm actions taken
- Provide helpful error messages

## 4. Common Patterns

### Message Processing Flow:
1. Receive WhatsApp message
2. Extract landlord phone number from message sender
3. Query Supabase to verify landlord exists
4. Send message to Groq AI for intent/data extraction
5. Validate extracted data
6. Perform database operations (insert payment)
7. Generate receipt PDF
8. Send receipt to tenant via WhatsApp
9. Reply confirmation to landlord

### Error Handling:
```javascript
try {
  // Operation
} catch (error) {
  console.error('Context-specific error:', error);
  // Send user-friendly message to WhatsApp
  // Don't expose technical details to users
}
```

## 5. Firebase Studio Specific Instructions

### When Helping with Code:
- Assume Node.js 18+ is available
- All packages install via npm (not yarn/pnpm)
- Use `node index.js` to run the bot
- Environment variables load from `.env` file
- Terminal is bash shell

### When Debugging:
- Check terminal output for errors
- Verify `.env` file has all required keys
- Check Supabase connection first
- Test Baileys connection with QR scan
- Verify Groq API key is valid

### Dependencies to Install:
```bash
npm install @whiskeysockets/baileys
npm install @supabase/supabase-js
npm install groq-sdk
npm install qrcode-terminal
npm install puppeteer
npm install dotenv
```

## 6. Uganda-Specific Context

### Currency & Formatting:
- Always use UGX (Ugandan Shillings)
- Format amounts with commas: 500,000 not 500000
- Phone numbers format: +256XXXXXXXXX or 256XXXXXXXXX

### Business Logic:
- Default payment period is current month if not specified
- Fuzzy match tenant names (case-insensitive, partial match)
- Landlords can have multiple properties
- Each property can have multiple tenants

### WhatsApp Usage Patterns:
- Keep messages short and clear
- Use English (primary) 
- Landlords may write informally: "kamau 500k" should work
- Accept various date formats: "December", "Dec", "12", "2024-12"

## 7. Security & Privacy

### Never Log Sensitive Data:
- Don't log phone numbers in full (mask: +256XXX...XXX)
- Don't log payment amounts in detail
- Don't expose Supabase keys in error messages

### WhatsApp Session:
- `auth_info/` directory contains sensitive session data
- Add to `.gitignore` immediately
- Session should persist across restarts

### Environment Variables Required:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key
GROQ_API_KEY=gsk_xxx
```

## 8. Testing & Validation

### Before Suggesting Code:
- Verify all imports are correct
- Check that async functions are properly awaited
- Ensure error handling covers edge cases
- Confirm phone number formatting is consistent

### Test Scenarios to Consider:
- Tenant name with typo (fuzzy matching)
- Missing tenant in database (clear error)
- Invalid amount format (validation)
- WhatsApp disconnection (auto-reconnect)
- Groq API timeout (retry logic)

## 9. AI Assistant Behavior

### Do:
- Provide complete, working code snippets
- Explain WHY architectural decisions are made
- Suggest optimizations for Uganda's network conditions
- Consider cost implications (API calls)
- Test code mentally before suggesting

### Don't:
- Suggest complex solutions when simple ones work
- Assume features exist without checking
- Use deprecated Baileys methods
- Suggest packages that require native compilation
- Over-engineer for a MVP

## 10. Deployment Considerations

### For Railway Deployment Later:
- Use `start` script in package.json: `"start": "node index.js"`
- Set all environment variables in Railway dashboard
- Use persistent volume for `auth_info/` directory
- Monitor logs for connection issues
- Expect occasional WhatsApp reconnections (normal)

### Performance:
- Keep bot lightweight (< 100MB memory)
- Process messages sequentially (avoid concurrent processing)
- Cache landlord lookups if needed
- Limit PDF generation to essential info

---

**Remember:** This bot is the KILLER FEATURE that differentiates from competitors. The conversational payment recording via WhatsApp is what makes Ugandan landlords say "shut up and take my money!"

Keep it simple, reliable, and FAST. Landlords are busy people running multiple businesses.