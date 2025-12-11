/**
 * AIS Provider Factory
 * Creates and manages the active AIS provider instance
 */

import { MyShipTrackingProvider } from './providers/myshiptracking.js';
import { DatalasticProvider } from './providers/datalastic.js';

let activeProvider = null;

/**
 * Get the active AIS provider
 * @returns {BaseAisProvider} Active provider instance
 */
export function getProvider() {
  if (activeProvider) {
    return activeProvider;
  }
  
  // Determine provider from environment variable
  const providerName = (process.env.AIS_PROVIDER || 'datalastic').toLowerCase();
  
  console.log(`[AIS Provider] Initializing provider: ${providerName}`);
  
  switch (providerName) {
    case 'datalastic':
      activeProvider = new DatalasticProvider();
      break;
    case 'myshiptracking':
      activeProvider = new MyShipTrackingProvider();
      break;
    default:
      console.warn(`[AIS Provider] Unknown provider "${providerName}", defaulting to datalastic`);
      activeProvider = new DatalasticProvider();
  }
  
  // Check if provider is configured
  if (!activeProvider.isConfigured()) {
    console.warn(`[AIS Provider] Provider "${providerName}" is not properly configured. Some features may not work.`);
  } else {
    console.log(`[AIS Provider] Provider "${providerName}" initialized successfully`);
  }
  
  return activeProvider;
}

/**
 * Reset the provider instance (useful for testing or provider switching)
 */
export function resetProvider() {
  activeProvider = null;
}

/**
 * Get provider name
 * @returns {string} Provider name
 */
export function getProviderName() {
  const provider = getProvider();
  return provider.getName();
}

