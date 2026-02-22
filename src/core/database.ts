/**
 * Nuvex - Database Utilities
 * Next-gen Unified Vault Experience
 * 
 * Database schema setup and migration utilities for PostgreSQL storage layer.
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @since 2025
 */

import type { Pool as PoolType } from 'pg';
import type { PostgresSchemaConfig } from '../types/index.js';
import type { Logger } from '../interfaces/index.js';

/** Create a default console-based logger */
function createDefaultLogger(): Logger {
  return {
    debug: () => {},
    info: (message: string, meta?: unknown) => console.log(message, ...(meta !== undefined ? [meta] : [])),
    warn: (message: string, meta?: unknown) => console.warn(message, ...(meta !== undefined ? [meta] : [])),
    error: (message: string, meta?: unknown) => console.error(message, ...(meta !== undefined ? [meta] : [])),
  };
}

/**
 * Validate SQL identifier to prevent SQL injection
 * Ensures the identifier contains only alphanumeric characters and underscores
 * 
 * @param identifier - SQL identifier to validate
 * @param name - Name of the identifier for error messages
 * @throws {Error} If identifier contains invalid characters
 * 
 * @example
 * ```typescript
 * validateSQLIdentifier('my_table_123', 'table name'); // OK
 * validateSQLIdentifier('users; DROP TABLE', 'table name'); // throws Error
 * ```
 * 
 * @since 1.0.0
 */
export function validateSQLIdentifier(identifier: string, name: string): void {
  if (!identifier || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(
      `Invalid ${name}: "${identifier}". SQL identifiers must start with a letter or underscore and contain only alphanumeric characters and underscores.`
    );
  }
}

/**
 * Generate SQL schema for Nuvex storage with configurable table and column names
 * 
 * @param schema - Optional schema configuration for custom table/column names
 * @returns SQL string for creating the schema
 * @throws {Error} If table or column names contain invalid characters
 */
export function generateNuvexSchemaSQL(schema?: PostgresSchemaConfig): string {
  const tableName = schema?.tableName ?? 'nuvex_storage';
  const keyColumn = schema?.columns?.key ?? 'nuvex_key';
  const valueColumn = schema?.columns?.value ?? 'nuvex_data';
  
  // Validate all identifiers to prevent SQL injection
  validateSQLIdentifier(tableName, 'table name');
  validateSQLIdentifier(keyColumn, 'key column name');
  validateSQLIdentifier(valueColumn, 'value column name');
  
  return `
-- Nuvex storage table for PostgreSQL layer
CREATE TABLE IF NOT EXISTS ${tableName} (
  id SERIAL PRIMARY KEY,
  ${keyColumn} VARCHAR(512) NOT NULL UNIQUE,
  ${valueColumn} JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_${tableName}_expires_at 
ON ${tableName}(expires_at) 
WHERE expires_at IS NOT NULL;

-- Ensure pg_trgm extension is available for GIN index
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index for key pattern searches
CREATE INDEX IF NOT EXISTS idx_${tableName}_key_pattern 
ON ${tableName} USING gin(${keyColumn} gin_trgm_ops);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_${tableName}_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_${tableName}_updated_at ON ${tableName};
CREATE TRIGGER trigger_update_${tableName}_updated_at
  BEFORE UPDATE ON ${tableName}
  FOR EACH ROW
  EXECUTE FUNCTION update_${tableName}_updated_at();

-- Function to clean up expired entries
CREATE OR REPLACE FUNCTION cleanup_expired_${tableName}()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM ${tableName} 
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
`;
}

export const NUVEX_SCHEMA_SQL = generateNuvexSchemaSQL();

export interface SchemaSetupOptions {
  /** Enable trigram extension for advanced pattern matching (requires pg_trgm) */
  enableTrigram?: boolean; 
  /** Set up periodic cleanup job using pg_cron extension */
  enableCleanupJob?: boolean;
  /** Schema configuration for custom table/column names */
  schema?: PostgresSchemaConfig;
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
  options: SchemaSetupOptions = {},
  logger?: Logger
): Promise<void> {
  const log = logger ?? createDefaultLogger();
  try {
    // Enable pg_trgm extension if requested (for pattern matching)
    if (options.enableTrigram) {
      await db.query('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    }
    
    // Generate schema SQL with custom table/column names if provided
    const schemaSQL = options.schema ? generateNuvexSchemaSQL(options.schema) : NUVEX_SCHEMA_SQL;
    
    // Execute main schema
    await db.query(schemaSQL);
    
    // Setup periodic cleanup job if requested
    if (options.enableCleanupJob) {
      await setupCleanupJob(db, undefined, options.schema, logger);
    }
    
    log.info('Nuvex database schema setup completed successfully');
  } catch (error) {
    log.error('Failed to setup Nuvex database schema:', error);
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
async function setupCleanupJob(db: PoolType, tenantId?: string, schema?: PostgresSchemaConfig, logger?: Logger): Promise<void> {
  const log = logger ?? createDefaultLogger();
  try {
    const tableName = schema?.tableName || 'nuvex_storage';
    validateSQLIdentifier(tableName, 'table name');
    
    // Generate a unique job name per tenant/context
    const jobName = tenantId ? `nuvex-cleanup-${tenantId}` : `nuvex-cleanup-${Date.now()}`;
    // This requires pg_cron extension and superuser privileges
    await db.query(`
      SELECT cron.schedule(
        $1,
        '0 2 * * *', -- Daily at 2 AM
        'SELECT cleanup_expired_${tableName}();'
      );
    `, [jobName]);
    log.info(`Nuvex cleanup cron job scheduled as '${jobName}'`);
  } catch (error) {
    log.error('Failed to schedule Nuvex cleanup cron job:', error);
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
export async function cleanupExpiredEntries(db: PoolType, schema?: PostgresSchemaConfig, logger?: Logger): Promise<number> {
  const log = logger ?? createDefaultLogger();
  try {
    const tableName = schema?.tableName || 'nuvex_storage';
    validateSQLIdentifier(tableName, 'table name');
    
    const result = await db.query(`SELECT cleanup_expired_${tableName}() as deleted_count;`);
    return result.rows[0]?.deleted_count || 0;
  } catch (error) {
    log.error('Failed to cleanup expired entries:', error);
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
export async function dropNuvexSchema(db: PoolType, schema?: PostgresSchemaConfig, logger?: Logger): Promise<void> {
  const log = logger ?? createDefaultLogger();
  try {
    const tableName = schema?.tableName || 'nuvex_storage';
    validateSQLIdentifier(tableName, 'table name');
    
    await db.query(`
      DROP TRIGGER IF EXISTS trigger_update_${tableName}_updated_at ON ${tableName};
      DROP FUNCTION IF EXISTS update_${tableName}_updated_at();
      DROP FUNCTION IF EXISTS cleanup_expired_${tableName}();
      DROP TABLE IF EXISTS ${tableName} CASCADE;
    `);
    log.info('Nuvex database schema dropped successfully');
  } catch (error) {
    log.error('Failed to drop Nuvex database schema:', error);
    throw error;
  }
}
