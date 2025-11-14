# Backend Deployment Guide - Railway

## Quick Reference: Your Values

### Environment Variables You'll Need:

1. **DATABASE_URL**
   - From Neon: `postgresql://neondb_owner:YOUR_PASSWORD@ep-odd-queen-acch6l9x-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   - Copy this from your Neon dashboard (with actual password)

2. **JWT_SECRET**
   - Generated: `1b362fb1c4dde8063cef062d310e8566881dfc98db34f1bb68a4d26a583d9ce8`
   - (Keep this secret!)

3. **PORT**
   - `3001` (Railway will set this automatically, but you can specify)

4. **FRONTEND_URL**
   - Leave empty for now (update after frontend deploy)
   - Will be: `https://your-app.vercel.app`

5. **APP_BASE_URL**
   - Leave empty for now (update after frontend deploy)
   - Will be: `https://your-app.vercel.app`

---

## Step-by-Step: Deploy to Railway

### Step 1: Sign Up / Login to Railway

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project" or "Login"
3. Sign up/login with your **GitHub account** (recommended for easy repo connection)

### Step 2: Create New Project

1. Click **"New Project"** button
2. Select **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub if prompted
4. Find and select: **`tonisvasconcelos/marines`**

### Step 3: Configure the Service

1. Railway will detect it's a Node.js project
2. Click on the service that was created
3. Go to **"Settings"** tab
4. Set **Root Directory**: `backend`
   - This tells Railway to deploy from the `backend/` folder

### Step 4: Add Environment Variables

1. Go to **"Variables"** tab in your Railway project
2. Click **"New Variable"** for each:

   **Variable 1: DATABASE_URL**
   - Name: `DATABASE_URL`
   - Value: Your full Neon connection string (with password)
   - Example: `postgresql://neondb_owner:YOUR_PASSWORD@ep-odd-queen-acch6l9x-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`

   **Variable 2: JWT_SECRET**
   - Name: `JWT_SECRET`
   - Value: `1b362fb1c4dde8063cef062d310e8566881dfc98db34f1bb68a4d26a583d9ce8`

   **Variable 3: PORT** (Optional - Railway sets this automatically)
   - Name: `PORT`
   - Value: `3001`

   **Variable 4: FRONTEND_URL** (Leave empty for now)
   - Name: `FRONTEND_URL`
   - Value: (empty - will update after frontend deploy)

   **Variable 5: APP_BASE_URL** (Leave empty for now)
   - Name: `APP_BASE_URL`
   - Value: (empty - will update after frontend deploy)

### Step 5: Deploy

1. Railway will automatically start deploying when you:
   - Connect the repo (first time)
   - Push new commits (subsequent deployments)
2. Go to **"Deployments"** tab to watch the build
3. Wait for deployment to complete (usually 2-3 minutes)

### Step 6: Get Your Backend URL

1. Go to **"Settings"** tab
2. Scroll down to **"Domains"** section
3. Railway automatically creates a domain like: `your-project.up.railway.app`
4. **Copy this URL** - you'll need it for:
   - Frontend `VITE_API_URL` environment variable
   - Testing the backend

### Step 7: Test Your Backend

1. Open your Railway domain in browser: `https://your-project.up.railway.app/health`
2. You should see: `{"status":"ok"}`
3. Check Railway logs:
   - Go to **"Deployments"** tab
   - Click on the latest deployment
   - Look for: `✅ Database connection established` (if DATABASE_URL is set)
   - Look for: `🚀 Server running on http://localhost:3001`

---

## Troubleshooting

### Build Fails
- Check that **Root Directory** is set to `backend`
- Check Railway logs for specific errors
- Verify `backend/package.json` exists

### Database Connection Fails
- Verify `DATABASE_URL` is correct (copy from Neon exactly)
- Check that password is included in connection string
- Verify Neon database is accessible (not paused)

### Server Not Starting
- Check Railway logs for errors
- Verify `PORT` environment variable (Railway sets this automatically)
- Check that all dependencies installed correctly

### CORS Errors (After Frontend Deploy)
- Update `FRONTEND_URL` in Railway to match your Vercel URL
- Restart the deployment

---

## Next Steps After Backend is Deployed

1. ✅ Note your Railway backend URL
2. ✅ Test health endpoint
3. ✅ Deploy frontend to Vercel (use backend URL for `VITE_API_URL`)
4. ✅ Update `FRONTEND_URL` in Railway to match Vercel URL
5. ✅ Test full application

---

## Alternative: Deploy to Render

If you prefer Render instead of Railway:

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repo: `tonisvasconcelos/marines`
5. Configure:
   - **Name**: `marines-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
6. Add environment variables (same as Railway)
7. Deploy!

---

## Your Backend URL

After deployment, your backend will be available at:
- Railway: `https://your-project.up.railway.app`
- Render: `https://your-service.onrender.com`

Use this URL for:
- Frontend `VITE_API_URL` environment variable
- Testing API endpoints
- Health checks

