# Al-Baari Modest Attire - Online Cloud & Vercel Deployment Guide

This guide explains how to deploy **Al-Baari Modest Attire** online using **Supabase** (PostgreSQL Cloud Database) and **Vercel** (Cloud Hosting & CDN).

---

## 🌟 Architecture Overview
- **Frontend**: Single-Page App (HTML5 + Tailwind CSS + Lucide Icons + Vanilla JS) hosted on **Vercel**.
- **Backend / Database**: **Supabase PostgreSQL** cloud database with Row Level Security (RLS) and Supabase Realtime multi-device sync.
- **Thermal Printing & Receipts**: Operates directly in standard web browsers via native `window.print()` (with pixel-perfect 80mm thermal receipt styles).
- **Dual Compatibility**: Can run both as a cloud web app in any browser (mobile, tablet, PC, laptop) AND as the offline/desktop Electron app.

---

## 🚀 Step 1: Create Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in or create a free account.
2. Click **New Project**.
3. Choose a name (e.g. `al-baari-modest-attire`), set a secure database password, and select your region.
4. Once the project is ready, click **Project Settings** (gear icon) -> **API**.
5. Copy two values:
   - **Project URL** (e.g., `https://xyzabcdefghijklm.supabase.co`)
   - **anon / public key** (e.g., `eyJhbGciOiJIUzI1NiIsInR...`)

---

## 🗄️ Step 2: Set Up the Database Schema

1. In your Supabase dashboard, go to the **SQL Editor** tab (left sidebar).
2. Open the file [`supabase_schema.sql`](./supabase_schema.sql) in this repository.
3. Copy its entire contents, paste it into the Supabase SQL Editor, and click **Run** (green button).
4. All tables, security policies, indexes, and initial configurations are now created.

---

## 📦 Step 3: Migrate Your Existing Data to Supabase (Optional but Recommended)

To transfer all your existing products (850+ items), customers, companies, invoices (1,000+ sales), and expense history from your local SQLite database directly up to Supabase:

Run this command in your project directory:

```bash
node migrate_to_supabase.js <YOUR_SUPABASE_URL> <YOUR_SUPABASE_ANON_OR_SERVICE_ROLE_KEY>
```

**Example:**
```bash
node migrate_to_supabase.js https://xyzabcdef.supabase.co eyJhbGciOiJIUzI1Ni...
```

The script will automatically scan your local database and upload all categories, products, stock levels, sales history, and customer accounts to Supabase with progress logs!

---

## ☁️ Step 4: Deploy to Vercel (1-Click)

1. Push your repository to GitHub:
   ```bash
   git add .
   git commit -m "Configure online deployment for Supabase and Vercel"
   git push origin main
   ```
2. Go to [https://vercel.com](https://vercel.com) and log in.
3. Click **Add New...** -> **Project**.
4. Import your GitHub repository: `Al-Baari-Clothing---New-City-Arcade`.
5. Under **Build and Output Settings**:
   - `vercel.json` is already pre-configured to output `renderer`. Vercel will detect it automatically!
6. Click **Deploy**.
7. In ~30 seconds, Vercel gives you your live production URL (e.g. `https://al-baari-modest-attire.vercel.app`)!

---

## 🔑 Step 5: Connect Web App to Supabase

You can connect your live web app to Supabase in either of two ways:

### Option A: Via Settings UI in the Browser (No Code Edit)
1. Open your live Vercel URL in your browser.
2. Click **Settings** in the sidebar.
3. In the **Online Cloud Database (Supabase)** card:
   - Enter your **Supabase Project URL**.
   - Enter your **Supabase Anon Key**.
   - Click **Save & Connect**, then click **Test Connection**.
   - The badge will turn green: `🟢 Online & Connected`!

### Option B: Prefill in `renderer/supabase-config.js`
Open `renderer/supabase-config.js` and paste your URL and Key:
```javascript
window.SUPABASE_CONFIG = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```
Push to GitHub, and Vercel will deploy your pre-connected build automatically.

---

## 📱 Multi-Device & Mobile Access
Because the app is fully online:
- Cashiers can open the POS on laptops or cash counters.
- Store managers can view sales, inventory, and reports in real time from home, their phone, or iPad.
- All stock updates happen instantly via Supabase Realtime!
