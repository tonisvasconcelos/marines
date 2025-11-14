import express from 'express';
import { getAisConfig, setAisConfig } from '../services/aisConfig.js';

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

router.put('/tenant', (req, res) => {
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

router.get('/users', (req, res) => {
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
  const { tenantId } = req;
  
  // Get config from shared service or return default
  const config = getAisConfig(tenantId) || {
    tenantId,
    provider: 'mock',
    apiKey: '',
    secretKey: '',
    pollFrequencyMinutes: 15,
    trackHistoryHours: 72,
  };
  
  // Don't send secret key in response for security (or mask it)
  const response = {
    ...config,
    secretKey: config.secretKey ? '***' : '',
  };
  
  res.json(response);
});

router.put('/ais', async (req, res) => {
  const { tenantId } = req;
  const { provider, apiKey, secretKey, pollFrequencyMinutes, trackHistoryHours } = req.body;
  
  // Get existing config to preserve secret key if not provided
  const existingConfig = getAisConfig(tenantId);
  
  // Store config in shared service (in production, save to DB)
  const config = {
    tenantId,
    provider: provider || 'mock',
    apiKey: apiKey || '',
    // Only update secret key if a new value is provided (not masked)
    secretKey: secretKey && secretKey !== '***' ? secretKey : (existingConfig?.secretKey || ''),
    pollFrequencyMinutes: pollFrequencyMinutes || 15,
    trackHistoryHours: trackHistoryHours || 72,
  };
  
  try {
    await setAisConfig(tenantId, config);
    
    // Return response without exposing secret key
    const response = {
      ...config,
      secretKey: config.secretKey ? '***' : '',
    };
    
    res.json({ message: 'AIS config updated', ...response });
  } catch (error) {
    console.error('Error saving AIS config:', error);
    res.status(500).json({ message: 'Failed to save AIS configuration' });
  }
});

export default router;

