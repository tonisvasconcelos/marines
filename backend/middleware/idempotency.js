const IDEMPOTENCY_TTL_MS = parseInt(process.env.IDEMPOTENCY_TTL_MS || '86400000', 10); // 24h
const store = new Map(); // key -> { status, body, expiresAt }

export function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['idempotency-key'];
  if (!idempotencyKey) {
    return next();
  }

  // SECURITY: Include tenantId in cache key to prevent cross-tenant data leakage
  // This middleware runs after authenticateToken, so req.tenantId should be available
  const tenantId = req.tenantId;
  if (!tenantId) {
    // If tenantId is missing, skip idempotency (shouldn't happen if middleware order is correct)
    console.warn('[IDEMPOTENCY] Missing tenantId, skipping idempotency check');
    return next();
  }

  // Combine tenantId and idempotency-key to ensure tenant isolation
  const key = `${tenantId}:${idempotencyKey}`;

  const existing = store.get(key);
  if (existing && existing.expiresAt > Date.now()) {
    return res.status(existing.status).json(existing.body);
  }

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    store.set(key, {
      status: res.statusCode || 200,
      body,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
    });
    return originalJson(body);
  };

  next();
}

