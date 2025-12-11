import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getMockUsers } from '../data/mockData.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || `${JWT_SECRET}-refresh`;
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || '1h';
const REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL || '7d';

// In-memory refresh token store (replace with DB table in production)
const refreshTokens = new Map(); // token -> { userId, tenantId, role, jti }

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issueAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function issueRefreshToken(payload, jti) {
  return jwt.sign({ ...payload, jti }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

function sanitizeUser(user) {
  const { password, passwordHash, ...rest } = user;
  return rest;
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  console.log('[Auth] Login attempt:', { email, hasPassword: !!password, passwordLength: password?.length });

  if (!email || !password) {
    console.log('[Auth] Missing email or password');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!emailRegex.test(email)) {
    console.log('[Auth] Invalid email format:', email);
    return res.status(400).json({ message: 'Email is invalid' });
  }

  const users = getMockUsers();
  console.log('[Auth] Available users:', users.map(u => ({ email: u.email, hasPasswordHash: !!u.passwordHash })));
  
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  console.log('[Auth] Found user:', user ? { id: user.id, email: user.email, hasPasswordHash: !!user.passwordHash } : null);

  if (!user) {
    console.log('[Auth] User not found for email:', email);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordHash = user.passwordHash || user.password;
  console.log('[Auth] Password hash check:', { hasPasswordHash: !!passwordHash, hashLength: passwordHash?.length });
  
  // Validate passwordHash exists before attempting comparison
  if (!passwordHash) {
    console.log('[Auth] No password hash found for user');
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  let validPassword = false;
  try {
    console.log('[Auth] Comparing password with bcrypt...');
    validPassword = await bcrypt.compare(password, passwordHash);
    console.log('[Auth] Password comparison result:', validPassword);
  } catch (error) {
    // Handle bcrypt errors (e.g., invalid hash format) as authentication failures
    console.error('[Auth] Password comparison error:', error.message, error.stack);
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  if (!validPassword) {
    console.log('[Auth] Password does not match');
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  console.log('[Auth] Login successful for user:', user.id);

  const basePayload = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  };

  const accessToken = issueAccessToken(basePayload);
  const refreshJti = crypto.randomUUID();
  const refreshToken = issueRefreshToken(basePayload, refreshJti);
  refreshTokens.set(refreshToken, { ...basePayload, jti: refreshJti });

  res.json({
    accessToken,
    token: accessToken, // backward compatibility
    refreshToken,
    user: sanitizeUser(user),
    tenant: user.tenant,
  });
});

router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);

    const stored = refreshTokens.get(refreshToken);
    if (!stored || stored.jti !== decoded.jti) {
      refreshTokens.delete(refreshToken);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const basePayload = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role,
    };

    // Rotate refresh token
    refreshTokens.delete(refreshToken);
    const newRefreshJti = crypto.randomUUID();
    const newRefreshToken = issueRefreshToken(basePayload, newRefreshJti);
    refreshTokens.set(newRefreshToken, { ...basePayload, jti: newRefreshJti });

    const accessToken = issueAccessToken(basePayload);

    res.json({ accessToken, token: accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});

router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken && refreshTokens.has(refreshToken)) {
    refreshTokens.delete(refreshToken);
  }
  res.status(200).json({ message: 'Logged out' });
});

export default router;

