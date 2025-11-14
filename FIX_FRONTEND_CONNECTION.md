# Fix Frontend Connection - Step by Step

## ✅ What's Working
- ✅ Backend URL: `https://marines-app-backend-production.up.railway.app`
- ✅ Backend health check: `{"status":"ok"}` ✅
- ✅ Frontend deployed: `https://marines-v9gg.vercel.app`

## ❌ What's Not Working
- ❌ Frontend is calling `/api/auth/login` on its own domain (Vercel)
- ❌ Getting 405 error because Vercel frontend doesn't have API routes
- ❌ `VITE_API_URL` is not set or frontend wasn't redeployed

---

## Solution: Add VITE_API_URL to Vercel

### Step 1: Open Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find and click on **`marines-v9gg`** project
   - ⚠️ NOT `marines-app-frontend` - that's a different service
   - ✅ Use `marines-v9gg` - that's your frontend project

### Step 2: Add Environment Variable

1. In the `marines-v9gg` project, click **Settings** (top navigation)
2. Click **Environment Variables** in the left sidebar
3. Click **"Add Environment Variable"** button (top right, purple button)

4. Fill in the form:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://marines-app-backend-production.up.railway.app`
     - ⚠️ Important: NO `/api` at the end
     - ✅ Correct: `https://marines-app-backend-production.up.railway.app`
     - ❌ Wrong: `https://marines-app-backend-production.up.railway.app/api`
   
   - **Environments:** Select ALL three:
     - ☑️ Production
     - ☑️ Preview  
     - ☑️ Development

5. Click **"Save"**

### Step 3: Verify Variable Was Added

After saving, you should see:
- `VITE_API_URL` in the environment variables list
- Value shows as `********` (masked for security)
- Shows "Production" environment

### Step 4: Redeploy Frontend (CRITICAL!)

**This is the most important step!**

1. Still in `marines-v9gg` project
2. Click **Deployments** tab (top navigation)
3. Find the latest deployment
4. Click the **three dots (⋯)** menu on the right side
5. Click **"Redeploy"**
6. Confirm the redeployment
7. **Wait 2-3 minutes** for deployment to complete
8. Status should show **"Ready"** ✅

**Why this is critical:**
- Environment variables are only available at BUILD time for Vite
- The frontend code needs to be rebuilt to include `VITE_API_URL`
- Without redeploy, the frontend still uses the old build (without the variable)

### Step 5: Test Again

1. Visit: `https://marines-v9gg.vercel.app/login`
2. Open DevTools (F12) → **Console** tab
3. Try to login: `demo@marines.app` / `demo123`
4. **Check the console:**
   - ✅ Should see: `API Request: POST https://marines-app-backend-production.up.railway.app/api/auth/login`
   - ✅ Should see: `API Response: 200 OK`
   - ✅ Should redirect to dashboard
   - ❌ Should NOT see: `/api/auth/login` (relative path)
   - ❌ Should NOT see: 405 errors

---

## Verification Checklist

After completing steps above:

- [ ] `VITE_API_URL` is in Vercel environment variables
- [ ] Value is: `https://marines-app-backend-production.up.railway.app` (no `/api`)
- [ ] Frontend was redeployed AFTER adding the variable
- [ ] Latest deployment shows "Ready" status
- [ ] Console shows API calls to Railway backend URL
- [ ] Login works successfully

---

## Troubleshooting

### Still seeing 405 error?

1. **Check if variable is set:**
   - Vercel → `marines-v9gg` → Settings → Environment Variables
   - Confirm `VITE_API_URL` exists

2. **Check if frontend was redeployed:**
   - Vercel → `marines-v9gg` → Deployments
   - Latest deployment should be AFTER you added `VITE_API_URL`
   - If not, redeploy again

3. **Clear browser cache:**
   - Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

4. **Check build logs:**
   - In Vercel deployment, check build logs
   - Should see `VITE_API_URL` in environment

### Still seeing relative paths in console?

- Frontend wasn't redeployed after adding `VITE_API_URL`
- Environment variable is only available at build time
- **Solution:** Redeploy frontend

---

## Expected Console Output (After Fix)

When it's working, you should see in console:

```
API Request: POST https://marines-app-backend-production.up.railway.app/api/auth/login (with token)
API Response: 200 OK for https://marines-app-backend-production.up.railway.app/api/auth/login
```

NOT:
```
API Request: POST /api/auth/login
Failed to load resource: the server responded with a status of 405
```

---

## Quick Reference

**Backend URL:** `https://marines-app-backend-production.up.railway.app`  
**Frontend URL:** `https://marines-v9gg.vercel.app`  
**VITE_API_URL value:** `https://marines-app-backend-production.up.railway.app` (no `/api`)

---

**Next:** Complete Step 2-4 above, then test again! 🚀

