import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import portCallRoutes from './routes/portCalls.js';
import vesselRoutes from './routes/vessels.js';
import dashboardRoutes from './routes/dashboard.js';
import aisRoutes from './routes/ais.js';
import settingsRoutes from './routes/settings.js';
import opsSitesRoutes from './routes/opsSites.js';
import customersRoutes from './routes/customers.js';
import agentsRoutes from './routes/agents.js';
import teamsRoutes from './routes/teams.js';
import { authenticateToken } from './middleware/auth.js';
import { testConnection } from './db/connection.js';

dotenv.config();

const app = express();
// Parse PORT as integer, default to 3001
const PORT = parseInt(process.env.PORT, 10) || 3001;

// CORS configuration
// Support multiple frontend URLs (for production, preview, and local dev)
const getAllowedOrigins = () => {
  const origins = [];
  
  // Primary frontend URL
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }
  
  // Additional frontend URLs (comma-separated)
  if (process.env.FRONTEND_URLS) {
    origins.push(...process.env.FRONTEND_URLS.split(',').map(url => url.trim()));
  }
  
  // Common Vercel deployment URLs (always allow these)
  const vercelUrls = [
    'https://marines-v9gg.vercel.app',
    'https://marines-app-frontend.vercel.app',
  ];
  vercelUrls.forEach(url => {
    if (!origins.includes(url)) {
      origins.push(url);
    }
  });
  
  // Local development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000');
    origins.push('http://localhost:5173'); // Vite default port
  }
  
  console.log(`[CORS] Allowed origins: ${origins.join(', ')}`);
  return origins.length > 0 ? origins : ['http://localhost:3000'];
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('[CORS] Request with no origin - allowing');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      // In production, be strict; in dev, be more permissive
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        // Allow in development for easier debugging
        console.warn('[CORS] Development mode - allowing anyway');
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 200, // Use 200 instead of 204 for better compatibility
};

// Apply CORS middleware BEFORE any other middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes (critical for preflight)
// This ensures preflight requests are handled even if cors middleware doesn't catch them
app.options('*', cors(corsOptions), (req, res) => {
  console.log(`[CORS] Handling OPTIONS preflight for: ${req.path} from origin: ${req.headers.origin}`);
  // The cors middleware should have already set headers, but ensure they're set
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours
  }
  res.sendStatus(200);
});
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/port-calls', authenticateToken, portCallRoutes);
app.use('/api/vessels', authenticateToken, vesselRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/ais', authenticateToken, aisRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/ops-sites', authenticateToken, opsSitesRoutes);
app.use('/api/customers', authenticateToken, customersRoutes);
app.use('/api/agents', authenticateToken, agentsRoutes);
app.use('/api/teams', authenticateToken, teamsRoutes);

// Test database connection on startup
if (process.env.DATABASE_URL) {
  testConnection().then((connected) => {
    if (connected) {
      console.log('✅ Database connection established');
    } else {
      console.warn('⚠️  Database connection failed - continuing with mock data');
    }
  }).catch((error) => {
    console.error('❌ Database connection error:', error.message);
    console.warn('⚠️  Continuing with mock data - check your DATABASE_URL');
  });
} else {
  console.warn('⚠️  DATABASE_URL not set - using mock data');
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

