# Architecture Review & Recommendations
## Multi-Tenant SaaS Maritime Operations Platform

**Review Date:** November 14, 2025  
**Reviewer:** DevOps & Architecture Expert  
**Application Type:** Multi-tenant SaaS for Maritime Port Call Management

---

## Executive Summary

### Current Status
- ✅ **Frontend:** Deployed on Vercel (`marines-v9gg.vercel.app`)
- ✅ **Backend:** Deployed on Railway (Vercel also attempted)
- ⚠️ **Services:** Both services show "Unexposed" status
- ⚠️ **Connection:** Frontend cannot reach backend (401 errors in logs)
- ⚠️ **Architecture:** Duplicate deployments on both platforms

### Critical Issues
1. **Service Exposure:** Backend and frontend services are unexposed (no public URLs)
2. **Platform Confusion:** Services deployed on both Railway AND Vercel
3. **Environment Variables:** Frontend missing `VITE_API_URL` in correct service
4. **Multi-Tenant Security:** No database-level tenant isolation (RLS)
5. **Data Segregation:** Currently application-level only (JWT-based)

---

## 1. Deployment Architecture Analysis

### Current Setup

```
┌─────────────────────────────────────────────────────────┐
│                    GITHUB REPO                          │
│         tonisvasconcelos/marines                        │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
        ▼                                   ▼
┌──────────────┐                    ┌──────────────┐
│   RAILWAY    │                    │   VERCEL     │
│              │                    │              │
│ Backend ✅   │                    │ Backend ⚠️   │
│ Frontend ⚠️  │                    │ Frontend ✅  │
│              │                    │              │
│ Unexposed    │                    │ Unexposed    │
└──────────────┘                    └──────────────┘
        │                                   │
        └─────────────────┬─────────────────┘
                          │
                          ▼
                ┌─────────────────┐
                │  NEON POSTGRES  │
                │   (Database)    │
                └─────────────────┘
```

### Issues Identified

#### 🔴 Critical: Duplicate Deployments
- **Backend deployed on BOTH Railway and Vercel**
- **Frontend deployed on BOTH Railway and Vercel**
- **Recommendation:** Choose ONE platform per service
  - **Backend:** Railway (better for Express.js, persistent connections)
  - **Frontend:** Vercel (optimized for static sites/SPAs)

#### 🔴 Critical: Unexposed Services
- Both services show "Unexposed service" status
- No public URLs available
- Frontend cannot connect to backend
- **Action Required:** Expose both services to get public URLs

#### 🟡 Medium: Environment Variable Mismatch
- Frontend service (`marines-app-frontend`) has NO environment variables
- Frontend project (`marines-v9gg`) HAS `VITE_API_URL` but backend is unexposed
- **Action Required:** 
  1. Expose backend service
  2. Add `VITE_API_URL` to correct frontend service
  3. Redeploy frontend

---

## 2. Multi-Tenant Architecture Review

### Current Implementation

#### ✅ Strengths
1. **JWT-Based Tenant Identification**
   - Tenant ID embedded in JWT token
   - Extracted in `authenticateToken` middleware
   - Available as `req.tenantId` in all routes

2. **Application-Level Isolation**
   - All routes check `tenantId` from JWT
   - Routes filter data by `tenantId`
   - Example: `getMockVessels(tenantId)`

3. **Tenant Context in Frontend**
   - Tenant info stored in localStorage
   - Included in API requests via JWT

#### 🔴 Critical Security Gaps

### 1. No Database-Level Isolation (Row-Level Security)

**Current State:**
- All tenants share the same database
- No PostgreSQL Row-Level Security (RLS) policies
- Tenant isolation relies ONLY on application code
- **Risk:** SQL injection or code bug could expose cross-tenant data

**Recommendation:**
```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ... all other tables

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation ON vessels
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Set tenant context before queries
SET app.current_tenant_id = 'tenant-uuid-from-jwt';
```

### 2. No Tenant Validation in Database Queries

**Current State:**
- Database queries don't enforce tenant isolation
- Application code must remember to filter by `tenantId`
- Easy to forget in new routes

**Recommendation:**
```javascript
// backend/db/query.js
export async function queryWithTenant(tenantId, text, params) {
  // Set tenant context in PostgreSQL session
  await pool.query('SET app.current_tenant_id = $1', [tenantId]);
  
  // Execute query (RLS will automatically filter)
  const result = await pool.query(text, params);
  
  // Clear tenant context
  await pool.query('RESET app.current_tenant_id');
  
  return result;
}
```

### 3. Shared Database Connection Pool

**Current State:**
- Single connection pool for all tenants
- No tenant-specific connection isolation
- **Risk:** Connection leakage could expose tenant data

**Recommendation:**
- Keep single pool (efficient)
- But ALWAYS set tenant context before queries
- Use RLS as safety net

### 4. No Tenant Data Encryption

**Current State:**
- Data stored in plain text
- No encryption at rest per tenant
- **Risk:** Database breach exposes all tenant data

**Recommendation:**
- Enable PostgreSQL encryption at rest
- Consider tenant-specific encryption keys for sensitive data
- Use Neon's built-in encryption (already enabled)

---

## 3. Security Recommendations for SaaS Reselling

### Authentication & Authorization

#### Current: JWT with tenantId
✅ **Good:** Stateless, scalable  
⚠️ **Improve:**
1. **Token Expiration:** Currently 24h - too long for SaaS
   ```javascript
   // Recommended: 1 hour access token + refresh token
   { expiresIn: '1h' } // Access token
   { expiresIn: '7d' } // Refresh token
   ```

2. **Token Rotation:** No refresh token mechanism
   - Implement refresh token rotation
   - Store refresh tokens in database (revocable)

3. **Password Security:** Currently plain text comparison
   ```javascript
   // CRITICAL: Implement bcrypt
   import bcrypt from 'bcryptjs';
   const isValid = await bcrypt.compare(password, user.passwordHash);
   ```

### API Security

#### Missing Security Headers
```javascript
// Add security middleware
app.use(helmet()); // Security headers
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 })); // Rate limiting
```

#### CORS Configuration
```javascript
// Current: Single FRONTEND_URL
// Recommended: Support multiple tenant domains
const allowedOrigins = [
  process.env.FRONTEND_URL,
  ...process.env.TENANT_DOMAINS?.split(',') || []
];
```

### Data Privacy & Compliance

#### GDPR/Privacy Considerations
1. **Data Export:** Implement tenant data export
2. **Data Deletion:** Implement tenant data deletion (GDPR right to be forgotten)
3. **Audit Logging:** Log all data access per tenant
4. **Data Residency:** Consider tenant-specific database regions

---

## 4. Scalability Recommendations

### Database Scaling

#### Current: Single Neon Database
- ✅ Good for MVP
- ⚠️ **Scaling Strategy:**
  1. **Vertical Scaling:** Upgrade Neon plan as needed
  2. **Read Replicas:** Add read replicas for reporting
  3. **Sharding:** Consider tenant-based sharding at 1000+ tenants
  4. **Connection Pooling:** Already using Neon pooler ✅

### Application Scaling

#### Backend (Railway)
- ✅ Stateless (can scale horizontally)
- ⚠️ **Recommendations:**
  - Enable auto-scaling based on CPU/memory
  - Use Railway's horizontal scaling
  - Consider multiple regions for global tenants

#### Frontend (Vercel)
- ✅ CDN-distributed (already scalable)
- ✅ Edge functions for API routes (if needed)

### Caching Strategy

#### Missing: No Caching Layer
**Recommendation:**
```javascript
// Add Redis for:
// 1. Session storage
// 2. Tenant configuration cache
// 3. API response caching
// 4. Rate limiting
```

---

## 5. Immediate Action Items

### Priority 1: Fix Deployment (Critical)

#### Step 1: Choose Deployment Strategy
**Recommended:**
- **Backend:** Railway only (remove Vercel backend)
- **Frontend:** Vercel only (remove Railway frontend)

#### Step 2: Expose Services
1. **Railway Backend:**
   - Go to Railway → Backend Service → Settings
   - Generate public domain
   - Copy URL (e.g., `https://marines-backend.up.railway.app`)

2. **Vercel Frontend:**
   - Already exposed at `marines-v9gg.vercel.app` ✅

#### Step 3: Connect Frontend to Backend
1. In Vercel `marines-v9gg` project:
   - Settings → Environment Variables
   - Add: `VITE_API_URL` = Railway backend URL
   - Redeploy frontend

#### Step 4: Update Backend CORS
1. In Railway backend:
   - Update `FRONTEND_URL` = `https://marines-v9gg.vercel.app`
   - Redeploy backend

### Priority 2: Database Schema & RLS (High)

#### Step 1: Create Database Schema
```sql
-- Create tables with tenant_id
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50),
  UNIQUE(tenant_id, email)
);

CREATE TABLE vessels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  imo VARCHAR(50),
  mmsi VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  -- ... other fields
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY tenant_isolation_vessels ON vessels
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

#### Step 2: Update Database Connection
```javascript
// backend/db/connection.js
export async function queryWithTenant(tenantId, text, params = []) {
  const client = await pool.connect();
  try {
    // Set tenant context
    await client.query('SET app.current_tenant_id = $1', [tenantId]);
    
    // Execute query (RLS enforces isolation)
    const result = await client.query(text, params);
    
    return result;
  } finally {
    // Reset tenant context
    await client.query('RESET app.current_tenant_id');
    client.release();
  }
}
```

### Priority 3: Security Hardening (High)

#### Step 1: Implement Password Hashing
```javascript
// backend/routes/auth.js
import bcrypt from 'bcryptjs';

// On user creation/update
const passwordHash = await bcrypt.hash(password, 10);

// On login
const user = await db.query('SELECT * FROM users WHERE email = $1 AND tenant_id = $2', [email, tenantId]);
const isValid = await bcrypt.compare(password, user.passwordHash);
```

#### Step 2: Add Security Headers
```javascript
// backend/server.js
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));
```

#### Step 3: Implement Refresh Tokens
```javascript
// Store refresh tokens in database
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 6. Recommended Architecture for SaaS Reselling

### Ideal Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TENANT ISOLATION LAYER                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Tenant A   │  │   Tenant B   │  │   Tenant C   │     │
│  │  (Company 1) │  │  (Company 2) │  │  (Company 3) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Frontend (Vercel) - Single Codebase                │  │
│  │  - Tenant identified via subdomain or path           │  │
│  │  - JWT contains tenantId                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Backend API (Railway)                              │  │
│  │  - JWT middleware extracts tenantId                  │  │
│  │  - All queries filtered by tenantId                 │  │
│  │  - RLS policies enforce isolation                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PostgreSQL (Neon)                                  │  │
│  │  - Row-Level Security (RLS) enabled                  │  │
│  │  - All tables have tenant_id column                 │  │
│  │  - RLS policies enforce tenant isolation            │  │
│  │  - Connection pooling via Neon pooler                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Redis (Optional - for caching)                     │  │
│  │  - Tenant-specific cache keys                       │  │
│  │  - Session storage                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Tenant Identification Strategy

#### Current: JWT-Based (Good for MVP)
- ✅ Simple implementation
- ✅ Works with single domain
- ⚠️ **Limitation:** All tenants use same domain

#### Future: Subdomain-Based (Recommended for SaaS)
```
tenant1.marinesapp.com → Tenant 1
tenant2.marinesapp.com → Tenant 2
tenant3.marinesapp.com → Tenant 3
```

**Implementation:**
```javascript
// Extract tenant from subdomain
const subdomain = req.headers.host.split('.')[0];
const tenant = await db.query('SELECT * FROM tenants WHERE slug = $1', [subdomain]);
```

---

## 7. Monitoring & Observability

### Missing: No Monitoring Setup

**Recommendation:**
1. **Application Monitoring:**
   - Railway: Built-in metrics ✅
   - Vercel: Built-in analytics ✅
   - Add: Sentry for error tracking

2. **Database Monitoring:**
   - Neon: Built-in metrics ✅
   - Add: Query performance monitoring
   - Add: Connection pool monitoring

3. **Business Metrics:**
   - Track: Active tenants
   - Track: API usage per tenant
   - Track: Data storage per tenant
   - Track: Feature usage per tenant

---

## 8. Cost Optimization

### Current Costs
- **Vercel:** Free tier (frontend)
- **Railway:** $5/month credit (backend)
- **Neon:** Free tier (0.5GB database)

### Scaling Costs
- **100 Tenants:** ~$50-100/month
- **1000 Tenants:** ~$500-1000/month
- **10,000 Tenants:** Consider dedicated infrastructure

### Optimization Strategies
1. **Database:** Use connection pooling (already done ✅)
2. **Caching:** Reduce database queries
3. **CDN:** Vercel edge network (already done ✅)
4. **Archiving:** Archive old data per tenant

---

## 9. Compliance & Legal

### For SaaS Reselling

#### Required Features
1. **Terms of Service:** Per-tenant ToS acceptance
2. **Data Processing Agreement:** GDPR compliance
3. **SLA:** Define uptime guarantees
4. **Data Export:** Allow tenants to export their data
5. **Data Deletion:** Allow tenants to delete their data

#### Recommended Features
1. **Audit Logs:** Track all data access
2. **Backup & Recovery:** Automated backups per tenant
3. **Data Residency:** Option for region-specific data storage

---

## 10. Testing Strategy

### Missing: No Test Coverage

**Recommendation:**
1. **Unit Tests:** Test tenant isolation logic
2. **Integration Tests:** Test cross-tenant data leakage
3. **E2E Tests:** Test full tenant workflows
4. **Security Tests:** Test SQL injection, XSS, CSRF

### Multi-Tenant Testing
```javascript
// Test tenant isolation
describe('Tenant Isolation', () => {
  it('should not allow Tenant A to access Tenant B data', async () => {
    const tenantAToken = await login('tenant-a-user');
    const tenantBData = await api.get('/api/vessels', {
      headers: { Authorization: `Bearer ${tenantAToken}` }
    });
    // Should only return Tenant A vessels
    expect(tenantBData.every(v => v.tenantId === 'tenant-a')).toBe(true);
  });
});
```

---

## 11. Deployment Checklist

### Immediate (This Week)
- [ ] Expose Railway backend service
- [ ] Add `VITE_API_URL` to Vercel frontend
- [ ] Test end-to-end login flow
- [ ] Remove duplicate deployments (choose one platform per service)

### Short Term (This Month)
- [ ] Create database schema with tenant_id
- [ ] Implement Row-Level Security (RLS)
- [ ] Implement password hashing (bcrypt)
- [ ] Add security headers (helmet)
- [ ] Add rate limiting
- [ ] Migrate from mock data to database

### Medium Term (Next Quarter)
- [ ] Implement refresh tokens
- [ ] Add Redis caching
- [ ] Add monitoring (Sentry)
- [ ] Implement audit logging
- [ ] Add data export functionality
- [ ] Add automated backups

### Long Term (6+ Months)
- [ ] Subdomain-based tenant routing
- [ ] Multi-region support
- [ ] Advanced analytics per tenant
- [ ] White-label options
- [ ] API rate limiting per tenant

---

## 12. Risk Assessment

### High Risk
1. **Data Leakage:** No RLS = risk of cross-tenant data access
2. **Security:** Plain text passwords, no rate limiting
3. **Scalability:** Single database for all tenants

### Medium Risk
1. **Availability:** Single region deployment
2. **Backup:** No automated backup strategy
3. **Monitoring:** Limited observability

### Low Risk
1. **Cost:** Current scale is manageable
2. **Performance:** Adequate for current load

---

## Conclusion

### Current State: MVP Ready
- ✅ Basic multi-tenant architecture in place
- ✅ Deployment infrastructure configured
- ⚠️ Needs security hardening before production
- ⚠️ Needs database-level isolation for SaaS reselling

### Recommended Next Steps
1. **Fix deployment** (expose services, connect frontend/backend)
2. **Implement RLS** (database-level tenant isolation)
3. **Security hardening** (password hashing, rate limiting, headers)
4. **Database migration** (create schema, migrate from mock data)

### Timeline Estimate
- **Week 1:** Fix deployment, expose services
- **Week 2-3:** Database schema + RLS implementation
- **Week 4:** Security hardening
- **Month 2:** Full migration from mock data
- **Month 3:** Production-ready for first paying tenant

---

## Appendix: Environment Variables Reference

### Backend (Railway)
```
PORT=3001 (auto-set by Railway)
DATABASE_URL=postgresql://... (Neon connection string)
JWT_SECRET=<strong-random-string>
FRONTEND_URL=https://marines-v9gg.vercel.app
APP_BASE_URL=https://marines-v9gg.vercel.app
NODE_ENV=production
```

### Frontend (Vercel)
```
VITE_API_URL=https://marines-backend.up.railway.app
```

### Database (Neon)
- Connection pooling enabled ✅
- SSL required ✅
- Automatic backups ✅

