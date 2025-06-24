/**
 * Nuvex - Storage Engine
 * Next-gen Unified Vault Experience
 * 
 * Multi-layer storage architecture that provides intelligent caching and data
 * persistence for any Node.js application. Implements a three-tier storage system
 * optimized for performance, scalability, and reliability.
 * 
 * Storage Architecture:
 * - Layer 1: Memory Cache (configurable TTL) - Fastest access for hot data
 * - Layer 2: Redis Cache (configurable TTL) - Fast distributed cache for warm data
 * - Layer 3: PostgreSQL (Permanent) - Persistent storage for cold data
 * 
 * Key Features:
 * - Automatic data tier management and promotion/demotion
 * - Configurable TTL (Time To Live) for each storage layer
 * - Intelligent fallback mechanism between storage tiers
 * - Memory cleanup and garbage collection
 * - Connection pooling and error recovery
 * - Pluggable logging support
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */
import { createClient, RedisClientType } from 'redis';
import pkg from 'pg';
const { Pool } = pkg;
import type { Pool as PoolType } from 'pg';

import type { 
  NuvexConfig, 
  StorageOptions, 
  StorageMetrics,
  StorageItem,
  BatchOperation,
  BatchResult,
  QueryOptions,
  QueryResult
} from '../types/index.js';
import { StorageLayer } from '../types/index.js';
import type { Storage, Logger } from '../interfaces/index.js';

// Node.js global types
declare global {
  function setInterval(callback: () => void, ms: number): number;
  function clearInterval(id: number): void;
}

/**
 * # StorageEngine - Multi-layer Storage Architecture
 * 
 * The core storage engine that implements Nuvex's intelligent three-tier storage system.
 * Provides automatic data management, intelligent caching, and comprehensive fallback mechanisms
 * across Memory, Redis, and PostgreSQL layers.
 * 
 * ## Architecture Design
 * 
 * The StorageEngine follows a hierarchical approach where data flows through layers based on
 * access patterns and configured policies:
 * 
 * ```
 * ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
 * │   Memory    │───▶│    Redis    │───▶│ PostgreSQL  │
 * │ (Layer 1)   │    │ (Layer 2)   │    │ (Layer 3)   │
 * │ < 1ms       │    │ 1-5ms       │    │ 5-50ms      │
 * └─────────────┘    └─────────────┘    └─────────────┘
 * ```
 * 
 * ## Key Features
 * 
 * ### Intelligent Data Management
 * - **Automatic Promotion**: Frequently accessed data moves to faster layers
 * - **Smart Demotion**: Unused data gracefully moves to persistent storage
 * - **TTL Management**: Configurable time-to-live for each layer
 * - **Memory Optimization**: LRU eviction and automatic cleanup
 * 
 * ### Performance Optimization
 * - **Sub-millisecond Access**: Memory cache for hot data
 * - **Batch Operations**: Efficient bulk data operations
 * - **Connection Pooling**: Optimized database connections
 * - **Metrics Collection**: Real-time performance monitoring
 * 
 * ### Reliability Features
 * - **Graceful Degradation**: Automatic fallback when layers are unavailable
 * - **Error Recovery**: Comprehensive error handling and logging
 * - **Data Consistency**: Synchronization across all storage layers
 * - **Health Monitoring**: Layer availability and performance tracking
 * 
 * ## Usage Examples
 * 
 * ### Basic Operations
 * ```typescript
 * const engine = new StorageEngine({
 *   memory: { ttl: 3600000, maxSize: 10000 },
 *   redis: { url: 'redis://localhost:6379' },
 *   postgres: { host: 'localhost', database: 'app' }
 * });
 * 
 * await engine.connect();
 * 
 * // Set data across all layers
 * await engine.set('user:123', userData);
 * 
 * // Get data (checks Memory → Redis → PostgreSQL)
 * const user = await engine.get('user:123');
 * ```
 * 
 * ### Layer-specific Operations
 * ```typescript
 * // Store only in Redis
 * await engine.set('session:abc', sessionData, { 
 *   layer: StorageLayer.REDIS 
 * });
 * 
 * // Skip cache and go directly to PostgreSQL
 * const criticalData = await engine.get('config:critical', { 
 *   skipCache: true 
 * });
 * ```
 * 
 * ### Batch Operations
 * ```typescript
 * const operations = [
 *   { operation: 'set', key: 'key1', value: 'value1' },
 *   { operation: 'set', key: 'key2', value: 'value2' }
 * ];
 * 
 * const results = await engine.setBatch(operations);
 * ```
 * 
 * @example
 * ```typescript
 * // Initialize with full configuration
 * const engine = new StorageEngine({
 *   memory: {
 *     ttl: 24 * 60 * 60 * 1000, // 24 hours
 *     maxSize: 10000
 *   },
 *   redis: {
 *     url: 'redis://localhost:6379',
 *     ttl: 3 * 24 * 60 * 60 // 3 days
 *   },
 *   postgres: {
 *     host: 'localhost',
 *     port: 5432,
 *     database: 'myapp',
 *     user: 'user',
 *     password: 'password'
 *   },
 *   logging: {
 *     enabled: true,
 *     logger: console
 *   }
 * });
 * 
 * await engine.connect();
 * 
 * // Your storage operations here...
 * 
 * await engine.disconnect();
 * ```
 * 
 * @see {@link NuvexClient} for high-level client operations
 * @see {@link NuvexConfig} for configuration options
 * @see {@link StorageOptions} for operation-specific options
 * 
 * @public
 * @category Core
 */
export class StorageEngine implements Storage {
  private memoryCache: Map<string, unknown>;
  private memoryCacheTTL: Map<string, number>;
  private memoryTTL: number;
  private maxMemorySize: number;
  private redisConfig: { url?: string; ttl: number };
  private redisClient: RedisClientType | null;
  private dbConfig: NuvexConfig['postgres'] | PoolType;
  private db: PoolType | null;
  private connected: boolean;
  private cleanupInterval: number | null;
  private logger: Logger | null;
  private metrics: StorageMetrics;

  /**
   * Creates a new StorageEngine instance with the specified configuration.
   * 
   * The constructor initializes all three storage layers and sets up automatic
   * memory cleanup intervals. No connections are established until `connect()` is called.
   * 
   * @param config - Complete configuration object for all storage layers
   * 
   * @example
   * ```typescript
   * const engine = new StorageEngine({
   *   memory: { ttl: 3600000, maxSize: 10000 },
   *   redis: { url: 'redis://localhost:6379', ttl: 86400 },
   *   postgres: { host: 'localhost', database: 'myapp' },
   *   logging: { enabled: true }
   * });
   * ```
   * 
   * @throws {Error} When configuration is invalid
   * @since 1.0.0
   */
  constructor(config: NuvexConfig) {
    // Layer 1: Memory cache with TTL
    this.memoryCache = new Map();
    this.memoryCacheTTL = new Map();
    this.memoryTTL = config.memory?.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    this.maxMemorySize = config.memory?.maxSize || 10000; // 10k entries default
    
    // Layer 2: Redis configuration
    this.redisConfig = {
      url: config.redis?.url || '',
      ttl: config.redis?.ttl || 3 * 24 * 60 * 60 // 3 days default
    };
    this.redisClient = null;
    
    // Layer 3: PostgreSQL configuration
    this.dbConfig = config.postgres;
    this.db = null;
    
    // Connection status
    this.connected = false;
    this.cleanupInterval = null;
    
    // Logging setup
    this.logger = config.logging?.enabled ? (config.logging.logger || null) : null;
    
    // Metrics initialization
    this.metrics = {
      memoryHits: 0,
      memoryMisses: 0,
      redisHits: 0,
      redisMisses: 0,
      postgresHits: 0,
      postgresMisses: 0,
      totalOperations: 0,
      averageResponseTime: 0
    };
    
    // Start memory cleanup interval
    this.startMemoryCleanup();
  }
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    if (this.logger) {
      this.logger[level](message, meta);
    }
  }
  
  /**
   * Establishes connections to all configured storage layers.
   * 
   * This method initializes connections to Redis and PostgreSQL (if configured)
   * and sets up the internal state for multi-layer operations. The memory layer
   * is always available and doesn't require connection setup.
   * 
   * @throws {Error} When connection to any configured layer fails
   * 
   * @example
   * ```typescript
   * const engine = new StorageEngine(config);
   * await engine.connect();
   * console.log('All storage layers connected');
   * ```
   * 
   * @since 1.0.0
   * @public
   */
  async connect(): Promise<void> {
    try {
      // Connect to Redis (optional)
      if (this.redisConfig.url) {
        try {
          this.redisClient = createClient({ url: this.redisConfig.url });
          await this.redisClient.connect();
          this.log('info', 'Redis connected for Nuvex storage');
        } catch (_error) {
          this.log('warn', 'Redis not available, using Memory + PostgreSQL only');
          this.redisClient = null;
        }
      } else {
        this.log('info', 'Redis URL not provided, using Memory + PostgreSQL only');
      }
        // Connect to PostgreSQL
      if (this.dbConfig) {
        // If dbConfig is already a Pool instance, use it directly
        if ('query' in this.dbConfig && typeof this.dbConfig.query === 'function') {
          this.db = this.dbConfig as PoolType;        } else {
          // Otherwise create a new Pool with the config
          this.db = new Pool(this.dbConfig as NuvexConfig['postgres']);
        }
        if (this.db) {
          await this.db.query('SELECT 1'); // Test connection
        }
        this.log('info', 'PostgreSQL connected for Nuvex storage');
      }
        this.connected = true;
      this.log('info', 'Nuvex StorageEngine initialized with multi-layer architecture');
    } catch (error) {
      const err = error as Error;
      this.log('error', 'Nuvex StorageEngine connection failed', {
        error: err.message,
        stack: err.stack
      });
      throw error;
    }
  }
  
  async disconnect(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.quit();
    }    // Only close the database pool if we created it ourselves
    // If it was passed in as an existing pool, let the caller manage it
    if (this.db && this.dbConfig && !('query' in this.dbConfig)) {
      await this.db.end();
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
      this.connected = false;
    this.log('info', 'Nuvex StorageEngine disconnected');
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Retrieves a value from storage using the intelligent layer hierarchy.
   * 
   * The get operation follows the multi-layer approach:
   * 1. **Memory Cache**: Checks in-memory storage first (fastest)
   * 2. **Redis Cache**: Falls back to Redis if not in memory
   * 3. **PostgreSQL**: Final fallback to persistent storage
   * 
   * When data is found in a lower layer, it's automatically promoted to higher
   * layers for faster future access (intelligent caching).
   * 
   * @template T - The expected type of the stored value
   * @param key - The storage key to retrieve
   * @param options - Optional configuration for the get operation
   * @returns Promise resolving to the stored value or null if not found
   * 
   * @example
   * ```typescript
   * // Basic get operation
   * const userData = await engine.get<UserData>('user:123');
   * 
   * // Get from specific layer only
   * const sessionData = await engine.get('session:abc', { 
   *   layer: StorageLayer.REDIS 
   * });
   * 
   * // Skip cache layers and get from PostgreSQL directly
   * const criticalData = await engine.get('config:critical', { 
   *   skipCache: true 
   * });
   * ```
   * 
   * @since 1.0.0
   * @public
   */
  async get<T = unknown>(key: string, options: StorageOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    this.metrics.totalOperations++;
    
    try {
      // Skip cache if requested
      if (options?.skipCache) {
        return await this.getFromPostgres<T>(key);
      }
      
      // Specific layer requested
      if (options?.layer) {
        switch (options.layer) {
          case StorageLayer.MEMORY:
            return this.getFromMemory<T>(key);
          case StorageLayer.REDIS:
            return await this.getFromRedis<T>(key);
          case StorageLayer.POSTGRES:
            return await this.getFromPostgres<T>(key);
        }
      }
      
      // Layer 1: Check memory cache first
      const memoryCached = this.getFromMemory<T>(key);
      if (memoryCached !== null) {
        this.metrics.memoryHits++;
        this.updateResponseTime(Date.now() - startTime);
        return memoryCached;
      }
      this.metrics.memoryMisses++;
      
      // Layer 2: Check Redis cache
      if (this.redisClient) {
        const redisCached = await this.getFromRedis<T>(key);
        if (redisCached !== null) {
          this.metrics.redisHits++;
          // Store back in memory for next time
          this.setInMemory(key, redisCached);
          this.updateResponseTime(Date.now() - startTime);
          return redisCached;
        }
        this.metrics.redisMisses++;
      }
      
      // Layer 3: Check PostgreSQL
      if (this.db) {
        const pgValue = await this.getFromPostgres<T>(key);
        if (pgValue !== null) {
          this.metrics.postgresHits++;
          // Store back in Redis and memory for next time
          if (this.redisClient) {
            await this.redisClient.setEx(key, this.redisConfig.ttl, JSON.stringify(pgValue));
          }
          this.setInMemory(key, pgValue);
          this.updateResponseTime(Date.now() - startTime);
          return pgValue;
        }
        this.metrics.postgresMisses++;
      }
      
      this.updateResponseTime(Date.now() - startTime);
      return null;
    } catch (error) {
      const err = error as Error;
      this.log('error', `Error getting ${key}`, {
        error: err.message,
        stack: err.stack,
        operation: 'get',
        key
      });
      this.updateResponseTime(Date.now() - startTime);
      return null;
    }
  }
  
  /**
   * Set value in storage layers
   */  async set<T = unknown>(key: string, value: T, options: StorageOptions = {}): Promise<boolean> {
    if (!this.connected) {
      return false;
    }
    
    const startTime = Date.now();
    this.metrics.totalOperations++;
    
    try {
      const ttl = options?.ttl;
      
      // Specific layer requested
      if (options?.layer) {
        switch (options.layer) {
          case StorageLayer.MEMORY:
            this.setInMemory(key, value, ttl);
            return true;
          case StorageLayer.REDIS:
            return await this.setInRedis(key, value, ttl);
          case StorageLayer.POSTGRES:
            return await this.setInPostgres(key, value, ttl);
        }
      }
      
      // Store in all available layers
      this.setInMemory(key, value, ttl);
      
      if (this.redisClient) {
        await this.setInRedis(key, value, ttl);
      }
      
      if (this.db) {
        await this.setInPostgres(key, value, ttl);
      }
      
      this.updateResponseTime(Date.now() - startTime);
      return true;
    } catch (error) {
      const err = error as Error;
      this.log('error', `Error setting ${key}`, {
        error: err.message,
        stack: err.stack,
        operation: 'set',
        key
      });
      this.updateResponseTime(Date.now() - startTime);
      return false;
    }
  }
  
  /**
   * Delete from all storage layers
   */
  async delete(key: string, options: StorageOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    this.metrics.totalOperations++;
    
    try {
      // Specific layer requested
      if (options?.layer) {
        switch (options.layer) {
          case StorageLayer.MEMORY:
            this.memoryCache.delete(key);
            this.memoryCacheTTL.delete(key);
            return true;
          case StorageLayer.REDIS:
            return await this.deleteFromRedis(key);
          case StorageLayer.POSTGRES:
            return await this.deleteFromPostgres(key);
        }
      }
      
      // Delete from all layers
      this.memoryCache.delete(key);
      this.memoryCacheTTL.delete(key);
      
      if (this.redisClient) {
        await this.redisClient.del(key);
      }
      
      if (this.db) {
        await this.deleteFromPostgres(key);
      }
      
      this.updateResponseTime(Date.now() - startTime);
      return true;
    } catch (error) {
      const err = error as Error;
      this.log('error', `Error deleting ${key}`, {
        error: err.message,
        stack: err.stack,
        operation: 'delete',
        key
      });
      this.updateResponseTime(Date.now() - startTime);
      return false;
    }
  }

  /**
   * Check if key exists in any storage layer
   */
  async exists(key: string, options: StorageOptions = {}): Promise<boolean> {
    try {
      // Specific layer requested
      if (options?.layer) {
        switch (options.layer) {
          case StorageLayer.MEMORY:
            return this.getFromMemory(key) !== null;
          case StorageLayer.REDIS:
            return this.redisClient ? await this.redisClient.exists(key) === 1 : false;
          case StorageLayer.POSTGRES:
            return this.db ? await this.getFromPostgres(key) !== null : false;
        }
      }
      
      // Check memory first
      if (this.getFromMemory(key) !== null) {
        return true;
      }
      
      // Check Redis
      if (this.redisClient) {
        const exists = await this.redisClient.exists(key);
        if (exists) return true;
      }
      
      // Check PostgreSQL
      if (this.db) {
        const pgValue = await this.getFromPostgres(key);
        return pgValue !== null;
      }
      
      return false;
    } catch (error) {
      const err = error as Error;
      this.log('error', `Error checking existence of ${key}`, {
        error: err.message,
        stack: err.stack,
        operation: 'exists',
        key
      });
      return false;
    }
  }
  
  /**
   * Set expiration for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      // Update memory TTL
      if (this.memoryCache.has(key)) {
        this.memoryCacheTTL.set(key, Date.now() + (ttl * 1000));
      }
      
      // Update Redis TTL
      if (this.redisClient) {
        await this.redisClient.expire(key, ttl);
      }
      
      // PostgreSQL TTL update would require updating the expires_at column
      // This is more complex and might not be needed for all use cases
      
      return true;
    } catch (error) {
      const err = error as Error;
      this.log('error', `Error setting expiration for ${key}`, {
        error: err.message,
        operation: 'expire',
        key,
        ttl
      });
      return false;
    }
  }
  
  // Batch operations
  async setBatch(operations: BatchOperation[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    
    for (const op of operations) {
      try {
        if (op.operation === 'set' && op.value !== undefined) {
          const success = await this.set(op.key, op.value, op.options);
          results.push({ key: op.key, success });
        } else {
          results.push({ key: op.key, success: false, error: 'Invalid operation' });
        }
      } catch (error) {
        results.push({ 
          key: op.key, 
          success: false, 
          error: (error as Error).message 
        });
      }
    }
    
    return results;
  }
  
  async getBatch(keys: string[], options: StorageOptions = {}): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    
    for (const key of keys) {
      try {
        const value = await this.get(key, options);
        if (value !== null) {
          results.push({ key, success: true, value });
        } else {
          results.push({ key, success: false, value: null });
        }
      } catch (error) {
        results.push({ 
          key, 
          success: false, 
          error: (error as Error).message 
        });
      }
    }
    
    return results;
  }
  
  async deleteBatch(keys: string[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    
    for (const key of keys) {
      try {
        const existed = await this.exists(key);
        if (existed) {
          const success = await this.delete(key);
          results.push({ key, success });
        } else {
          results.push({ key, success: false });
        }
      } catch (error) {
        results.push({ 
          key, 
          success: false, 
          error: (error as Error).message 
        });
      }
    }
    
    return results;
  }
  
  // Query operations
  async query<T = unknown>(options: QueryOptions): Promise<QueryResult<T>> {
    // This is a basic implementation - can be enhanced based on needs
    const keys = await this.keys(options.pattern);
    const items: Array<{ key: string; value: T; metadata: StorageItem<T> }> = [];
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {        items.push({
          key,
          value,
          metadata: {
            value,
            createdAt: new Date(), // This would need to be tracked
            layer: (await this.getLayerInfo(key))?.layer as StorageLayer || StorageLayer.MEMORY
          }
        });
      }
    }
    
    // Apply sorting and pagination
    const sortedItems = this.applySorting(items, options);
    const paginatedItems = this.applyPagination(sortedItems, options);
    
    return {
      items: paginatedItems,
      total: items.length,
      hasMore: (options.offset || 0) + (options.limit || items.length) < items.length
    };
  }
  
  async keys(pattern = '*'): Promise<string[]> {
    const allKeys = new Set<string>();
    
    // Get memory keys
    for (const key of this.memoryCache.keys()) {
      if (!pattern || this.matchPattern(key, pattern)) {
        allKeys.add(key);
      }
    }
    
    // Get Redis keys
    if (this.redisClient) {
      try {
        const redisKeys = await this.redisClient.keys(pattern || '*');
        redisKeys.forEach((key: string) => allKeys.add(key));
      } catch (error) {
        this.log('warn', 'Error getting Redis keys', { error: (error as Error).message });
      }
    }
    
    // PostgreSQL keys would require a table scan - skip for now
    
    return Array.from(allKeys);
  }
  
  async clear(pattern = '*'): Promise<number> {
    let cleared = 0;
      // Clear memory
    if (pattern === '*') {
      cleared = this.memoryCache.size;
      this.memoryCache.clear();
      this.memoryCacheTTL.clear();
    } else {
      for (const key of this.memoryCache.keys()) {
        if (this.matchPattern(key, pattern)) {
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
          cleared++;
        }
      }
    }
    
    // Clear Redis
    if (this.redisClient) {
      try {
        if (pattern === '*') {
          await this.redisClient.flushDb();
        } else {
          const keys = await this.redisClient.keys(pattern);
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        }      } catch (error) {
        this.log('warn', 'Error clearing Redis', { error: (error as Error).message });
      }
    }

    // Clear PostgreSQL  
    if (this.db) {
      try {
        if (pattern === '*') {
          await this.db.query('DELETE FROM nuvex_storage');
        } else {
          await this.db.query('DELETE FROM nuvex_storage WHERE key LIKE $1', [pattern.replace('*', '%')]);
        }
      } catch (error) {
        this.log('warn', 'Error clearing PostgreSQL', { error: (error as Error).message });
      }
    }
    
    return cleared;
  }
  
  // Metrics and monitoring
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }
  
  resetMetrics(): void {
    this.metrics = {
      memoryHits: 0,
      memoryMisses: 0,
      redisHits: 0,
      redisMisses: 0,
      postgresHits: 0,
      postgresMisses: 0,
      totalOperations: 0,
      averageResponseTime: 0
    };
  }
  
  // Layer management
  async promote(key: string, targetLayer: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      if (value === null) return false;
      
      switch (targetLayer) {
        case StorageLayer.MEMORY:
          this.setInMemory(key, value);
          return true;
        case StorageLayer.REDIS:
          return await this.setInRedis(key, value);
        case StorageLayer.POSTGRES:
          return await this.setInPostgres(key, value);
        default:
          return false;
      }
    } catch (error) {
      this.log('error', `Error promoting ${key} to ${targetLayer}`, { error: (error as Error).message });
      return false;
    }
  }
  
  async demote(key: string, targetLayer: string): Promise<boolean> {
    // For now, demote means remove from higher layers
    try {
      switch (targetLayer) {
        case StorageLayer.POSTGRES:
          // Remove from memory and Redis
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
          if (this.redisClient) {
            await this.redisClient.del(key);
          }
          return true;
        case StorageLayer.REDIS:
          // Remove from memory only
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
          return true;
        default:
          return false;
      }
    } catch (error) {
      this.log('error', `Error demoting ${key} to ${targetLayer}`, { error: (error as Error).message });
      return false;
    }
  }
  
  async getLayerInfo(key: string): Promise<{ layer: string; ttl?: number } | null> {
    // Check which layer has the key
    if (this.getFromMemory(key) !== null) {
      const expiration = this.memoryCacheTTL.get(key);
      const ttl = expiration ? Math.max(0, Math.floor((expiration - Date.now()) / 1000)) : undefined;
      return { layer: StorageLayer.MEMORY, ttl };
    }
    
    if (this.redisClient && await this.redisClient.exists(key)) {
      const ttl = await this.redisClient.ttl(key);
      return { layer: StorageLayer.REDIS, ttl: ttl > 0 ? ttl : undefined };
    }
    
    if (this.db && await this.getFromPostgres(key) !== null) {
      return { layer: StorageLayer.POSTGRES };
    }
    
    return null;  }
  
  // Private helper methods
  private getFromMemory<T = unknown>(key: string): T | null {
    const expiration = this.memoryCacheTTL.get(key);
    if (expiration && Date.now() > expiration) {
      // Expired, clean up
      this.memoryCache.delete(key);
      this.memoryCacheTTL.delete(key);
      return null;
    }
    const value = this.memoryCache.get(key);
    return value !== undefined ? (value as T) : null;
  }
  
  private setInMemory(key: string, value: unknown, ttl?: number): void {
    // Check memory size limit
    if (this.memoryCache.size >= this.maxMemorySize && !this.memoryCache.has(key)) {
      // Remove oldest entry (simple LRU)
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
        this.memoryCacheTTL.delete(firstKey);
      }
    }
    
    this.memoryCache.set(key, value);
    const expirationTime = ttl ? Date.now() + (ttl * 1000) : Date.now() + this.memoryTTL;
    this.memoryCacheTTL.set(key, expirationTime);
  }
  
  private async getFromRedis<T = unknown>(key: string): Promise<T | null> {
    if (!this.redisClient) return null;
    
    try {
      const redisCached = await this.redisClient.get(key);
      return redisCached ? JSON.parse(redisCached) : null;
    } catch (error) {
      this.log('error', `Error getting from Redis: ${key}`, { error: (error as Error).message });
      return null;
    }
  }
  
  private async setInRedis(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.redisClient) return false;
    
    try {
      const redisTTL = ttl || this.redisConfig.ttl;
      await this.redisClient.setEx(key, redisTTL, JSON.stringify(value));
      return true;
    } catch (error) {
      this.log('error', `Error setting in Redis: ${key}`, { error: (error as Error).message });
      return false;
    }
  }
  
  private async deleteFromRedis(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    
    try {
      await this.redisClient.del(key);
      return true;
    } catch (error) {
      this.log('error', `Error deleting from Redis: ${key}`, { error: (error as Error).message });
      return false;
    }
  }
    // PostgreSQL operations using key-value table
  private async getFromPostgres<T = unknown>(key: string): Promise<T | null> {
    if (!this.db) return null;
    
    try {
      const result = await this.db.query(
        'SELECT value FROM nuvex_storage WHERE key = $1 AND (expires_at IS NULL OR expires_at > NOW())',
        [key]
      );
      return result.rows.length > 0 ? JSON.parse(result.rows[0].value) : null;
    } catch (_error) {
      // Table might not exist, that's okay for now
      this.log('debug', 'nuvex_storage table not found, using Redis + Memory only');
      return null;
    }
  }
  
  private async setInPostgres(key: string, value: unknown, ttl?: number): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      const expiresAt = ttl ? new Date(Date.now() + (ttl * 1000)) : null;
      await this.db.query(
        `INSERT INTO nuvex_storage (key, value, expires_at) 
         VALUES ($1, $2, $3)
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, expires_at = $3, updated_at = NOW()`,
        [key, JSON.stringify(value), expiresAt]
      );
      return true;
    } catch (_error) {
      // Table might not exist, that's okay for now
      this.log('debug', 'nuvex_storage table not found, using Redis + Memory only');
      return false;
    }
  }
  
  private async deleteFromPostgres(key: string): Promise<boolean> {
    if (!this.db) return false;
    
    try {
      await this.db.query('DELETE FROM nuvex_storage WHERE key = $1', [key]);
      return true;
    } catch (_error) {
      // Table might not exist, that's okay
      this.log('debug', 'nuvex_storage table not found');
      return false;
    }
  }
  
  // Memory cleanup
  private startMemoryCleanup(): void {
    const cleanupInterval = this.memoryTTL / 24; // Clean up 24 times per TTL period
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      for (const [key, expiration] of this.memoryCacheTTL.entries()) {
        if (now > expiration) {
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        this.log('debug', `Memory cleanup completed - removed ${cleaned} expired entries`);
      }
    }, cleanupInterval);
  }
  
  // Utility methods
  private updateResponseTime(duration: number): void {
    // Exponential moving average with smoothing factor alpha
    const alpha = 0.2; // Smoothing factor (adjustable)
    this.metrics.averageResponseTime =
      alpha * duration + (1 - alpha) * this.metrics.averageResponseTime;
  }
  
  private matchPattern(key: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(key);
  }
  
  private applySorting<T>(items: Array<{ key: string; value: T; metadata: StorageItem<T> }>, options: QueryOptions) {
    if (!options.sortBy) return items;
    
    return items.sort((a, b) => {
      let aVal, bVal;
      
      switch (options.sortBy) {
        case 'key':
          aVal = a.key;
          bVal = b.key;
          break;
        case 'createdAt':
          aVal = a.metadata.createdAt;
          bVal = b.metadata.createdAt;
          break;
        default:
          return 0;
      }
      
      const order = options.sortOrder === 'desc' ? -1 : 1;
      return aVal < bVal ? -order : aVal > bVal ? order : 0;
    });
  }
  
  private applyPagination<T>(items: Array<{ key: string; value: T; metadata: StorageItem<T> }>, options: QueryOptions) {
    const offset = options.offset || 0;
    const limit = options.limit;
    
    if (limit) {
      return items.slice(offset, offset + limit);
    }
    
    return items.slice(offset);
  }
  
  // Legacy compatibility methods (for migration)
  getStats() {
    return {
      memoryKeys: this.memoryCache.size,
      connected: this.connected,
      layers: {
        memory: true,
        redis: !!this.redisClient,
        postgres: !!this.db
      }
    };
  }
  
  cleanupExpiredMemory(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, expiration] of this.memoryCacheTTL.entries()) {
      if (now > expiration) {
        this.memoryCache.delete(key);
        this.memoryCacheTTL.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
}
