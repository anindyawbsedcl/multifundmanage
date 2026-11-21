# 🏦 MultiFundManage V6

A cloud-synchronized, multi-event fund management platform for Picnics, Pujas, Weddings, and Events. Accessible on Vercel with role-based access (admin credentials / read-only viewer share links).

---

## 🌟 Key Features

1. **Authentication & Security**
   - **Password Login** & **Email OTP Login** (registered emails only).
   - **Password Change** directly inside the user account settings.
   - Protected routes via Next.js middleware / session handling.

2. **Multi-Fund Management & Trash Bin**
   - Create unlimited funds with customizable event categories (Puja, Picnic, Wedding, Trip, Meeting, Custom).
   - Delete any fund to the **Trash Bin** with **30-day recovery** window or permanent wipe.
   - Grid and List layout views with search and filter.

3. **Collision-Proof Unique IDs**
   - Guaranteed unique identifiers across all records:
     - People: `PER-YYMMDD-XXXXX`
     - Donations: `DON-YYMMDD-XXXXX`
     - Expenses: `EXP-YYMMDD-XXXXX`
     - Receipts: `RCP-YYMMDD-XXXXX`

4. **Bi-Directional People & Donations Integration**
   - Adding a donation for a new name automatically creates the person in the People directory.
   - Typing in the donation field opens autocomplete suggestions from existing members with auto-filled designation.

5. **Fund Workspace (Modern UI with Dark/Light Mode)**
   - **Dashboard**: Summary metrics, Category-wise doughnut chart, Payment mode distribution, Daily income vs expense trend, Top donors leaderboard, and live activity feed.
   - **People Tab**: Member registry, contact info, designations, and expected pledge tracking.
   - **Donation Tab**: Date, donor, amount, payment mode (Cash, UPI, Bank, Cheque), reference numbers, and remarks.
   - **Expense Tab**: Date, category, description, amount, vendor/paid-to, payment mode, approval tracking, and remarks.
   - **Reports Tab**: Generate official letterhead statements in **PDF** format (A4 layout with signatory footer), **Image (PNG)**, or direct print. Includes Full Summary, Donation Register, Expense Register, Category Breakdown, and Balance Sheet.
   - **Settings Tab**: Update event details, manage custom categories, backup offline JSON data, and manage **Viewer Share Links**.

6. **Viewer-Only Share Links**
   - Admin has full access.
   - Generate unique read-only URLs (`/share/{token}`) allowing general members to monitor finances without logging in.

---

## 🚀 Setup & Deployment

### 1. Database Setup (Supabase)
1. Go to [Supabase](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, open **SQL Editor**.
3. Copy and paste the contents of `supabase/schema.sql` and click **Run**.
4. In **Project Settings -> API**, copy your **Project URL** and **anon public key**.

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Deploy to Vercel
1. Push your repository to GitHub or GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. In Vercel Project Settings, add the environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**!
