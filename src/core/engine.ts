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
import { MemoryStorage, RedisStorage, PostgresStorage } from '../layers/index.js';

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
  // Modular storage layers (new architecture)
  private l1Memory: MemoryStorage;
  private l2Redis: RedisStorage | null;
  private l3Postgres: PostgresStorage | null;
  
  // Configuration and state
  private config: NuvexConfig;
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
    this.config = config;
    this.connected = false;
    this.cleanupInterval = null;
    
    // Logging setup
    this.logger = config.logging?.enabled ? (config.logging.logger || null) : null;
    
    // Layer 1: Memory storage with LRU eviction
    const maxMemorySize = config.memory?.maxSize || 10000; // 10k entries default
    this.l1Memory = new MemoryStorage(maxMemorySize, this.logger);
    
    // Layer 2: Redis storage (optional)
    this.l2Redis = config.redis?.url 
      ? new RedisStorage(config.redis.url, this.logger)
      : null;
    
    // Layer 3: PostgreSQL storage
    this.l3Postgres = config.postgres
      ? new PostgresStorage(config.postgres, this.logger)
      : null;
    
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
      // Connect to Redis (L2) - optional, gracefully degrade if unavailable
      if (this.l2Redis) {
        try {
          await this.l2Redis.connect();
          this.log('info', 'Redis L2 connected for Nuvex storage');
        } catch (error) {
          this.log('warn', 'Redis L2 not available, using Memory + PostgreSQL only', {
            error: error instanceof Error ? error.message : String(error)
          });
          this.l2Redis = null;
        }
      } else {
        this.log('info', 'Redis L2 URL not provided, using Memory + PostgreSQL only');
      }
      
      // Connect to PostgreSQL (L3) - critical for data persistence
      if (this.l3Postgres) {
        await this.l3Postgres.connect();
        this.log('info', 'PostgreSQL L3 connected for Nuvex storage');
      }
      
      this.connected = true;
      this.log('info', 'Nuvex StorageEngine initialized with 3-layer architecture');
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
    // Disconnect from Redis (L2)
    if (this.l2Redis) {
      await this.l2Redis.disconnect();
    }
    
    // Disconnect from PostgreSQL (L3)
    if (this.l3Postgres) {
      await this.l3Postgres.disconnect();
    }
    
    // Stop memory cleanup interval
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
      // Default TTL configuration
      const defaultTTL = this.config.redis?.ttl || 3 * 24 * 60 * 60; // 3 days in seconds
      
      // Skip cache if requested - go directly to L3
      if (options?.skipCache && this.l3Postgres) {
        const value = await this.l3Postgres.get(key);
        this.updateResponseTime(Date.now() - startTime);
        return value as T | null;
      }
      
      // Specific layer requested
      if (options?.layer) {
        let value: unknown = null;
        switch (options.layer) {
          case StorageLayer.MEMORY:
            value = await this.l1Memory.get(key);
            break;
          case StorageLayer.REDIS:
            value = this.l2Redis ? await this.l2Redis.get(key) : null;
            break;
          case StorageLayer.POSTGRES:
            value = this.l3Postgres ? await this.l3Postgres.get(key) : null;
            break;
        }
        this.updateResponseTime(Date.now() - startTime);
        return value as T | null;
      }
      
      // Layer 1: Check memory cache first (fastest)
      let data = await this.l1Memory.get(key);
      if (data !== null) {
        this.metrics.memoryHits++;
        this.updateResponseTime(Date.now() - startTime);
        return data as T;
      }
      this.metrics.memoryMisses++;
      
      // Layer 2: Check Redis cache (fast distributed cache)
      if (this.l2Redis) {
        data = await this.l2Redis.get(key);
        if (data !== null) {
          this.metrics.redisHits++;
          // Warm L1 cache for next access
          await this.l1Memory.set(key, data, defaultTTL);
          this.updateResponseTime(Date.now() - startTime);
          return data as T;
        }
        this.metrics.redisMisses++;
      }
      
      // Layer 3: Check PostgreSQL (persistent storage, source of truth)
      if (this.l3Postgres) {
        data = await this.l3Postgres.get(key);
        if (data !== null) {
          this.metrics.postgresHits++;
          // Warm both L1 and L2 caches for future access
          await Promise.allSettled([
            this.l1Memory.set(key, data, defaultTTL),
            this.l2Redis ? this.l2Redis.set(key, data, defaultTTL) : Promise.resolve()
          ]);
          this.updateResponseTime(Date.now() - startTime);
          return data as T;
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
   * Set value in storage layers using L3-first write strategy
   * 
   * **L3-First Write Strategy:**
   * 1. Write to PostgreSQL (L3) first as source of truth
   * 2. If L3 write succeeds, warm caches (L1, L2) using Promise.allSettled
   * 3. Cache failures don't break the operation (graceful degradation)
   * 
   * This ensures data consistency - if L3 fails, the entire operation fails.
   * If L3 succeeds but caches fail, data is still safe in the source of truth.
   * 
   * @param key - The key to store
   * @param value - The value to store
   * @param options - Optional storage options (ttl, layer targeting)
   * @returns Promise resolving to true if operation succeeded
   */
  async set<T = unknown>(key: string, value: T, options: StorageOptions = {}): Promise<boolean> {
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
            await this.l1Memory.set(key, value, ttl);
            this.updateResponseTime(Date.now() - startTime);
            return true;
          case StorageLayer.REDIS:
            if (this.l2Redis) {
              await this.l2Redis.set(key, value, ttl);
            }
            this.updateResponseTime(Date.now() - startTime);
            return true;
          case StorageLayer.POSTGRES:
            if (this.l3Postgres) {
              await this.l3Postgres.set(key, value, ttl);
            }
            this.updateResponseTime(Date.now() - startTime);
            return true;
        }
      }
      
      // L3-First Write Strategy: Write to PostgreSQL first (source of truth)
      if (this.l3Postgres) {
        await this.l3Postgres.set(key, value, ttl);
      }
      
      // Best-effort cache warming - tolerate cache failures using Promise.allSettled
      await Promise.allSettled([
        this.l1Memory.set(key, value, ttl),
        this.l2Redis ? this.l2Redis.set(key, value, ttl) : Promise.resolve()
      ]);
      
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
   * Delete from all storage layers using resilient approach
   * 
   * Uses Promise.allSettled to attempt deletion from all layers without
   * failing if individual layers are unavailable. This provides graceful
   * degradation - even if cache layers fail, the operation continues.
   * 
   * @param key - The key to delete
   * @param options - Optional storage options (layer targeting)
   * @returns Promise resolving to true if operation completed
   */
  async delete(key: string, options: StorageOptions = {}): Promise<boolean> {
    const startTime = Date.now();
    this.metrics.totalOperations++;
    
    try {
      // Specific layer requested
      if (options?.layer) {
        switch (options.layer) {
          case StorageLayer.MEMORY:
            await this.l1Memory.delete(key);
            this.updateResponseTime(Date.now() - startTime);
            return true;
          case StorageLayer.REDIS:
            if (this.l2Redis) {
              await this.l2Redis.delete(key);
            }
            this.updateResponseTime(Date.now() - startTime);
            return true;
          case StorageLayer.POSTGRES:
            if (this.l3Postgres) {
              await this.l3Postgres.delete(key);
            }
            this.updateResponseTime(Date.now() - startTime);
            return true;
        }
      }
      
      // Delete from all layers using Promise.allSettled for resilience
      // Even if some layers fail, we continue with others
      await Promise.allSettled([
        this.l1Memory.delete(key),
        this.l2Redis ? this.l2Redis.delete(key) : Promise.resolve(),
        this.l3Postgres ? this.l3Postgres.delete(key) : Promise.resolve()
      ]);
      
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
            return await this.l1Memory.exists(key);
          case StorageLayer.REDIS:
            return this.l2Redis ? await this.l2Redis.exists(key) : false;
          case StorageLayer.POSTGRES:
            return this.l3Postgres ? await this.l3Postgres.exists(key) : false;
        }
      }
      
      // Check L1 (Memory) first
      if (await this.l1Memory.exists(key)) {
        return true;
      }
      
      // Check L2 (Redis)
      if (this.l2Redis && await this.l2Redis.exists(key)) {
        return true;
      }
      
      // Check L3 (PostgreSQL)
      if (this.l3Postgres && await this.l3Postgres.exists(key)) {
        return true;
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
   * 
   * Note: This is a simplified implementation that re-sets the value with new TTL.
   * For a more efficient implementation, layers would need an expire() method.
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      // Get current value
      const value = await this.get(key);
      if (value === null) {
        return false;
      }
      
      // Re-set with new TTL
      return await this.set(key, value, { ttl });
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
  
  /**
   * Get all keys matching a pattern
   * 
   * **IMPORTANT**: This method is currently not fully functional with the modular layer architecture.
   * Pattern-based key listing requires each layer to expose a keys() method, which is not yet
   * implemented in the StorageLayerInterface.
   * 
   * **Current Behavior**: Returns empty array
   * 
   * **Future Implementation**: Will require adding keys() method to StorageLayerInterface and
   * implementing it in each layer class (MemoryStorage, RedisStorage, PostgresStorage).
   * 
   * @param _pattern - Glob pattern for key matching (currently not used)
   * @returns Promise resolving to array of matching keys (currently always empty)
   * 
   * @deprecated This method needs reimplementation for the modular architecture
   * @see https://github.com/wgtechlabs/nuvex/issues/XXX for tracking
   */
  async keys(_pattern = '*'): Promise<string[]> {
    const allKeys = new Set<string>();
    
    // TODO: Implement keys() method in StorageLayerInterface and each layer class
    // This would allow proper pattern-based key listing across all layers
    // For now, return empty array to maintain API compatibility
    
    this.log('warn', 'keys() method not fully implemented with modular layers - returning empty array');
    
    return Array.from(allKeys);
  }
  
  async clear(pattern = '*'): Promise<number> {
    let cleared = 0;
    
    // For now, only support clearing all (pattern = '*')
    // Pattern-based clearing would require keys() implementation in each layer
    if (pattern === '*') {
      // Clear memory (L1)
      cleared = this.l1Memory.size();
      await this.l1Memory.clear();
      
      // Clear Redis (L2) - best effort
      if (this.l2Redis) {
        try {
          await this.l2Redis.clear();
        } catch (error) {
          this.log('warn', 'Error clearing Redis L2', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
      
      // Clear PostgreSQL (L3) - best effort
      if (this.l3Postgres) {
        try {
          await this.l3Postgres.clear();
        } catch (error) {
          this.log('warn', 'Error clearing PostgreSQL L3', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }
    } else {
      // Pattern-based clearing - iterate through keys
      const keys = await this.keys(pattern);
      for (const key of keys) {
        await this.delete(key);
        cleared++;
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
  
  /**
   * Perform health check on all storage layers
   * 
   * Uses Promise.allSettled to check all layers independently without
   * failing if one layer is down. Each layer's ping() method is called
   * to verify its operational status.
   * 
   * **Layer Health Checks:**
   * - Memory (L1): Always healthy if app is running
   * - Redis (L2): PING command verification
   * - PostgreSQL (L3): SELECT 1 query verification
   * 
   * @returns Promise resolving to health status of each layer
   * 
   * @example
   * ```typescript
   * const health = await engine.healthCheck();
   * console.log('Memory:', health.memory);    // true/false
   * console.log('Redis:', health.redis);      // true/false
   * console.log('PostgreSQL:', health.postgres); // true/false
   * 
   * if (!health.redis) {
   *   console.warn('Redis layer is down, degraded performance expected');
   * }
   * ```
   * 
   * @since 1.0.0
   * @public
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const results = await Promise.allSettled([
      this.l1Memory.ping(),
      this.l2Redis ? this.l2Redis.ping() : Promise.resolve(false),
      this.l3Postgres ? this.l3Postgres.ping() : Promise.resolve(false)
    ]);

    return {
      memory: results[0].status === 'fulfilled' && results[0].value === true,
      redis: results[1].status === 'fulfilled' && results[1].value === true,
      postgres: results[2].status === 'fulfilled' && results[2].value === true,
    };
  }
  
  // Layer management
  async promote(key: string, targetLayer: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      if (value === null) return false;
      
      switch (targetLayer) {
        case StorageLayer.MEMORY:
          await this.l1Memory.set(key, value);
          return true;
        case StorageLayer.REDIS:
          if (this.l2Redis) {
            await this.l2Redis.set(key, value);
            return true;
          }
          return false;
        case StorageLayer.POSTGRES:
          if (this.l3Postgres) {
            await this.l3Postgres.set(key, value);
            return true;
          }
          return false;
        default:
          return false;
      }
    } catch (error) {
      this.log('error', `Error promoting ${key} to ${targetLayer}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
  
  async demote(key: string, targetLayer: string): Promise<boolean> {
    // For now, demote means remove from higher layers
    try {
      switch (targetLayer) {
        case StorageLayer.POSTGRES:
          // Remove from memory (L1) and Redis (L2)
          await this.l1Memory.delete(key);
          if (this.l2Redis) {
            await this.l2Redis.delete(key);
          }
          return true;
        case StorageLayer.REDIS:
          // Remove from memory (L1) only
          await this.l1Memory.delete(key);
          return true;
        default:
          return false;
      }
    } catch (error) {
      this.log('error', `Error demoting ${key} to ${targetLayer}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
  
  async getLayerInfo(key: string): Promise<{ layer: string; ttl?: number } | null> {
    // Check which layer has the key (L1 → L2 → L3)
    if (await this.l1Memory.exists(key)) {
      return { layer: StorageLayer.MEMORY };
    }
    
    if (this.l2Redis && await this.l2Redis.exists(key)) {
      return { layer: StorageLayer.REDIS };
    }
    
    if (this.l3Postgres && await this.l3Postgres.exists(key)) {
      return { layer: StorageLayer.POSTGRES };
    }
    
    return null;
  }
  
  // Private helper methods
  
  // Memory cleanup
  private startMemoryCleanup(): void {
    const memoryTTL = this.config.memory?.ttl || 24 * 60 * 60 * 1000; // 24 hours default
    const cleanupInterval = memoryTTL / 24; // Clean up 24 times per TTL period
    this.cleanupInterval = setInterval(async () => {
      try {
        const cleaned = await this.l1Memory.cleanup();
        if (cleaned > 0) {
          this.log('debug', `Memory L1 cleanup completed - removed ${cleaned} expired entries`);
        }
      } catch (error) {
        this.log('error', 'Memory cleanup error', { 
          error: error instanceof Error ? error.message : String(error) 
        });
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
      memoryKeys: this.l1Memory.size(),
      connected: this.connected,
      layers: {
        memory: true,
        redis: this.l2Redis ? this.l2Redis.isConnected() : false,
        postgres: this.l3Postgres ? this.l3Postgres.isConnected() : false
      }
    };
  }
  
  async cleanupExpiredMemory(): Promise<number> {
    return await this.l1Memory.cleanup();
  }
}
