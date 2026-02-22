/**
 * Nuvex - PostgreSQL Storage Layer (L3)
 * Next-gen Unified Vault Experience
 * 
 * PostgreSQL persistent storage layer serving as the source of truth for all data.
 * Provides ACID-compliant, durable storage with full data integrity guarantees.
 * 
 * Features:
 * - ACID-compliant persistent storage
 * - Source of truth for all data
 * - JSON support for flexible data structures
 * - Automatic TTL-based expiration
 * - Connection pooling for optimal performance
 * - Health monitoring with SELECT 1 queries
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @since 2025
 */

import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';
import type { StorageLayerInterface, Logger } from '../interfaces/index.js';
import type { PostgresConfig } from '../types/index.js';
import { validateSQLIdentifier } from '../core/database.js';

/**
 * PostgreSQL Storage Layer - L3 Persistent Storage
 * 
 * Implements persistent storage using PostgreSQL. This is the authoritative
 * source of truth for all data in the system. All writes must succeed here
 * for the operation to be considered successful.
 * 
 * **Key Features:**
 * - ACID compliance for data integrity
 * - Durable storage that survives restarts
 * - JSON/JSONB support for complex objects
 * - TTL-based automatic expiration
 * - Connection pooling for performance
 * - Transaction support for complex operations
 * 
 * **Storage Schema:**
 * - Table: nuvex_storage
 * - Columns: id, key (unique), value (JSONB), expires_at, created_at, updated_at
 * - Indexes: key, expires_at, key pattern (trigram)
 * 
 * **Performance Characteristics:**
 * - Get: O(log n) with index lookup
 * - Set: O(log n) with index update
 * - Latency: 5-50ms typical (storage + network)
 * 
 * **Error Handling:**
 * - Returns null on read errors (graceful degradation)
 * - Logs errors for monitoring
 * - Throws on critical connection failures
 * 
 * @implements {StorageLayerInterface}
 * 
 * @example
 * ```typescript
 * // Create PostgreSQL layer
 * const postgres = new PostgresStorage({
 *   host: 'localhost',
 *   port: 5432,
 *   database: 'myapp',
 *   user: 'postgres',
 *   password: 'password'
 * });
 * 
 * // Connect (creates pool)
 * await postgres.connect();
 * 
 * // Store data (source of truth)
 * await postgres.set('user:123', userData, 86400);
 * 
 * // Retrieve data
 * const data = await postgres.get('user:123');
 * 
 * // Check health
 * const isHealthy = await postgres.ping();
 * ```
 * 
 * @class PostgresStorage
 * @since 1.0.0
 */
export class PostgresStorage implements StorageLayerInterface {
  /** PostgreSQL connection pool */
  private pool: PoolType | null;
  
  /** Database configuration or existing pool */
  private readonly config: PostgresConfig | PoolType;
  
  /** Whether the pool is connected */
  private connected: boolean;
  
  /** Optional logger for debugging and monitoring */
  private logger: Logger | null;
  
  /** Whether we created the pool (vs. received existing one) */
  private readonly ownsPool: boolean;

  /** Table name for storage */
  private readonly tableName: string;
  
  /** Key column name */
  private readonly keyColumn: string;
  
  /** Value/data column name */
  private readonly valueColumn: string;

  /**
   * Creates a new PostgresStorage instance
   * 
   * Accepts either a PostgreSQL configuration object or an existing Pool instance.
   * If a Pool is provided, the caller is responsible for managing its lifecycle.
   * 
   * Schema configuration is extracted from the config object when creating a new pool.
   * When using an existing pool, schema defaults to standard Nuvex naming.
   * 
   * @param config - PostgreSQL configuration or existing Pool instance
   * @param logger - Optional logger for debugging
   * 
   * @example
   * ```typescript
   * // With configuration (supports schema customization)
   * const postgres = new PostgresStorage({
   *   host: 'localhost',
   *   database: 'myapp',
   *   user: 'postgres',
   *   password: 'password',
   *   schema: {
   *     tableName: 'storage_cache',
   *     columns: { key: 'key', value: 'value' }
   *   }
   * });
   * 
   * // With existing pool (uses default schema)
   * const existingPool = new Pool({ ... });
   * const postgres = new PostgresStorage(existingPool);
   * ```
   */
  constructor(config: PostgresConfig | PoolType, logger: Logger | null = null) {
    this.config = config;
    this.pool = null;
    this.connected = false;
    this.logger = logger;
    
    // Check if config is already a Pool instance
    this.ownsPool = !('query' in config && typeof config.query === 'function');
    
    // Extract schema configuration with defaults
    // Note: Schema is only extracted from config objects, not from existing Pool instances
    const schema = this.ownsPool ? (config as PostgresConfig).schema : undefined;
    this.tableName = schema?.tableName ?? 'nuvex_storage';
    this.keyColumn = schema?.columns?.key ?? 'nuvex_key';
    this.valueColumn = schema?.columns?.value ?? 'nuvex_data';
    
    // Validate all identifiers to prevent SQL injection
    validateSQLIdentifier(this.tableName, 'table name');
    validateSQLIdentifier(this.keyColumn, 'key column name');
    validateSQLIdentifier(this.valueColumn, 'value column name');
  }

  /**
   * Establish connection to PostgreSQL
   * 
   * Creates a connection pool (if not already provided) and tests the connection.
   * Should be called before any storage operations.
   * 
   * @throws {Error} If connection test fails
   * 
   * @example
   * ```typescript
   * try {
   *   await postgres.connect();
   *   console.log('PostgreSQL connected');
   * } catch (error) {
   *   console.error('PostgreSQL connection failed:', error);
   * }
   * ```
   */
  async connect(): Promise<void> {
    try {
      if (this.ownsPool) {
        // Create new pool from config
        this.pool = new Pool(this.config as PostgresConfig);
      } else {
        // Use existing pool
        this.pool = this.config as PoolType;
      }

      // Test connection
      if (this.pool) {
        await this.pool.query('SELECT 1');
        this.connected = true;
        this.log('info', 'PostgreSQL L3: Connected successfully');
      }
    } catch (error) {
      this.connected = false;
      this.log('error', 'PostgreSQL L3: Connection failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Close PostgreSQL connection pool
   * 
   * Only closes the pool if we created it. If an existing pool was provided,
   * the caller is responsible for closing it.
   * 
   * @example
   * ```typescript
   * await postgres.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    if (this.pool && this.ownsPool) {
      await this.pool.end();
      this.log('info', 'PostgreSQL L3: Disconnected');
    }
    this.connected = false;
  }

  /**
   * Retrieve a value from PostgreSQL
   * 
   * Queries the nuvex_storage table and automatically filters out expired entries.
   * Deserializes the JSON-stored value.
   * 
   * @param key - The key to retrieve
   * @returns Promise resolving to the value or null if not found/expired
   * 
   * @example
   * ```typescript
   * const userData = await postgres.get('user:123');
   * if (userData !== null) {
   *   console.log('Found in PostgreSQL');
   * }
   * ```
   */
  async get(key: string): Promise<unknown> {
    if (!this.connected || !this.pool) {
      return null;
    }

    try {
      const result = await this.pool.query(
        `SELECT ${this.valueColumn} FROM ${this.tableName} WHERE ${this.keyColumn} = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [key]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Value is already parsed by PostgreSQL JSONB type
      return result.rows[0][this.valueColumn];
    } catch (error) {
      // Table might not exist yet, that's okay
      this.log('debug', `PostgreSQL L3: Error getting key: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Store a value in PostgreSQL
   * 
   * Inserts or updates the value in the nuvex_storage table. Uses UPSERT
   * (INSERT ... ON CONFLICT) to handle existing keys efficiently.
   * 
   * **Note:** This is the authoritative write. If this fails, the entire
   * write operation should be considered failed.
   * 
   * @param key - The key to store
   * @param value - The value to store (will be JSON serialized)
   * @param ttlSeconds - Optional TTL in seconds
   * 
   * @example
   * ```typescript
   * // Store with 24 hour TTL
   * await postgres.set('user:123', userData, 86400);
   * 
   * // Store without TTL (persists until deleted)
   * await postgres.set('config:app', configData);
   * ```
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.connected || !this.pool) {
      this.log('warn', 'PostgreSQL L3: Cannot set - not connected', { key });
      throw new Error('PostgreSQL not connected');
    }

    try {
      const expiresAt = ttlSeconds ? new Date(Date.now() + (ttlSeconds * 1000)) : null;
      
      await this.pool.query(
        `INSERT INTO ${this.tableName} (${this.keyColumn}, ${this.valueColumn}, expires_at) 
         VALUES ($1, $2, $3)
         ON CONFLICT (${this.keyColumn}) 
         DO UPDATE SET ${this.valueColumn} = $2, expires_at = $3, updated_at = NOW()`,
        [key, JSON.stringify(value), expiresAt]
      );
    } catch (error) {
      // If table doesn't exist, this is a critical error for L3
      this.log('error', `PostgreSQL L3: Error setting key: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Delete a value from PostgreSQL
   * 
   * Permanently removes the key from the nuvex_storage table.
   * 
   * @param key - The key to delete
   * 
   * @example
   * ```typescript
   * await postgres.delete('user:123');
   * ```
   */
  async delete(key: string): Promise<void> {
    if (!this.connected || !this.pool) {
      return;
    }

    try {
      await this.pool.query(`DELETE FROM ${this.tableName} WHERE ${this.keyColumn} = $1`, [key]);
    } catch (error) {
      this.log('error', `PostgreSQL L3: Error deleting key: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Check if a key exists in PostgreSQL
   * 
   * Queries for the key and verifies it hasn't expired.
   * 
   * @param key - The key to check
   * @returns Promise resolving to true if the key exists and is not expired
   * 
   * @example
   * ```typescript
   * if (await postgres.exists('user:123')) {
   *   console.log('Key exists in PostgreSQL');
   * }
   * ```
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected || !this.pool) {
      return false;
    }

    try {
      const result = await this.pool.query(
        `SELECT 1 FROM ${this.tableName} WHERE ${this.keyColumn} = $1 AND (expires_at IS NULL OR expires_at > NOW())`,
        [key]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      this.log('error', `PostgreSQL L3: Error checking existence: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Clear all keys from PostgreSQL
   * 
   * **WARNING:** This operation deletes all data from nuvex_storage table.
   * Use with extreme caution in production environments.
   * 
   * @example
   * ```typescript
   * await postgres.clear(); // Deletes all data
   * ```
   */
  async clear(): Promise<void> {
    if (!this.connected || !this.pool) {
      return;
    }

    try {
      await this.pool.query(`DELETE FROM ${this.tableName}`);
      this.log('info', 'PostgreSQL L3: All data cleared');
    } catch (error) {
      this.log('error', 'PostgreSQL L3: Error clearing data', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Health check for PostgreSQL connection
   * 
   * Executes a simple SELECT 1 query to verify connectivity and database
   * responsiveness. This is a lightweight operation that tests the full
   * connection path including pool, connection, and database.
   * 
   * @returns Promise resolving to true if PostgreSQL is healthy and responsive
   * 
   * @example
   * ```typescript
   * const isHealthy = await postgres.ping();
   * if (!isHealthy) {
   *   console.error('PostgreSQL connection is down');
   * }
   * ```
   */
  async ping(): Promise<boolean> {
    if (!this.connected || !this.pool) {
      return false;
    }

    let client;
    try {
      // Get a client from the pool and run a simple query
      client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        return true;
      } finally {
        client.release();
      }
    } catch (error) {
      this.log('error', 'PostgreSQL L3: Ping failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Check if PostgreSQL is connected
   * 
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the PostgreSQL connection pool
   * 
   * Useful for executing custom queries or transactions.
   * 
   * @returns The connection pool or null if not connected
   * 
   * @example
   * ```typescript
   * const pool = postgres.getPool();
   * if (pool) {
   *   const result = await pool.query('SELECT * FROM custom_table');
   * }
   * ```
   */
  getPool(): PoolType | null {
    return this.pool;
  }

  /**
   * Atomically increment a numeric value
   * 
   * Uses PostgreSQL UPDATE with row-level locking for true atomic increments.
   * If the key doesn't exist, it's created with the delta value.
   * 
   * This operation is safe for concurrent access across multiple instances.
   * 
   * @param key - The key to increment
   * @param delta - The amount to increment by
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise resolving to the new value after increment
   * 
   * @example
   * ```typescript
   * // Atomic increment - safe for concurrent access
   * const newValue = await postgres.increment('counter', 1, 86400);
   * ```
   */
  async increment(key: string, delta: number, ttlSeconds?: number): Promise<number> {
    if (!this.connected || !this.pool) {
      this.log('warn', 'PostgreSQL L3: Cannot increment - not connected', { key });
      throw new Error('PostgreSQL not connected');
    }

    try {
      const expiresAt = ttlSeconds ? new Date(Date.now() + (ttlSeconds * 1000)) : null;
      
      // Atomic upsert to handle both insert and update cases
      // This avoids race conditions when multiple concurrent increments happen on non-existent keys
      const result = await this.pool.query(
        `INSERT INTO ${this.tableName} (${this.keyColumn}, ${this.valueColumn}, expires_at)
         VALUES ($1, to_jsonb($2), $3)
         ON CONFLICT (${this.keyColumn}) DO UPDATE
           SET ${this.valueColumn} = to_jsonb(
                 CASE 
                   WHEN ${this.tableName}.expires_at IS NULL OR ${this.tableName}.expires_at > NOW()
                   THEN (${this.tableName}.${this.valueColumn}::text)::numeric + (EXCLUDED.${this.valueColumn}::text)::numeric
                   ELSE (EXCLUDED.${this.valueColumn}::text)::numeric
                 END
               ),
               expires_at = EXCLUDED.expires_at,
               updated_at = NOW()
         RETURNING (${this.valueColumn}::text)::numeric as value`,
        [key, delta, expiresAt]
      );

      if (result.rows.length > 0) {
        return Number(result.rows[0].value);
      }

      // Fallback: should not reach here, but return delta if no rows returned
      return delta;
    } catch (error) {
      this.log('error', `PostgreSQL L3: Error incrementing key: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Log a message if logger is configured
   * 
   * @private
   * @param level - Log level
   * @param message - Log message
   * @param meta - Optional metadata
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    if (this.logger) {
      this.logger[level](message, meta);
    }
  }
}
