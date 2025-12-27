# WhatsApp Property Management Bot 🏠💬

A conversational WhatsApp bot for Ugandan landlords to manage rent payments via natural language.

## 🎯 What It Does

Landlords can:
- ✅ Record payments by sending WhatsApp messages: "Kamau paid 500000"
- 📄 Automatically send PDF receipts to tenants
- 🔍 Check payment status: "Did Sarah pay this month?"
- 💰 Track all payments in a Supabase database

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- Supabase account with tables set up
- Groq API key (free at console.groq.com)
- A WhatsApp account

### 2. Installation

```bash
# Install dependencies
npm install

# Run the interactive setup wizard
npm run setup

# Start the bot for local testing
npm start
```

### 3. Connect WhatsApp (Local)

When you run `npm start` locally, a QR code will appear in your terminal. Scan it with WhatsApp:

1. Open WhatsApp on your phone
2. Go to **Settings → Linked Devices**
3. Tap **Link a Device**
4. Scan the QR code

✅ Once connected, the bot runs on your computer!

---

## 🚀 Deployment to Render (for 24/7 Operation)

To run the bot continuously, deploy it as a free service on Render.com.

### Step 1: Push to GitHub

Make sure your latest code is on GitHub:
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy on Render

1.  **Sign up:** Create an account on [Render.com](https://render.com), connecting your GitHub account.
2.  **New Web Service:** On the dashboard, click **New+ → Web Service**.
3.  **Select Repo:** Choose your `whatsapp-property-bot` repository.
4.  **Configuration:**
    *   **Name:** Give it a unique name (e.g., `whatsapp-bot-uganda`).
    *   **Runtime:** Should automatically be `Node`.
    *   **Build Command:** `npm install`
    *   **Start Command:** `node index.js`
    *   **Instance Type:** Choose **Free**.

5.  **Add Persistent Disk (CRITICAL):**
    *   Scroll to **Advanced Settings**.
    *   Click `Add Persistent Disk`.
    *   **Name:** `auth-storage`
    *   **Mount Path:** `/var/data/auth_info` (This is where your WhatsApp session will be saved).

6.  **Add Environment Variables:**
    *   In the same Advanced section, add these four variables:
        *   `SUPABASE_URL` : Your Supabase URL.
        *   `SUPABASE_KEY` : Your Supabase anon key.
        *   `GROQ_API_KEY` : Your Groq API key.
        *   `AUTH_DIR_PATH`: `/var/data/auth_info` (Must match the disk mount path).

7.  **Deploy:** Click `Create Web Service`.

### Step 3: Final Connection

- Go to the **Logs** tab for your new service on Render.
- A **QR code** will appear in the logs. Scan it **one last time** with WhatsApp.
- Thanks to the persistent disk, you won't need to scan it again.

✅ Your bot is now live and will run 24/7!

## 💰 Cost Estimation

- **Render Hosting:** FREE (on the free instance type).
- **Groq AI API:** FREE (generous starting tier).
- **Supabase DB:** FREE (on the free tier).
- **Total Cost:** **0 UGX** to start and run.

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

## 📁 Project Structure

```
whatsapp-bot/
├── index.js              # Main bot (WhatsApp connection)
├── messageHandler.js     # AI processing with Groq
├── receiptGenerator.js   # PDF creation & sending
├── supabaseClient.js     # Database connection
├── setup.js              # Setup wizard
├── .env                  # Your credentials (DO NOT COMMIT)
├── auth_info/            # WhatsApp session (local dev)
└── package.json          # Dependencies
```

## 🔐 Security Notes

**NEVER commit these files:**
- `.env` (contains API keys)
- `auth_info/` (WhatsApp session)

This is handled by the `.gitignore` file.

## 🤝 Support

Built for Ugandan landlords by Micheal Owen & Mushamba Dauda.