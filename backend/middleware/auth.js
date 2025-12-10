import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * Authentication middleware
 * SECURITY: Extracts tenantId from JWT token and validates it
 * All subsequent routes must use req.tenantId for data access
 */
export function authenticateToken(req, res, next) {
  // Skip authentication for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // SECURITY: Validate tenantId is present in token
    if (!decoded.tenantId || typeof decoded.tenantId !== 'string') {
      console.error('Invalid token: missing or invalid tenantId', { decoded });
      return res.status(401).json({ message: 'Invalid token: tenant information missing' });
    }
    
    req.user = decoded;
    req.tenantId = decoded.tenantId; // CRITICAL: This is used for all data filtering
    
    // Log tenant access for security auditing (remove in production if sensitive)
    console.log(`[AUTH] User ${decoded.userId} authenticated for tenant ${decoded.tenantId}`);
    
    next();
  } catch (error) {
    // All JWT verification errors are authentication failures (expired, invalid, malformed)
    // Return 401 so clients can attempt token refresh
    const isExpired = error.name === 'TokenExpiredError';
    console.error('Token verification failed:', error.message, { expired: isExpired });
    return res.status(401).json({ 
      message: isExpired ? 'Token expired' : 'Invalid token' 
    });
  }
}

/**
 * Role-based authorization middleware
 * @param  {...string} roles Allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    return next();
  };
}

