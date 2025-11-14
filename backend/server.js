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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

