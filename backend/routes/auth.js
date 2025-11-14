import express from 'express';
import jwt from 'jsonwebtoken';
import { getMockUsers } from '../data/mockData.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

router.post('/login', (req, res) => {
  console.log('Login request received:', { 
    email: req.body?.email, 
    hasPassword: !!req.body?.password,
    body: req.body 
  });

  const { email, password } = req.body;

  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ message: 'Email and password are required' });
  }

  // Mock authentication - in production, verify password hash
  const users = getMockUsers();
  const user = users.find((u) => u.email === email);

  console.log('User lookup:', { 
    email, 
    found: !!user, 
    passwordMatch: user && password === 'demo123' 
  });

  if (!user || password !== 'demo123') {
    console.log('Authentication failed');
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('Login successful, sending response');
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    tenant: user.tenant,
  });
});

export default router;

