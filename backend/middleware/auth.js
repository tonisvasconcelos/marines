import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * Authentication middleware
 * SECURITY: Extracts tenantId from JWT token and validates it
 * All subsequent routes must use req.tenantId for data access
 */
export function authenticateToken(req, res, next) {
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
      return res.status(403).json({ message: 'Invalid token: tenant information missing' });
    }
    
    req.user = decoded;
    req.tenantId = decoded.tenantId; // CRITICAL: This is used for all data filtering
    
    // Log tenant access for security auditing (remove in production if sensitive)
    console.log(`[AUTH] User ${decoded.userId} authenticated for tenant ${decoded.tenantId}`);
    
    next();
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

