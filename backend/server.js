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
  
  // Common Vercel deployment URLs (add these if not already in FRONTEND_URL)
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
  
  return origins.length > 0 ? origins : ['http://localhost:3000'];
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      console.warn(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS requests for all routes (additional safety)
app.options('*', cors(corsOptions));
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

