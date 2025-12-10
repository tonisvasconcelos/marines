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
  const wsUrl = process.env.AISSTREAM_WS_URL || 'wss://stream.aisstream.io/v0/stream';
  const apiKeyValue = process.env.AISSTREAM_API_KEY;
  const apiKeyPresent = !!apiKeyValue;
  
  // Debug logging to diagnose API key detection issues
  console.log('[settings/ais] API Key Check:', {
    apiKeyPresent,
    apiKeyLength: apiKeyValue?.length || 0,
    apiKeyType: typeof apiKeyValue,
    apiKeyFirstChars: apiKeyValue ? `${apiKeyValue.substring(0, 5)}...` : 'null/undefined',
    allAisEnvKeys: Object.keys(process.env).filter(k => k.includes('AIS')),
  });
  
  // AISStream only supports MMSI, not IMO
  // This configuration allows future AIS providers to support IMO or both
  res.json({
    provider: 'aisstream',
    apiKeyPresent,
    wsUrl,
    supportedIdentifiers: ['MMSI'], // AISStream only supports MMSI
  });
});

router.put('/ais', requireRole('ADMIN'), async (req, res) => {
  res.status(200).json({
    message: 'AISStream is managed via server environment variables (AISSTREAM_API_KEY, AISSTREAM_WS_URL). No tenant-level configuration is required.',
  });
});

export default router;

