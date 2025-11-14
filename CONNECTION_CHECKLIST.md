# Service Connection Checklist
## Step-by-Step Guide to Connect Frontend & Backend

**Status:** ✅ Code is ready - Just need to configure platforms

---

## ✅ Pre-Flight Check

### Backend Code Status
- ✅ CORS configured to use `FRONTEND_URL` environment variable
- ✅ Health endpoint available at `/health`
- ✅ PORT parsing fixed for Railway
- ✅ Database connection module ready

### Frontend Code Status
- ✅ API client configured to use `VITE_API_URL` environment variable
- ✅ Falls back to relative paths if not set
- ✅ Handles authentication tokens correctly

---

## Step 1: Expose Railway Backend Service

### Action Required in Railway Dashboard:

1. **Open Railway:**
   - Go to [railway.app](https://railway.app)
   - Login to your account

2. **Find Backend Service:**
   - Look for `marines-app-backend` service
   - Click on it to open

3. **Generate Public Domain:**
   - Go to **Settings** tab
   - Scroll to **"Domains"** or **"Networking"** section
   - Look for **"Generate Domain"** or **"Create Public URL"** button
   - Click it
   - Railway will generate a domain like: `https://marines-backend-production.up.railway.app`
   - **COPY THIS URL** - You'll need it in Step 2

4. **Test Backend:**
   - Open the URL in browser: `https://YOUR-BACKEND-URL/health`
   - Should see: `{"status":"ok"}`
   - If you see this, backend is working! ✅

**Expected Result:**
- ✅ Backend has public URL
- ✅ Health endpoint returns `{"status":"ok"}`

---

## Step 2: Add VITE_API_URL to Vercel Frontend

### Action Required in Vercel Dashboard:

1. **Open Vercel:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Login to your account

2. **Find Frontend Project:**
   - Look for **`marines-v9gg`** project (NOT `marines-app-frontend`)
   - Click on it to open

3. **Add Environment Variable:**
   - Go to **Settings** tab
   - Click **"Environment Variables"** in left sidebar
   - Click **"Add Environment Variable"** button (top right)

4. **Configure Variable:**
   - **Name:** `VITE_API_URL`
   - **Value:** Your Railway backend URL from Step 1 (WITHOUT `/api`)
     - ✅ Correct: `https://marines-backend-production.up.railway.app`
     - ❌ Wrong: `https://marines-backend-production.up.railway.app/api`
   - **Environment:** Select all three:
     - ☑️ Production
     - ☑️ Preview
     - ☑️ Development
   - Click **"Save"**

**Expected Result:**
- ✅ `VITE_API_URL` appears in environment variables list
- ✅ Value is your Railway backend URL

---

## Step 3: Redeploy Frontend

### Action Required in Vercel Dashboard:

1. **Go to Deployments:**
   - Still in `marines-v9gg` project
   - Click **"Deployments"** tab (top navigation)

2. **Redeploy:**
   - Find the latest deployment
   - Click the three dots (⋯) menu on the right
   - Select **"Redeploy"**
   - Confirm redeployment

3. **Wait for Deployment:**
   - Watch the build logs
   - Should complete in 2-3 minutes
   - Status should show "Ready" ✅

**Expected Result:**
- ✅ New deployment created
- ✅ Status: "Ready"
- ✅ Frontend now has `VITE_API_URL` available

---

## Step 4: Update Backend CORS

### Action Required in Railway Dashboard:

1. **Go Back to Railway:**
   - Open `marines-app-backend` service

2. **Update Environment Variable:**
   - Go to **Variables** tab
   - Find `FRONTEND_URL` variable
   - Click to edit it
   - Update value to: `https://marines-v9gg.vercel.app`
   - Save

3. **Railway Auto-Redeploys:**
   - Railway will automatically redeploy when you save
   - Wait for deployment to complete (~1-2 minutes)

**Expected Result:**
- ✅ `FRONTEND_URL` updated in Railway
- ✅ Backend redeployed with new CORS settings

---

## Step 5: Test End-to-End

### Action Required in Browser:

1. **Open Frontend:**
   - Visit: `https://marines-v9gg.vercel.app/login`

2. **Open Developer Tools:**
   - Press `F12` or right-click → "Inspect"
   - Go to **Console** tab

3. **Test Login:**
   - Email: `demo@marines.app`
   - Password: `demo123`
   - Click "Login"

4. **Check Console:**
   - ✅ Should see: `API Request: POST https://YOUR-RAILWAY-URL/api/auth/login`
   - ✅ Should see: `API Response: 200 OK`
   - ✅ Should NOT see: 405, CORS, or 401 errors
   - ✅ Should redirect to dashboard after login

**Expected Result:**
- ✅ Login successful
- ✅ Redirected to dashboard
- ✅ No errors in console
- ✅ API calls going to Railway backend

---

## Troubleshooting Guide

### Issue: Backend health check fails

**Symptoms:**
- `https://YOUR-BACKEND-URL/health` returns error or timeout

**Solutions:**
1. Check Railway logs:
   - Go to Railway → Backend Service → **Deployments** tab
   - Click latest deployment → **View logs**
   - Look for errors

2. Verify environment variables:
   - Go to Railway → Backend Service → **Variables** tab
   - Check that `DATABASE_URL` is set correctly
   - Check that `PORT` is NOT manually set (Railway sets it automatically)

3. Check deployment status:
   - Make sure deployment shows "Active" or "Succeeded"
   - If failed, check logs for specific error

---

### Issue: Frontend still shows 405 error

**Symptoms:**
- Login fails with "HTTP 405: Unknown error"
- Console shows requests to `marines-v9gg.vercel.app/api/...`

**Solutions:**
1. Verify `VITE_API_URL` is set:
   - Go to Vercel → `marines-v9gg` → Settings → Environment Variables
   - Confirm `VITE_API_URL` exists and has correct value

2. Verify frontend was redeployed:
   - Go to Deployments tab
   - Latest deployment should be AFTER you added `VITE_API_URL`
   - If not, redeploy again

3. Clear browser cache:
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

4. Check build logs:
   - In Vercel deployment, check if `VITE_API_URL` is in build environment
   - Should see it in build logs

---

### Issue: CORS errors

**Symptoms:**
- Console shows: "CORS policy: No 'Access-Control-Allow-Origin' header"
- Network tab shows CORS preflight failures

**Solutions:**
1. Verify `FRONTEND_URL` in Railway:
   - Go to Railway → Backend → Variables
   - `FRONTEND_URL` should be exactly: `https://marines-v9gg.vercel.app`
   - No trailing slash, no `/api` suffix

2. Verify backend was redeployed:
   - After updating `FRONTEND_URL`, Railway should auto-redeploy
   - Check that latest deployment is after your change

3. Check backend logs:
   - Railway → Backend → Deployments → View logs
   - Should see: `🚀 Server running on http://localhost:PORT`
   - Should NOT see CORS-related errors

---

### Issue: 401 Unauthorized

**Symptoms:**
- Login works but subsequent API calls fail with 401
- Console shows: "Unauthorized" errors

**Solutions:**
1. Check JWT token:
   - In browser DevTools → Application → Local Storage
   - Should see `auth_token` with a JWT value
   - If missing, login didn't complete successfully

2. Verify JWT_SECRET:
   - Railway → Backend → Variables
   - `JWT_SECRET` should be set
   - Should match between login and subsequent requests

3. Check token expiration:
   - Current tokens expire in 24h
   - If token is old, try logging out and back in

---

## Verification Checklist

After completing all steps, verify:

- [ ] Backend health endpoint works: `https://YOUR-BACKEND-URL/health` → `{"status":"ok"}`
- [ ] `VITE_API_URL` is set in Vercel `marines-v9gg` project
- [ ] Frontend was redeployed after adding `VITE_API_URL`
- [ ] `FRONTEND_URL` is set in Railway backend
- [ ] Backend was redeployed after updating `FRONTEND_URL`
- [ ] Login works on `https://marines-v9gg.vercel.app/login`
- [ ] Console shows API calls to Railway backend URL
- [ ] No CORS errors in console
- [ ] No 405 errors in console
- [ ] Dashboard loads after login

---

## Quick Reference: URLs

### Frontend
- **Vercel URL:** `https://marines-v9gg.vercel.app`
- **Project:** `marines-v9gg` (in Vercel dashboard)

### Backend
- **Railway URL:** `https://YOUR-BACKEND-URL.up.railway.app` (you'll get this in Step 1)
- **Service:** `marines-app-backend` (in Railway dashboard)
- **Health Check:** `https://YOUR-BACKEND-URL/health`

### Environment Variables

**Vercel (`marines-v9gg`):**
- `VITE_API_URL` = `https://YOUR-RAILWAY-BACKEND-URL` (no `/api`)

**Railway (`marines-app-backend`):**
- `DATABASE_URL` = Your Neon connection string
- `JWT_SECRET` = `1b362fb1c4dde8063cef062d310e8566881dfc98db34f1bb68a4d26a583d9ce8`
- `FRONTEND_URL` = `https://marines-v9gg.vercel.app`
- `APP_BASE_URL` = `https://marines-v9gg.vercel.app`
- `PORT` = (DO NOT SET - Railway sets this automatically)

---

## Success Criteria

You'll know it's working when:

1. ✅ Backend health check returns `{"status":"ok"}`
2. ✅ Frontend login page loads
3. ✅ Login with `demo@marines.app` / `demo123` succeeds
4. ✅ Browser console shows API calls to Railway backend
5. ✅ No errors in console (no 405, no CORS, no 401)
6. ✅ Dashboard loads after login

---

## Next Steps After Success

Once everything is connected and working:

1. ✅ Test all major features
2. ✅ Review `ARCHITECTURE_REVIEW.md` for security improvements
3. ✅ Plan database schema migration
4. ✅ Implement Row-Level Security (RLS)
5. ✅ Add password hashing (bcrypt)

---

## Need Help?

If you get stuck at any step:

1. Check the **Troubleshooting Guide** above
2. Review Railway/Vercel logs for specific errors
3. Verify environment variables are set correctly
4. Make sure services are deployed and active

Good luck! 🚀

