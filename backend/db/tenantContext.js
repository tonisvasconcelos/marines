import { getClient, query } from './connection.js';

/**
 * Executes a query with the tenant context set at the session level.
 * Uses SET LOCAL app.current_tenant_id to leverage RLS policies.
 */
export async function queryWithTenant(text, params, tenantId) {
  if (!tenantId) {
    throw new Error('tenantId is required for tenant-scoped query');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
    const result = await client.query(text, params);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Runs an arbitrary callback inside a tenant-scoped transaction.
 */
export async function withTenantTransaction(tenantId, callback) {
  if (!tenantId) {
    throw new Error('tenantId is required for tenant-scoped transaction');
  }
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

