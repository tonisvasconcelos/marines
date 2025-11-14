# Deployment Guide

## Frontend Deployment (Vercel)

### Option 1: Deploy via Vercel Dashboard

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/tonisvasconcelos/marines.git
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure:
     - **Root Directory**: `frontend`
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`
     - **Install Command**: `npm install`

3. **Set Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend-url.com`
   - (You'll set this after deploying the backend)

4. **Deploy!**
   - Click "Deploy"
   - Vercel will build and deploy your frontend

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? marines-app (or your choice)
# - Directory? ./
# - Override settings? No
```

## Backend Deployment Options

### Option 1: Railway (Recommended - Easy & Free Tier)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect Node.js
6. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `PORT` = (auto-set by Railway)
     - `JWT_SECRET` = (generate a secure random string)
     - `NODE_ENV` = `production`
7. Railway will give you a URL like: `https://your-app.railway.app`
8. Update your Vercel `VITE_API_URL` to this URL

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your repository
5. Configure:
   - **Name**: marines-backend
   - **Root Directory**: `backend`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Same as Railway
6. Render will give you a URL
7. Update Vercel `VITE_API_URL`

### Option 3: Vercel Serverless Functions (Advanced)

You can convert your Express backend to Vercel serverless functions. This requires refactoring but keeps everything on Vercel.

## Post-Deployment Checklist

1. ✅ Update `VITE_API_URL` in Vercel environment variables
2. ✅ Set `JWT_SECRET` in backend environment variables
3. ✅ Test login functionality
4. ✅ Test API endpoints
5. ✅ Configure CORS on backend (if needed)
6. ✅ Set up custom domain (optional)

## Environment Variables Reference

### Frontend (Vercel)
- `VITE_API_URL` - Backend API URL (e.g., `https://your-backend.railway.app`)

### Backend (Railway/Render)
- `PORT` - Server port (usually auto-set)
- `JWT_SECRET` - Secret key for JWT tokens (generate a secure random string)
- `NODE_ENV` - `production`

## CORS Configuration

If you deploy backend separately, update `backend/server.js`:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-frontend.vercel.app',
  credentials: true
}));
```

## Testing Production

1. Visit your Vercel deployment URL
2. Try logging in with demo credentials
3. Test all features
4. Check browser console for errors
5. Check backend logs for API issues

## Troubleshooting

**CORS Errors:**
- Make sure backend CORS allows your Vercel domain
- Check environment variables are set correctly

**API Not Working:**
- Verify `VITE_API_URL` is set correctly in Vercel
- Check backend is running and accessible
- Check backend logs for errors

**Build Failures:**
- Check Vercel build logs
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

