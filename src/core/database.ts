/**
 * Nuvex - Database Utilities
 * Next-gen Unified Vault Experience
 * 
 * Database schema setup and migration utilities for PostgreSQL storage layer.
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */

import type { Pool as PoolType } from 'pg';

export const NUVEX_SCHEMA_SQL = `
-- Nuvex storage table for PostgreSQL layer
CREATE TABLE IF NOT EXISTS nuvex_storage (
  id SERIAL PRIMARY KEY,
  key VARCHAR(512) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_nuvex_storage_expires_at 
ON nuvex_storage(expires_at) 
WHERE expires_at IS NOT NULL;

-- Ensure pg_trgm extension is available for GIN index
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for key pattern searches
CREATE INDEX IF NOT EXISTS idx_nuvex_storage_key_pattern 
ON nuvex_storage USING gin(key gin_trgm_ops);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_nuvex_storage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_nuvex_storage_updated_at ON nuvex_storage;
CREATE TRIGGER trigger_update_nuvex_storage_updated_at
  BEFORE UPDATE ON nuvex_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_nuvex_storage_updated_at();

-- Function to clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_nuvex_storage()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM nuvex_storage 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
`;

export interface SchemaSetupOptions {
  /** Enable trigram extension for advanced pattern matching (requires pg_trgm) */
  enableTrigram?: boolean; 
  /** Set up periodic cleanup job using pg_cron extension */
  enableCleanupJob?: boolean; 
}

/**
 * Setup Nuvex database schema
 * 
 * Creates the necessary PostgreSQL tables, indexes, functions, and triggers
 * required for the Nuvex storage system. This function is idempotent and
 * can be safely called multiple times.
 * 
 * Features created:
 * - `nuvex_storage` table with JSON support and TTL
 * - Indexes for performance optimization
 * - Automatic `updated_at` trigger
 * - Cleanup function for expired entries
 * - Optional trigram support for pattern matching
 * - Optional automated cleanup job scheduling
 * 
 * @param db - PostgreSQL connection pool
 * @param options - Optional configuration for schema setup
 * @returns Promise that resolves when schema is created
 * 
 * @example
 * ```typescript
 * import { Pool } from 'pg';
 * import { setupNuvexSchema } from './database';
 * 
 * const db = new Pool({ connectionString: 'postgresql://...' });
 * 
 * // Basic setup
 * await setupNuvexSchema(db);
 * 
 * // Advanced setup with all features
 * await setupNuvexSchema(db, {
 *   enableTrigram: true,    // Enable pattern matching
 *   enableCleanupJob: true  // Auto-cleanup expired entries
 * });
 * ```
 * 
 * @throws {Error} If database connection fails or schema creation fails
 * 
 * @since 1.0.0
 */
export async function setupNuvexSchema(
  db: PoolType, 
  options: SchemaSetupOptions = {}
): Promise<void> {
  try {
    // Enable pg_trgm extension if requested (for pattern matching)
    if (options.enableTrigram) {
      await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    }
    
    // Execute main schema
    await db.query(NUVEX_SCHEMA_SQL);
    
    // Setup periodic cleanup job if requested
    if (options.enableCleanupJob) {
      await setupCleanupJob(db);
    }
    
    console.log('Nuvex database schema setup completed successfully');
  } catch (error) {
    console.error('Failed to setup Nuvex database schema:', error);
    throw error;
  }
}

/**
 * Setup periodic cleanup job (requires pg_cron extension)
 * 
 * Creates a scheduled job using PostgreSQL's pg_cron extension to automatically
 * clean up expired entries from the nuvex_storage table. The job runs daily at 2 AM.
 * 
 * @param db - PostgreSQL connection pool
 * @param tenantId - Optional tenant identifier for multi-tenant setups
 * @returns Promise that resolves when the cleanup job is scheduled
 * 
 * @example
 * ```typescript
 * // Setup cleanup job for main application
 * await setupCleanupJob(db);
 * 
 * // Setup cleanup job for specific tenant
 * await setupCleanupJob(db, 'tenant-123');
 * ```
 * 
 * @throws {Error} If pg_cron extension is not available or insufficient privileges
 * 
 * @requires pg_cron extension and superuser privileges
 * @since 1.0.0
 */
async function setupCleanupJob(db: PoolType, tenantId?: string): Promise<void> {
  try {
    // Generate a unique job name per tenant/context
    const jobName = tenantId ? `nuvex-cleanup-${tenantId}` : `nuvex-cleanup-${Date.now()}`;
    // This requires pg_cron extension and superuser privileges
    await db.query(`
      SELECT cron.schedule(
        $1,
        '0 2 * * *', -- Daily at 2 AM
        'SELECT cleanup_expired_nuvex_storage();'
      );
    `, [jobName]);
    console.log(`Nuvex cleanup cron job scheduled as '${jobName}'`);
  } catch (error) {
    console.error('Failed to schedule Nuvex cleanup cron job:', error);
    throw error;
  }
}

/**
 * Manually clean up expired entries
 * 
 * Executes the cleanup function to remove all expired entries from the
 * nuvex_storage table. This can be called manually or as part of a maintenance routine.
 * 
 * @param db - PostgreSQL connection pool
 * @returns Promise that resolves to the number of deleted entries
 * 
 * @example
 * ```typescript
 * const deletedCount = await cleanupExpiredEntries(db);
 * console.log(`Cleaned up ${deletedCount} expired entries`);
 * ```
 * 
 * @throws {Error} If the cleanup operation fails
 * 
 * @since 1.0.0
 */
export async function cleanupExpiredEntries(db: PoolType): Promise<number> {
  try {
    const result = await db.query('SELECT cleanup_expired_nuvex_storage() as deleted_count;');
    return result.rows[0]?.deleted_count || 0;
  } catch (error) {
    console.error('Failed to cleanup expired entries:', error);
    throw error;
  }
}

/**
 * Drop Nuvex schema (for cleanup/testing)
 * 
 * Completely removes all Nuvex-related database objects including tables,
 * functions, triggers, and indexes. This operation is irreversible and will
 * result in permanent data loss.
 * 
 * @param db - PostgreSQL connection pool
 * @returns Promise that resolves when schema is dropped
 * 
 * @example
 * ```typescript
 * // Use with extreme caution - this will delete all data!
 * await dropNuvexSchema(testDb); // Only use in tests
 * ```
 * 
 * @throws {Error} If the drop operation fails
 * 
 * @warning This operation is irreversible and will cause permanent data loss
 * @since 1.0.0
 */
export async function dropNuvexSchema(db: PoolType): Promise<void> {
  try {
    await db.query(`
      DROP TRIGGER IF EXISTS trigger_update_nuvex_storage_updated_at ON nuvex_storage;
      DROP FUNCTION IF EXISTS update_nuvex_storage_updated_at();
      DROP FUNCTION IF EXISTS cleanup_expired_nuvex_storage();
      DROP TABLE IF EXISTS nuvex_storage CASCADE;
    `);
    console.log('Nuvex database schema dropped successfully');
  } catch (error) {
    console.error('Failed to drop Nuvex database schema:', error);
    throw error;
  }
}
