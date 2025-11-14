# Immediate Action Plan
## Fix Deployment & Connect Services

**Priority:** CRITICAL - Must complete before testing

---

## Step 1: Expose Backend Service (Railway) ⏱️ 2 minutes

1. Go to Railway dashboard
2. Open `marines-app-backend` service
3. Go to **Settings** tab
4. Look for **"Generate Domain"** or **"Public URL"** button
5. Click to generate public domain
6. **Copy the URL** (e.g., `https://marines-backend.up.railway.app`)
7. Test it: Visit `https://YOUR-BACKEND-URL/health`
   - Should return: `{"status":"ok"}`

---

## Step 2: Add VITE_API_URL to Frontend (Vercel) ⏱️ 2 minutes

1. Go to Vercel dashboard
2. Open **`marines-v9gg`** project (NOT `marines-app-frontend`)
3. Go to **Settings** → **Environment Variables**
4. Click **"Add Environment Variable"**
5. Add:
   - **Name:** `VITE_API_URL`
   - **Value:** Your Railway backend URL (from Step 1, WITHOUT `/api`)
     - Example: `https://marines-backend.up.railway.app`
   - **Environment:** Production, Preview, Development (select all)
6. Click **"Save"**

---

## Step 3: Redeploy Frontend ⏱️ 3 minutes

1. In Vercel `marines-v9gg` project
2. Go to **Deployments** tab
3. Click three dots (⋯) on latest deployment
4. Select **"Redeploy"**
5. Wait for deployment to complete (~2-3 minutes)

---

## Step 4: Update Backend CORS ⏱️ 1 minute

1. Go back to Railway
2. Open `marines-app-backend` service
3. Go to **Variables** tab
4. Update `FRONTEND_URL`:
   - **Value:** `https://marines-v9gg.vercel.app`
5. Railway will auto-redeploy

---

## Step 5: Test End-to-End ⏱️ 2 minutes

1. Visit: `https://marines-v9gg.vercel.app/login`
2. Open browser DevTools (F12) → Console tab
3. Try to login:
   - Email: `demo@marines.app`
   - Password: `demo123`
4. Check console:
   - Should see API requests to Railway backend URL
   - Should NOT see 405 or CORS errors
   - Should see successful login

---

## Troubleshooting

### If backend health check fails:
- Check Railway logs for errors
- Verify `DATABASE_URL` is set correctly
- Verify `PORT` is not manually set (Railway sets it automatically)

### If frontend still shows 405:
- Verify `VITE_API_URL` is set correctly
- Check that frontend was redeployed after adding variable
- Clear browser cache and try again

### If CORS errors:
- Verify `FRONTEND_URL` in Railway matches Vercel URL exactly
- Check that backend was redeployed after updating `FRONTEND_URL`

---

## Expected Result

✅ Frontend: `https://marines-v9gg.vercel.app`  
✅ Backend: `https://marines-backend.up.railway.app` (your Railway URL)  
✅ Login works  
✅ API calls succeed  
✅ No CORS errors  

---

## Next Steps After This Works

1. Review `ARCHITECTURE_REVIEW.md` for security recommendations
2. Implement database schema with RLS
3. Implement password hashing
4. Add security headers

