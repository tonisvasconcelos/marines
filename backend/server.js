import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import portCallRoutes from './routes/portCalls.js';
import vesselRoutes from './routes/vessels.js';
import dashboardRoutes from './routes/dashboard.js';
import aisRoutes from './routes/ais.js';
import settingsRoutes from './routes/settings.js';
import opsSitesRoutes from './routes/opsSites.js';
import fleetRoutes from './routes/fleets.js';
import customersRoutes from './routes/customers.js';
import agentsRoutes from './routes/agents.js';
import teamsRoutes from './routes/teams.js';
import invoiceRoutes from './routes/invoices.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import { authenticateToken } from './middleware/auth.js';
import { testConnection } from './db/connection.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { attachTenantFromHost } from './middleware/tenantRouting.js';

dotenv.config();

// Debug: Log AIS environment variables at startup
console.log('[ENV] AISSTREAM_API_KEY present:', !!process.env.AISSTREAM_API_KEY);
console.log('[ENV] AISSTREAM_API_KEY length:', process.env.AISSTREAM_API_KEY?.length || 0);
console.log('[ENV] AISSTREAM_WS_URL:', process.env.AISSTREAM_WS_URL || 'not set');
const aisEnvVars = Object.keys(process.env).filter(k => k.includes('AIS'));
console.log('[ENV] All AIS-related variables:', aisEnvVars.map(k => `${k}=${k.includes('KEY') ? '***' : process.env[k]}`));

const app = express();
// Parse PORT as integer, default to 3001
const PORT = parseInt(process.env.PORT, 10) || 3001;
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Note: CORS middleware will handle OPTIONS requests automatically
// No need for manual OPTIONS handler - it can interfere with cors middleware

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
      console.log(`[CORS] ✅ Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.warn(`[CORS] ❌ Blocked origin: ${origin}`);
      console.warn(`[CORS] Allowed origins: ${allowedOrigins.join(', ')}`);
      // In production, be strict; in dev, be more permissive
      if (process.env.NODE_ENV === 'production') {
        // In production, still allow if it's a Vercel domain (for preview deployments)
        if (origin.includes('.vercel.app')) {
          console.warn(`[CORS] Production mode - allowing Vercel domain: ${origin}`);
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
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

// Apply CORS middleware for all other requests
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(attachTenantFromHost);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '500', 10),
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later.' },
});

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
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter, authRoutes);

// Protected routes
app.use('/api/port-calls', authenticateToken, idempotencyMiddleware, portCallRoutes);
app.use('/api/vessels', authenticateToken, vesselRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/ais', authenticateToken, aisRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/ops-sites', authenticateToken, opsSitesRoutes);
app.use('/api/fleets', authenticateToken, fleetRoutes);
app.use('/api/customers', authenticateToken, customersRoutes);
app.use('/api/agents', authenticateToken, agentsRoutes);
app.use('/api/teams', authenticateToken, teamsRoutes);
app.use('/api/invoices', authenticateToken, idempotencyMiddleware, invoiceRoutes);
app.use('/api/purchase-orders', authenticateToken, idempotencyMiddleware, purchaseOrderRoutes);

// Standardized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Internal server error',
  });
});

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

