import express from 'express';
import { getAisConfig, setAisConfig } from '../services/aisConfig.js';
import { requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/tenant', (req, res) => {
  const { tenantId } = req;
  // In production, fetch from DB
  res.json({
    id: tenantId,
    name: 'Demo Shipping Agency',
    slug: 'demo',
    defaultCountryCode: 'BR',
    defaultLocale: 'pt-BR',
  });
});

router.put('/tenant', requireRole('ADMIN'), (req, res) => {
  const { tenantId } = req;
  const { name, defaultCountryCode, defaultLocale } = req.body;
  
  // In production, update in DB
  // For now, just return the updated data
  const updated = {
    id: tenantId,
    name: name || 'Demo Shipping Agency',
    slug: 'demo',
    defaultCountryCode: defaultCountryCode || 'BR',
    defaultLocale: defaultLocale || 'pt-BR',
  };
  
  res.json(updated);
});

router.get('/users', requireRole('ADMIN'), (req, res) => {
  const { tenantId } = req;
  // In production, fetch from DB
  res.json([
    {
      id: 'user-1',
      email: 'demo@marines.app',
      name: 'Demo User',
      role: 'ADMIN',
    },
  ]);
});

router.get('/ais', (req, res) => {
  const apiKeyValue = process.env.MYSHIPTRACKING_API_KEY;
  const secretKeyValue = process.env.MYSHIPTRACKING_SECRET_KEY;
  const apiKeyPresent = !!apiKeyValue && !!secretKeyValue;
  
  // Debug logging to diagnose API key detection issues
  console.log('[settings/ais] MyShipTracking API Key Check:', {
    apiKeyPresent,
    apiKeyLength: apiKeyValue?.length || 0,
    secretKeyLength: secretKeyValue?.length || 0,
    apiKeyType: typeof apiKeyValue,
    apiKeyFirstChars: apiKeyValue ? `${apiKeyValue.substring(0, 5)}...` : 'null/undefined',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('MYSHIPTRACKING') || k.includes('AIS')),
  });
  
  // MyShipTracking supports both MMSI and IMO
  res.json({
    provider: 'myshiptracking',
    apiKeyPresent,
    apiUrl: process.env.MYSHIPTRACKING_API_URL || 'https://api.myshiptracking.com',
    supportedIdentifiers: ['MMSI', 'IMO'], // MyShipTracking supports both
  });
});

router.put('/ais', requireRole('ADMIN'), async (req, res) => {
  res.status(200).json({
    message: 'MyShipTracking is managed via server environment variables (MYSHIPTRACKING_API_KEY, MYSHIPTRACKING_SECRET_KEY). No tenant-level configuration is required.',
  });
});

export default router;

