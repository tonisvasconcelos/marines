import express from 'express';
import { getAisConfig, setAisConfig } from '../services/aisConfig.js';
import { getProviderName, getProvider } from '../services/ais/index.js';
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
  const providerName = getProviderName().toLowerCase();
  const provider = getProvider();
  const isConfigured = provider.isConfigured();
  
  // Get provider-specific configuration
  let apiKeyPresent = false;
  let apiUrl = '';
  
  if (providerName === 'datalastic') {
    const apiKeyValue = process.env.DATALASTIC_API_KEY;
    apiKeyPresent = !!apiKeyValue;
    apiUrl = process.env.DATALASTIC_API_URL || 'https://api.datalastic.com';
    
    console.log('[settings/ais] Datalastic API Key Check:', {
      apiKeyPresent,
      apiKeyLength: apiKeyValue?.length || 0,
      apiKeyType: typeof apiKeyValue,
      apiKeyFirstChars: apiKeyValue ? `${apiKeyValue.substring(0, 5)}...` : 'null/undefined',
    });
  } else if (providerName === 'myshiptracking') {
    const apiKeyValue = process.env.MYSHIPTRACKING_API_KEY;
    const secretKeyValue = process.env.MYSHIPTRACKING_SECRET_KEY;
    apiKeyPresent = !!apiKeyValue && !!secretKeyValue;
    apiUrl = process.env.MYSHIPTRACKING_API_URL || 'https://api.myshiptracking.com';
    
    console.log('[settings/ais] MyShipTracking API Key Check:', {
      apiKeyPresent,
      apiKeyLength: apiKeyValue?.length || 0,
      secretKeyLength: secretKeyValue?.length || 0,
      apiKeyType: typeof apiKeyValue,
      apiKeyFirstChars: apiKeyValue ? `${apiKeyValue.substring(0, 5)}...` : 'null/undefined',
    });
  }
  
  // Both providers support MMSI and IMO
  res.json({
    provider: providerName,
    apiKeyPresent: isConfigured,
    apiUrl,
    supportedIdentifiers: ['MMSI', 'IMO'],
  });
});

router.put('/ais', requireRole('ADMIN'), async (req, res) => {
  const providerName = getProviderName().toLowerCase();
  
  let message = '';
  if (providerName === 'datalastic') {
    message = 'Datalastic is managed via server environment variables (DATALASTIC_API_KEY). No tenant-level configuration is required.';
  } else if (providerName === 'myshiptracking') {
    message = 'MyShipTracking is managed via server environment variables (MYSHIPTRACKING_API_KEY, MYSHIPTRACKING_SECRET_KEY). No tenant-level configuration is required.';
  } else {
    message = `AIS provider "${providerName}" is managed via server environment variables. No tenant-level configuration is required.`;
  }
  
  res.status(200).json({
    message,
  });
});

export default router;

