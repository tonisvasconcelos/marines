# Quick Start: Connect Services in 5 Minutes

## 🎯 Goal
Connect your Vercel frontend to your Railway backend so the app works end-to-end.

---

## Step 1: Get Backend URL from Railway (2 min)

1. Go to [railway.app](https://railway.app) → Your project
2. Click on **`marines-app-backend`** service
3. Go to **Settings** tab
4. Scroll to **"Domains"** section
5. Click **"Generate Domain"** or **"Create Public URL"**
6. **Copy the URL** (e.g., `https://marines-backend-production-xxxx.up.railway.app`)
7. Test it: Open `https://YOUR-URL/health` in browser
   - Should see: `{"status":"ok"}` ✅

**✅ Done when:** You have a working backend URL

---

## Step 2: Add VITE_API_URL to Vercel (2 min)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on **`marines-v9gg`** project (NOT `marines-app-frontend`)
3. Go to **Settings** → **Environment Variables**
4. Click **"Add Environment Variable"**
5. Fill in:
   - **Name:** `VITE_API_URL`
   - **Value:** Your Railway URL from Step 1 (NO `/api` at the end)
   - **Environments:** ☑️ Production ☑️ Preview ☑️ Development
6. Click **"Save"**

**✅ Done when:** `VITE_API_URL` appears in the list

---

## Step 3: Redeploy Frontend (1 min)

1. Still in Vercel `marines-v9gg` project
2. Go to **Deployments** tab
3. Click **⋯** (three dots) on latest deployment
4. Click **"Redeploy"**
5. Wait 2-3 minutes for deployment

**✅ Done when:** New deployment shows "Ready"

---

## Step 4: Update Backend CORS (1 min)

1. Go back to Railway
2. Open **`marines-app-backend`** service
3. Go to **Variables** tab
4. Find **`FRONTEND_URL`**
5. Update value to: `https://marines-v9gg.vercel.app`
6. Save (Railway auto-redeploys)

**✅ Done when:** Railway shows new deployment

---

## Step 5: Test! (1 min)

1. Open: `https://marines-v9gg.vercel.app/login`
2. Press `F12` → **Console** tab
3. Login: `demo@marines.app` / `demo123`
4. Check console:
   - ✅ Should see: `API Request: POST https://YOUR-RAILWAY-URL/api/auth/login`
   - ✅ Should see: `API Response: 200 OK`
   - ✅ Should redirect to dashboard

**✅ Success when:** Login works and dashboard loads!

---

## 🆘 Quick Troubleshooting

**Backend health fails?**
- Check Railway logs for errors
- Verify `DATABASE_URL` is set

**Frontend still 405?**
- Verify `VITE_API_URL` is set in Vercel
- Make sure frontend was redeployed
- Clear browser cache (Ctrl+Shift+R)

**CORS errors?**
- Verify `FRONTEND_URL` in Railway = `https://marines-v9gg.vercel.app`
- Check backend was redeployed after update

---

## 📋 Checklist

- [ ] Backend URL obtained from Railway
- [ ] Backend health check works (`/health`)
- [ ] `VITE_API_URL` added to Vercel
- [ ] Frontend redeployed
- [ ] `FRONTEND_URL` updated in Railway
- [ ] Backend redeployed
- [ ] Login works end-to-end

---

**Total Time:** ~5-10 minutes  
**Result:** Fully connected frontend and backend! 🎉

