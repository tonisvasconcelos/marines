/**
 * Extracts tenant slug from subdomain when enabled.
 * Example: tenant1.app.com -> tenantSlug = tenant1
 */
export function attachTenantFromHost(req, res, next) {
  if (process.env.ENABLE_SUBDOMAIN_ROUTING !== 'true') {
    return next();
  }

  const host = req.headers.host || '';
  const [subdomain] = host.split('.');

  if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
    req.tenantSlug = subdomain.toLowerCase();
  }

  next();
}

