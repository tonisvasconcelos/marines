# Vercel Deployment Fix Checklist

## Current Status ✅
- [x] Backend environment variables set (PORT, DATABASE_URL, JWT_SECRET, etc.)
- [x] Frontend deployed successfully
- [ ] Backend service exposed (needs public URL)
- [ ] VITE_API_URL set in frontend project
- [ ] Frontend redeployed with VITE_API_URL

## What's Missing

The frontend is trying to call `/api/auth/login` on its own domain because `VITE_API_URL` is not set.

## Steps to Fix

### Step 1: Verify Backend is Deployed ✅
1. Go to Vercel dashboard
2. Find `marines-app-backend` service
3. Check Deployments tab - should show "Ready" or "Succeeded"
4. If it's still failing, check the logs

### Step 2: Expose Backend Service (Get Public URL) 🔴 CRITICAL
1. In `marines-app-backend` service
2. Go to **Settings** tab
3. Look for **"Domains"** or **"Public URL"** section
4. If it says "Unexposed service":
   - Look for **"Expose"** or **"Generate Public URL"** button
   - Click it
   - Copy the generated URL (e.g., `https://marines-app-backend-xxx.vercel.app`)

### Step 3: Add VITE_API_URL to Frontend 🔴 CRITICAL
1. Go to **`marines-v9gg`** project (frontend)
2. Go to **Settings** → **Environment Variables**
3. Click **"Add Environment Variable"**
4. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** Your backend URL (from Step 2, WITHOUT `/api`)
     - Example: `https://marines-app-backend-xxx.vercel.app`
   - **Environment:** Production, Preview, Development (select all)
5. **Save**

### Step 4: Redeploy Frontend 🔴 CRITICAL
1. Go to **Deployments** tab in `marines-v9gg` project
2. Click three dots (⋯) on latest deployment
3. Select **"Redeploy"**
4. Wait for deployment to complete

### Step 5: Test
1. Visit: `https://marines-v9gg.vercel.app/login`
2. Try login: `demo@marines.app` / `demo123`
3. Should work! ✅

---

## Quick Test: Is Backend Working?

Test the backend directly:
1. Get backend URL (from Step 2)
2. Visit: `https://YOUR-BACKEND-URL/health`
3. Should return: `{"status":"ok"}`

If this works, backend is ready!
If this fails, backend needs to be fixed first.

