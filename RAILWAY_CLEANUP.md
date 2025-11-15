# Railway Project Cleanup Guide

## Problem
You have **two Railway projects** which is causing deployment conflicts:
- `loyal-emotion`
- `surprising-analysis`

Both are trying to deploy from the same repository, causing build failures.

## Solution: Keep Only ONE Backend Project

### Step 1: Identify Which Project to Keep

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Check both projects:
   - Which one has the correct **Root Directory** set to `backend`?
   - Which one has the correct **environment variables** set?
   - Which one is actually working (if any)?

**Recommendation:** Keep the one that's configured correctly, or delete both and create a fresh one.

### Step 2: Delete the Duplicate Project(s)

1. Go to Railway dashboard
2. Click on the project you want to **DELETE**
3. Go to **Settings** tab
4. Scroll to the bottom
5. Click **"Delete Project"** or **"Remove Project"**
6. Confirm deletion

**Keep only ONE project** - we only need one backend service.

### Step 3: Verify the Remaining Project Configuration

For the project you're keeping, verify:

1. **Root Directory:**
   - Go to **Settings** → **Service**
   - **Root Directory** should be: `backend`
   - If it's empty or set to root, change it to `backend`

2. **Environment Variables:**
   - Go to **Variables** tab
   - Should have:
     - `DATABASE_URL` (from Neon)
     - `JWT_SECRET`
     - `FRONTEND_URL` (your Vercel URL)
     - `APP_BASE_URL` (your Vercel URL)
     - **DO NOT SET `PORT`** (Railway sets this automatically)

3. **Build Settings:**
   - **Start Command:** Should be `npm start` (or leave empty, Railway auto-detects)
   - **Build Command:** Leave empty (Railway auto-detects)

### Step 4: Create Fresh Project (If Both Are Broken)

If both projects are misconfigured, delete both and create a fresh one:

1. **Delete both projects** (follow Step 2 for each)

2. **Create new project:**
   - Click **"New Project"** in Railway
   - Select **"Deploy from GitHub repo"**
   - Select your repo: `tonisvasconcelos/marines`
   - Railway will create a service

3. **Configure the service:**
   - Click on the service
   - Go to **Settings** → **Service**
   - Set **Root Directory:** `backend`
   - Save

4. **Add environment variables:**
   - Go to **Variables** tab
   - Add all required variables (see Step 3 above)

5. **Deploy:**
   - Railway will auto-deploy
   - Check **Deployments** tab for build status

### Step 5: Verify Deployment

1. **Check build logs:**
   - Go to **Deployments** tab
   - Click on latest deployment
   - Should see: `✅ Database connection established`
   - Should see: `🚀 Server running on http://localhost:3001`

2. **Get backend URL:**
   - Go to **Settings** → **Domains**
   - Copy the URL (e.g., `https://your-project.up.railway.app`)

3. **Test health endpoint:**
   - Open: `https://your-project.up.railway.app/health`
   - Should return: `{"status":"ok"}`

## Why This Happened

Railway might have:
- Auto-created multiple projects when connecting the GitHub repo
- Created separate services for frontend and backend (we only need backend)
- Created duplicate projects due to multiple connection attempts

## Prevention

- **Only connect the repo once** to Railway
- **Set Root Directory to `backend`** immediately after creating the project
- **Don't create multiple projects** - one backend project is enough

## Current Setup Should Be

```
Railway: 1 project (backend only)
  └── Service: marines-backend
      └── Root Directory: backend
      └── Environment Variables: DATABASE_URL, JWT_SECRET, FRONTEND_URL, etc.

Vercel: 1 project (frontend only)
  └── Root Directory: (root or frontend)
  └── Environment Variables: VITE_API_URL
```

## Quick Fix Checklist

- [ ] Delete duplicate Railway project(s) - keep only ONE
- [ ] Verify Root Directory = `backend` in remaining project
- [ ] Verify environment variables are set correctly
- [ ] Check deployment logs - should build successfully
- [ ] Test health endpoint - should return `{"status":"ok"}`
- [ ] Update Vercel `VITE_API_URL` to point to Railway backend URL

