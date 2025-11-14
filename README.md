# Marines App - Port Call Management System

A multi-tenant SaaS web application for maritime port-call operations, inspired by Brazil's PSP (Porto Sem Papel) but architected for international (IMO/FAL) use.

## 🚀 Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   # Copy example files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   
   # Edit backend/.env and frontend/.env.local with your local values
   # For local development, you can use the default values
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

4. **Access the app:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

5. **Login with demo credentials:**
   - Email: `demo@marines.app`
   - Password: `demo123`

## 📦 Deployment

### Environment Variables

This application requires environment variables for both frontend and backend. See the `.env.example` files in each directory for required variables.

#### Frontend Environment Variables (Vercel)
- `VITE_API_URL` - Backend API URL (e.g., `https://api.yourdomain.com` or leave empty for relative paths)

#### Backend Environment Variables
- `PORT` - Server port (default: 3001)
- `FRONTEND_URL` - Frontend URL for CORS (e.g., `https://yourdomain.com`)
- `JWT_SECRET` - Secret key for JWT tokens (generate a strong random string)
- `DATABASE_URL` - PostgreSQL connection string (see [Neon Setup](#neon-postgresql-setup) below)
- `AIS_API_KEY` - AIS provider API key (optional)
- `AIS_API_URL` - AIS provider API URL (optional)
- `APP_BASE_URL` - Base URL for tenant-specific URLs

### Frontend Deployment (Vercel)

The frontend is configured for Vercel deployment. The `vercel.json` file is already set up.

**Deployment Steps:**
1. Push your code to GitHub (see [GitHub Setup](#github-setup) below)
2. Import your GitHub repository in [Vercel Dashboard](https://vercel.com/dashboard)
3. Configure project settings:
   - **Framework Preset**: Vite
   - **Root Directory**: Leave as root (or set to `frontend` if deploying only frontend)
   - **Build Command**: `cd frontend && npm install && npm run build` (auto-detected)
   - **Output Directory**: `frontend/dist` (auto-detected)
4. Add environment variables:
   - `VITE_API_URL` = Your backend API URL (e.g., `https://your-backend.railway.app`)
5. Deploy!

**Note:** If your backend is deployed separately, make sure to set `VITE_API_URL` to point to your backend URL. The frontend will use relative paths (`/api`) if `VITE_API_URL` is not set, which requires API rewrites in Vercel.

### Backend Deployment

The backend is a separate Express.js application that should be deployed to a platform that supports Node.js:

**Recommended Platforms:**
- **Railway** - Easy PostgreSQL integration, automatic deployments
- **Render** - Free tier available, PostgreSQL support
- **Fly.io** - Global deployment, good for multi-region
- **Heroku** - Classic platform, requires credit card for PostgreSQL

**Backend Deployment Steps:**
1. Create a new project on your chosen platform
2. Connect your GitHub repository
3. Set root directory to `backend`
4. Configure environment variables (see `.env.example`)
5. Set up PostgreSQL database and add `DATABASE_URL`
6. Deploy!

**Important:** Update your frontend's `VITE_API_URL` environment variable to point to your deployed backend URL.

### Neon PostgreSQL Setup

This project is configured to use **Neon PostgreSQL** (serverless PostgreSQL). The backend includes a database connection module that works with Neon.

#### Getting Your Neon Connection String

1. **Log in to Neon:**
   - Go to [neon.tech](https://neon.tech)
   - Sign in to your account

2. **Get Your Connection String:**
   - Open your Neon project
   - Go to the "Connection Details" section
   - Copy the connection string (it looks like):
     ```
     postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
     ```

3. **For Connection Pooling (Recommended for Production):**
   - Neon provides a connection pooling endpoint
   - Look for "Connection pooling" in your Neon dashboard
   - Use the pooling connection string (usually has `-pooler` in the hostname)
   - Example: `postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/dbname?sslmode=require`

4. **Set in Environment Variables:**
   - **Local development:** Add to `backend/.env`:
     ```env
     DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
     ```
   - **Production (Railway/Render/etc.):** Add `DATABASE_URL` as an environment variable in your platform

#### Database Connection

The backend automatically:
- ✅ Tests the database connection on startup
- ✅ Uses connection pooling for better performance
- ✅ Falls back to mock data if database is unavailable (for development)
- ✅ Handles SSL connections (required for Neon)

#### Next Steps

Once you have your `DATABASE_URL` set:
1. The backend will connect to Neon on startup
2. You'll see `✅ Database connection established` in the logs
3. You can start migrating from mock data to PostgreSQL queries

**Note:** The app currently uses mock data. To use the database, you'll need to:
- Create database tables/schema
- Replace mock data functions with PostgreSQL queries
- See `backend/db/connection.js` for the database connection helper

## ✨ Features

- **Multi-tenant Architecture**: Fully segregated tenant data with JWT-based authentication
- **Port Call Management**: Complete lifecycle management of port calls with IMO/FAL alignment
- **AIS Integration**: Live vessel tracking with position and track history (mocked for development)
- **Fleet Map**: Real-time visualization of all active vessels
- **Compliance Management**: Security pendencies, approvals, fees & dues
- **Internationalization**: Support for multiple languages and jurisdictions
- **Modern UI**: Strava-like interface with card-based design

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, React Router, TanStack Query, Leaflet
- **Backend**: Node.js, Express
- **Authentication**: JWT tokens
- **Styling**: CSS Modules

## 📁 Project Structure

```
MarinesApp/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── modules/      # Feature modules (auth, portCalls, etc.)
│   │   ├── pages/       # Page components
│   │   ├── utils/       # Utilities (API, i18n)
│   │   └── models/      # Type definitions
│   └── package.json
├── backend/          # Node.js/Express backend
│   ├── routes/        # API route handlers
│   ├── middleware/    # Auth middleware
│   ├── data/          # Mock data (replace with DB)
│   └── server.js
└── package.json       # Root workspace config
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/login` - Login

### Port Calls
- `GET /api/port-calls` - List (supports ?status=, ?vesselId=, ?limit=, ?sort=)
- `GET /api/port-calls/:id` - Get detail
- `POST /api/port-calls` - Create
- `PUT /api/port-calls/:id` - Update
- `DELETE /api/port-calls/:id` - Delete

### Vessels
- `GET /api/vessels` - List
- `GET /api/vessels/:id` - Get detail

### AIS
- `GET /api/ais/vessels/:vesselId/last-position` - Last position
- `GET /api/ais/vessels/:vesselId/track?hours=24` - Track history

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

### Settings
- `GET /api/settings/tenant` - Tenant settings
- `GET /api/settings/users` - Users list
- `GET /api/settings/ais` - AIS configuration
- `PUT /api/settings/ais` - Update AIS config

## 🚢 Next Steps for Production

1. **Database Migration**
   - Replace mock data with PostgreSQL
   - Implement Row-Level Security (RLS)
   - Add migrations for all tables

2. **Authentication**
   - Implement proper password hashing (bcrypt)
   - Add refresh tokens
   - Implement password reset flow

3. **AIS Provider**
   - Integrate real AIS API (MarineTraffic, AIS API, etc.)
   - Implement scheduled polling job
   - Add rate limiting

4. **File Storage**
   - Implement attachment storage (S3, etc.)
   - Add file upload endpoints

5. **Enhanced Features**
   - Complete all tab content in Port Call detail
   - Add CRUD for all entities
   - Implement search and filtering
   - Add export functionality

6. **Testing**
   - Unit tests
   - Integration tests
   - E2E tests

## 🏢 Multi-Tenant Setup

This application uses a **JWT-based multi-tenant architecture**. Tenants are identified through JWT tokens embedded in authentication, not through subdomains or URL paths.

### How It Works

1. **Tenant Identification**: When a user logs in, their JWT token includes a `tenantId` field
2. **Data Isolation**: All API requests include the JWT token, and the backend middleware extracts `tenantId` from the token
3. **Tenant Context**: The frontend stores tenant information in localStorage and includes it in API requests

### Tenant Configuration

- Tenants are identified by `tenantId` in the JWT token
- Each tenant has isolated data (vessels, port calls, settings, etc.)
- Tenant settings (locale, country code, etc.) are stored per tenant
- AIS configurations are tenant-specific

### Environment Variables for Multi-Tenancy

- `APP_BASE_URL` - Used for generating tenant-specific URLs (if needed in future)
- `FRONTEND_URL` - Must match your frontend domain for CORS

## 🚀 GitHub & Vercel Deployment Checklist

### Prerequisites
- [ ] GitHub account
- [ ] Vercel account (free tier works)
- [ ] Backend hosting platform account (Railway, Render, etc.)
- [ ] PostgreSQL database (Neon, Supabase, Railway, etc.)

### Step 1: GitHub Setup

1. **Create a new GitHub repository:**
   - Go to [GitHub](https://github.com/new)
   - Create a new repository (private or public)
   - **Do not** initialize with README, .gitignore, or license (we already have these)

2. **Push your code:**
   ```bash
   # Ensure you're on the main branch
   git branch -M main
   
   # Add all files
   git add .
   
   # Commit
   git commit -m "Initial commit: Maritime Operations SaaS app"
   
   # Remote is already configured: https://github.com/tonisvasconcelos/marines.git
   # If you need to set it manually:
   # git remote add origin https://github.com/tonisvasconcelos/marines.git
   
   # Push to GitHub
   git push -u origin main
   ```

### Step 2: Neon PostgreSQL Setup

1. **Set up Neon PostgreSQL:**
   - [ ] Log in to [neon.tech](https://neon.tech)
   - [ ] Create a new project (or use existing)
   - [ ] Copy your connection string from "Connection Details"
   - [ ] **Recommended:** Use the connection pooling endpoint for production
   - [ ] Note your `DATABASE_URL` (you'll need it for backend deployment)

### Step 3: Backend Deployment

1. **Deploy backend to Railway/Render/etc:**
   - [ ] Create new project on your platform
   - [ ] Connect GitHub repository
   - [ ] Set root directory to `backend`
   - [ ] Add environment variables from `backend/.env.example`:
     - [ ] `PORT=3001`
     - [ ] `FRONTEND_URL=https://your-app.vercel.app` (update after frontend deploy)
     - [ ] `JWT_SECRET=<generate-strong-random-string>`
     - [ ] `DATABASE_URL=<your-neon-connection-string>` (from Step 2)
     - [ ] `AIS_API_KEY=<your-ais-key>` (optional)
     - [ ] `APP_BASE_URL=https://your-app.vercel.app`
   - [ ] Deploy and note the backend URL
   - [ ] Check logs to verify: `✅ Database connection established`

### Step 4: Frontend Deployment (Vercel)

1. **Import project in Vercel:**
   - [ ] Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - [ ] Click "Add New Project"
   - [ ] Import your GitHub repository
   - [ ] Vercel will auto-detect Vite framework

2. **Configure project settings:**
   - [ ] **Framework Preset**: Vite (auto-detected)
   - [ ] **Root Directory**: Leave as root (or set to `frontend` if needed)
   - [ ] **Build Command**: `cd frontend && npm install && npm run build` (auto-detected)
   - [ ] **Output Directory**: `frontend/dist` (auto-detected)
   - [ ] **Install Command**: `cd frontend && npm install` (auto-detected)

3. **Add environment variables:**
   - [ ] `VITE_API_URL` = Your backend URL (e.g., `https://your-backend.railway.app`)
   - [ ] Do not include `/api` in the URL - the frontend code handles that

4. **Deploy:**
   - [ ] Click "Deploy"
   - [ ] Wait for deployment to complete
   - [ ] Note your Vercel deployment URL

5. **Update backend CORS:**
   - [ ] Go back to your backend platform
   - [ ] Update `FRONTEND_URL` environment variable to your Vercel URL
   - [ ] Restart backend if needed

### Step 5: Post-Deployment

- [ ] Test login functionality
- [ ] Verify API calls are working
- [ ] Check CORS errors in browser console
- [ ] Test multi-tenant isolation
- [ ] Set up custom domain (optional)
- [ ] Configure SSL/HTTPS (usually automatic)

### Troubleshooting

**CORS Errors:**
- Ensure `FRONTEND_URL` in backend matches your Vercel deployment URL exactly
- Check that backend allows credentials: `credentials: true` in CORS config

**API Not Found:**
- Verify `VITE_API_URL` is set correctly in Vercel
- Check that backend is running and accessible
- Test backend health endpoint: `https://your-backend.railway.app/health`

**Build Failures:**
- Check Vercel build logs for errors
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

## 📝 License

Private - All rights reserved

## 🔗 Links

- [Deployment Guide](./DEPLOYMENT.md)
- [Setup Instructions](./SETUP.md)
