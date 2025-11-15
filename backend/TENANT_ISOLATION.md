# Multi-Tenant Data Isolation - Security Documentation

## Overview

This application implements **strict tenant isolation** to ensure that when sold as a SaaS, customers cannot access each other's data. This is a **critical security requirement**.

## Security Layers

### 1. Authentication Layer (JWT)

- **Location**: `backend/middleware/auth.js`
- **Function**: Extracts `tenantId` from JWT token
- **Security**: Validates that `tenantId` exists and is a valid string
- **Usage**: All protected routes use `req.tenantId` from this middleware

```javascript
// JWT token contains:
{
  userId: "user-1",
  tenantId: "tenant-1",  // CRITICAL: Used for all data filtering
  role: "ADMIN"
}
```

### 2. Application Layer (Route Handlers)

- **Location**: All route files in `backend/routes/`
- **Function**: All database queries filter by `tenantId`
- **Security**: Every query includes `WHERE tenant_id = $1` with `tenantId` from authenticated session

**Example**:
```javascript
// ✅ CORRECT - Uses tenantId from authenticated session
const vessels = await vesselDb.getVessels(req.tenantId);

// ❌ WRONG - Never trust tenantId from request body or params
const vessels = await vesselDb.getVessels(req.body.tenantId);
```

### 3. Database Layer (Functions)

- **Location**: `backend/db/vessels.js`
- **Function**: All database functions require `tenantId` parameter
- **Security**: 
  - Validates `tenantId` is provided and not empty
  - All SQL queries filter by `tenant_id`
  - Never trusts `tenantId` from input data

**Example**:
```javascript
// ✅ CORRECT - Validates and uses tenantId parameter
export async function getVessels(tenantId) {
  validateTenantId(tenantId, 'getVessels');
  const result = await query(
    'SELECT * FROM vessels WHERE tenant_id = $1',
    [tenantId]  // Always from authenticated session
  );
}
```

### 4. Database Schema

- **Location**: `backend/db/schema.sql`
- **Function**: All tables have `tenant_id` column with indexes
- **Security**: 
  - `tenant_id` is NOT NULL
  - Indexes on `tenant_id` for performance
  - Foreign keys maintain tenant isolation

### 5. Row-Level Security (RLS) - Optional

- **Location**: `backend/db/rls_policies.sql`
- **Function**: PostgreSQL-level security policies
- **Status**: Available but not required (application-level filtering is sufficient with connection pooling)
- **Note**: RLS requires careful connection management with pooling

## Security Checklist

### ✅ Implemented

- [x] JWT token contains `tenantId`
- [x] Authentication middleware validates `tenantId`
- [x] All database queries filter by `tenant_id`
- [x] Database functions validate `tenantId` parameter
- [x] Database schema has `tenant_id` columns and indexes
- [x] All routes use `req.tenantId` from authenticated session
- [x] Never trust `tenantId` from request body/params

### 🔒 Security Rules

1. **NEVER** accept `tenantId` from:
   - Request body (`req.body.tenantId`)
   - URL parameters (`req.params.tenantId`)
   - Query strings (`req.query.tenantId`)

2. **ALWAYS** use `tenantId` from:
   - Authenticated JWT token (`req.tenantId` from middleware)
   - Database function parameters (validated)

3. **ALWAYS** filter queries by `tenant_id`:
   ```sql
   SELECT * FROM vessels WHERE tenant_id = $1 AND id = $2
   ```

4. **ALWAYS** validate `tenantId` in database functions:
   ```javascript
   if (!tenantId || typeof tenantId !== 'string') {
     throw new Error('Tenant ID is required');
   }
   ```

## Testing Tenant Isolation

### Manual Test

1. Create a vessel as Tenant A
2. Try to access that vessel as Tenant B
3. Should return 404 (not found) or empty array

### SQL Test

```sql
-- As Tenant A, try to access Tenant B's data
SELECT * FROM vessels WHERE id = 'vessel-from-tenant-b' AND tenant_id = 'tenant-a';
-- Should return 0 rows
```

## Database Migration

To set up tenant isolation:

1. **Create tables**:
   ```bash
   psql $DATABASE_URL -f backend/db/schema.sql
   ```

2. **Verify indexes** (optional):
   ```bash
   psql $DATABASE_URL -f backend/db/security_check.sql
   ```

3. **Enable RLS** (optional, for defense-in-depth):
   ```bash
   psql $DATABASE_URL -f backend/db/rls_policies.sql
   ```

## Monitoring

Log tenant access for security auditing:
- All authentication events log `tenantId`
- Database queries log `tenantId` in error messages
- Failed tenant isolation attempts should be logged

## Future Enhancements

1. **Row-Level Security (RLS)**: Enable PostgreSQL RLS for defense-in-depth
2. **Audit Logging**: Log all data access with tenant information
3. **Tenant Validation**: Verify tenant exists and is active before operations
4. **Rate Limiting**: Per-tenant rate limiting to prevent abuse

## Critical Notes

⚠️ **NEVER**:
- Remove `tenantId` validation
- Accept `tenantId` from user input
- Skip `tenant_id` filtering in queries
- Share database connections between tenants without context

✅ **ALWAYS**:
- Validate `tenantId` in all functions
- Filter by `tenant_id` in all queries
- Use `req.tenantId` from authenticated session
- Test tenant isolation regularly

