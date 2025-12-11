/**
 * Rate limiting middleware for AIS API calls
 * Supports multiple providers with provider-specific rate limits
 * 
 * Rate limits:
 * - MyShipTracking: 80 calls/minute (conservative, below 90/min trial limit)
 * - Datalastic: 600 calls/minute
 */

import rateLimit from 'express-rate-limit';
import { getProviderName } from '../services/ais/providerFactory.js';

/**
 * Get rate limit configuration based on active provider
 * @returns {object} Rate limit configuration
 */
function getRateLimitConfig() {
  const providerName = getProviderName().toLowerCase();
  
  switch (providerName) {
    case 'datalastic':
      return {
        max: 600, // Datalastic allows 600 calls/minute
        message: {
          error: 'Datalastic API rate limit exceeded',
          message: 'Too many requests to AIS API. Please try again in a minute.',
          retryAfter: 60,
        },
      };
    case 'myshiptracking':
    default:
      return {
        max: 80, // Conservative limit for MyShipTracking
        message: {
          error: 'MyShipTracking API rate limit exceeded',
          message: 'Too many requests to AIS API. Please try again in a minute.',
          retryAfter: 60,
        },
      };
  }
}

/**
 * Check if API is configured for the active provider
 * @returns {boolean} True if API is configured
 */
function isApiConfigured() {
  const providerName = getProviderName().toLowerCase();
  
  switch (providerName) {
    case 'datalastic':
      return !!process.env.DATALASTIC_API_KEY;
    case 'myshiptracking':
      return !!(process.env.MYSHIPTRACKING_API_KEY && process.env.MYSHIPTRACKING_SECRET_KEY);
    default:
      return false;
  }
}

/**
 * AIS API rate limiter
 * Automatically adjusts rate limit based on active provider
 */
export const aisApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: () => {
    const config = getRateLimitConfig();
    return config.max;
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: (req) => {
    const config = getRateLimitConfig();
    return config.message;
  },
  // Use tenant ID in key generator to allow per-tenant rate limiting
  keyGenerator: (req) => {
    const tenantId = req.tenantId || 'anonymous';
    const providerName = getProviderName().toLowerCase();
    return `ais:${providerName}:${tenantId}`;
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    const providerName = getProviderName();
    const config = getRateLimitConfig();
    console.warn(`[RateLimit] ${providerName} API rate limit exceeded for tenant ${req.tenantId || 'anonymous'}`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: config.message.message,
      retryAfter: config.message.retryAfter,
    });
  },
  // Skip rate limiting if API keys are not configured (will fail anyway)
  skip: (req) => {
    if (!isApiConfigured()) {
      console.log('[RateLimit] Skipping rate limit check - API keys not configured');
      return true;
    }
    return false;
  },
});

/**
 * Backward compatibility: Export as myshiptrackingLimiter
 * This allows existing code to continue working
 */
export const myshiptrackingLimiter = aisApiLimiter;

/**
 * Per-tenant rate limiter (if needed for future multi-tenant API keys)
 */
export function createTenantRateLimiter(maxRequests = null) {
  const config = getRateLimitConfig();
  const max = maxRequests || config.max;
  
  return rateLimit({
    windowMs: 60 * 1000,
    max: max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const tenantId = req.tenantId || 'anonymous';
      const providerName = getProviderName().toLowerCase();
      return `ais:${providerName}:tenant:${tenantId}`;
    },
    message: {
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${max} requests per minute.`,
      retryAfter: 60,
    },
  });
}

