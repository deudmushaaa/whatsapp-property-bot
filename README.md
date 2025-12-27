# WhatsApp Property Management Bot 🏠💬

A conversational WhatsApp bot for Ugandan landlords to manage rent payments via natural language.

## 🎯 What It Does

Landlords can:
- ✅ Record payments by sending WhatsApp messages: "Kamau paid 500000"
- 📄 Automatically send PDF receipts to tenants
- 🔍 Check payment status: "Did Sarah pay this month?"
- 💰 Track all payments in Supabase database

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account with tables set up
- Groq API key (free at console.groq.com)
- WhatsApp account

### 2. Installation

```bash
# Install dependencies
npm install

# Run setup wizard
npm run setup

# Start the bot
npm start
```

### 3. Connect WhatsApp

When you run `npm start`, a QR code will appear. Scan it with WhatsApp:

1. Open WhatsApp on your phone
2. Go to **Settings → Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code

✅ Once connected, the bot runs 24/7!

## 📋 Required Supabase Tables

Your Supabase database should have these tables:

### `landlords`
```sql
CREATE TABLE landlords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `properties`
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landlord_id UUID REFERENCES landlords(id),
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `tenants`
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  rent_amount INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `payments`
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id),
  amount INTEGER NOT NULL,
  period TEXT NOT NULL, -- Format: YYYY-MM
  payment_method TEXT DEFAULT 'whatsapp_bot',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 💬 How to Use

### Recording Payments

Send any of these messages via WhatsApp:

```
"Kamau paid 500000"
"Record payment: John 600k December"
"Amina 450000 for November"
"500k from Sarah"
```

The bot will:
1. ✅ Record payment in database
2. 📄 Generate PDF receipt
3. 📤 Send receipt to tenant's WhatsApp
4. 💬 Reply with confirmation

### Checking Payment Status

```
"Did Kamau pay this month?"
"Has Sarah paid for December?"
```

The bot replies with payment status.

## 🔧 Configuration

### Environment Variables (`.env`)

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_anon_key

# Groq AI
GROQ_API_KEY=gsk_xxxxx

# Optional
ENABLE_LOGGING=true
```

### Phone Number Format

Landlord and tenant phone numbers in Supabase should be:
- Without `+`: `256700000000`
- Or with `+`: `+256700000000`

Both formats work!

## 📁 Project Structure

```
whatsapp-bot/
├── index.js              # Main bot (WhatsApp connection)
├── messageHandler.js     # AI processing with Groq
├── receiptGenerator.js   # PDF creation & sending
├── supabaseClient.js     # Database connection
├── setup.js              # Setup wizard
├── .env                  # Your credentials (DO NOT COMMIT)
├── auth_info/            # WhatsApp session (auto-created)
└── package.json          # Dependencies
```

## 🐛 Troubleshooting

### "Supabase connection failed"
- Check your `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Verify tables exist in Supabase
- Check internet connection

### "Your number is not registered"
- Add your WhatsApp number to the `landlords` table in Supabase
- Phone number should match exactly (with or without `+`)

### "Couldn't find tenant"
- Check spelling of tenant name
- Verify tenant exists in `tenants` table
- Check that tenant belongs to your property (`landlord_id` chain)

### WhatsApp disconnects randomly
- This is normal! The bot auto-reconnects
- Session is saved in `auth_info/` folder
- Delete `auth_info/` and rescan QR if issues persist

### Receipt not sending
- Check tenant phone number in database
- Verify Puppeteer installed correctly
- Check `/tmp` folder permissions

## 🚀 Deployment to Railway

Once tested locally:

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

2. Deploy to Railway:
- Go to [railway.app](https://railway.app)
- "New Project" → "Deploy from GitHub"
- Select your repo
- Add environment variables (SUPABASE_URL, SUPABASE_KEY, GROQ_API_KEY)

3. Connect WhatsApp:
- Check Railway logs for QR code
- Scan once
- Bot runs forever!

## 💰 Cost Estimation

**For 100 landlords:**
- Groq API: ~15,000 UGX/year (generous free tier)
- Railway hosting: FREE (500 hours/month)
- Supabase: FREE (generous tier)
- **Total: ~15k UGX/year**

**Your profit:** 100 landlords × 100k = 10M UGX/year  
**Net profit:** ~9.985M UGX/year 🎉

## 📱 Example Conversation

```
You: Kamau paid 500000

Bot: ✅ 500,000 UGX recorded for Kamau Mwangi (2024-12).
     📄 Receipt sent to 256700123456.

---

You: Did Sarah pay this month?

Bot: ❌ No, Sarah Nakato has not paid for 2024-12 yet.

---

You: Record payment John 600k December

Bot: ✅ 600,000 UGX recorded for John Okello (2024-12).
     📄 Receipt sent to 256700789012.
```

## 🔐 Security Notes

**NEVER commit these files:**
- `.env` (contains API keys)
- `auth_info/` (WhatsApp session)

Already in `.gitignore`!

## 🤝 Support

Built for Ugandan landlords by Micheal Owen & Mushamba Dauda.

**Issues?** Check:
1. Are all environment variables set?
2. Is your phone number in the `landlords` table?
3. Are tenant names spelled correctly?

## 📄 License

MIT License - Use it, modify it, profit from it!

---

**🎉 Ready to revolutionize property management in Uganda!**