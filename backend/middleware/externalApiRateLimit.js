/**
 * Rate limiting middleware for external API calls
 * Specifically for MyShipTracking API to prevent exceeding rate limits
 * 
 * Rate limits:
 * - Trial users: 90 calls/minute
 * - Paid users: 2000 calls/minute
 * 
 * We use a conservative limit of 80 calls/minute to stay safely under trial limit
 */

import rateLimit from 'express-rate-limit';

/**
 * MyShipTracking API rate limiter
 * Limits to 80 calls per minute per tenant
 * This ensures we stay under the 90 calls/minute trial limit
 */
export const myshiptrackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 80, // Maximum 80 requests per minute (conservative, below 90/min trial limit)
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'MyShipTracking API rate limit exceeded',
    message: 'Too many requests to AIS API. Please try again in a minute.',
    retryAfter: 60, // seconds
  },
  // Use tenant ID in key generator to allow per-tenant rate limiting
  keyGenerator: (req) => {
    const tenantId = req.tenantId || 'anonymous';
    return `myshiptracking:${tenantId}`;
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    console.warn(`[RateLimit] MyShipTracking API rate limit exceeded for tenant ${req.tenantId || 'anonymous'}`);
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests to AIS API. Please try again in a minute.',
      retryAfter: 60,
    });
  },
  // Skip rate limiting if API keys are not configured (will fail anyway)
  skip: (req) => {
    const hasApiKey = !!process.env.MYSHIPTRACKING_API_KEY;
    const hasSecretKey = !!process.env.MYSHIPTRACKING_SECRET_KEY;
    if (!hasApiKey || !hasSecretKey) {
      console.log('[RateLimit] Skipping rate limit check - API keys not configured');
      return true;
    }
    return false;
  },
});

/**
 * Per-tenant rate limiter (if needed for future multi-tenant API keys)
 * Currently uses global API key, but structure supports per-tenant limits
 */
export function createTenantRateLimiter(maxRequests = 80) {
  return rateLimit({
    windowMs: 60 * 1000,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const tenantId = req.tenantId || 'anonymous';
      return `myshiptracking:tenant:${tenantId}`;
    },
    message: {
      error: 'Rate limit exceeded',
      message: `Too many requests. Limit: ${maxRequests} requests per minute.`,
      retryAfter: 60,
    },
  });
}

