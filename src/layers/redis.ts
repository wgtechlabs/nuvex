/**
 * Nuvex - Redis Storage Layer (L2)
 * Next-gen Unified Vault Experience
 * 
 * Redis distributed cache layer providing fast, persistent caching across
 * multiple application instances. Acts as the middle tier in the storage hierarchy.
 * 
 * Features:
 * - Distributed caching for multi-instance deployments
 * - Fast access times (1-5ms typical)
 * - Automatic TTL-based expiration
 * - Connection health monitoring
 * - Graceful degradation on failures
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */

import { createClient, RedisClientType } from 'redis';
import type { StorageLayerInterface, Logger } from '../interfaces/index.js';

/**
 * Redis Storage Layer - L2 Distributed Cache
 * 
 * Implements distributed caching using Redis. This layer provides fast access
 * to frequently used data while supporting multiple application instances.
 * Redis data persists across application restarts (depending on Redis configuration).
 * 
 * **Key Features:**
 * - Distributed cache shared across instances
 * - Configurable TTL for automatic expiration
 * - JSON serialization for complex objects
 * - Graceful error handling with logging
 * - Connection health monitoring via PING
 * 
 * **Performance Characteristics:**
 * - Get: O(1) network + Redis lookup
 * - Set: O(1) network + Redis write
 * - Latency: 1-5ms typical (network dependent)
 * 
 * **Error Handling:**
 * - Returns null on connection failures
 * - Logs errors for monitoring
 * - Doesn't throw to allow graceful degradation
 * 
 * @implements {StorageLayerInterface}
 * 
 * @example
 * ```typescript
 * // Create Redis layer
 * const redis = new RedisStorage('redis://localhost:6379');
 * 
 * // Connect to Redis
 * await redis.connect();
 * 
 * // Store with 5 minute TTL
 * await redis.set('session:abc', sessionData, 300);
 * 
 * // Retrieve data
 * const data = await redis.get('session:abc');
 * 
 * // Check health
 * const isHealthy = await redis.ping();
 * ```
 * 
 * @class RedisStorage
 * @since 1.0.0
 */
export class RedisStorage implements StorageLayerInterface {
  /** Redis client instance */
  private client: RedisClientType | null;
  
  /** Redis connection URL */
  private readonly url: string;
  
  /** Whether the client is connected */
  private connected: boolean;
  
  /** Optional logger for debugging and monitoring */
  private logger: Logger | null;

  /**
   * Creates a new RedisStorage instance
   * 
   * Note: The instance is created but not connected. Call connect() to establish
   * the Redis connection.
   * 
   * @param url - Redis connection URL (e.g., redis://localhost:6379)
   * @param logger - Optional logger for debugging
   * 
   * @example
   * ```typescript
   * const redis = new RedisStorage('redis://localhost:6379', console);
   * await redis.connect();
   * ```
   */
  constructor(url: string, logger: Logger | null = null) {
    this.url = url;
    this.client = null;
    this.connected = false;
    this.logger = logger;
  }

  /**
   * Establish connection to Redis
   * 
   * Creates and connects the Redis client. Should be called before any
   * storage operations.
   * 
   * @throws {Error} If connection fails
   * 
   * @example
   * ```typescript
   * try {
   *   await redis.connect();
   *   console.log('Redis connected');
   * } catch (error) {
   *   console.error('Redis connection failed:', error);
   * }
   * ```
   */
  async connect(): Promise<void> {
    try {
      this.client = createClient({ url: this.url });
      
      // Set up error handler
      this.client.on('error', (err) => {
        this.log('error', 'Redis L2: Connection error', { error: err.message });
      });

      await this.client.connect();
      this.connected = true;
      this.log('info', 'Redis L2: Connected successfully');
    } catch (error) {
      this.connected = false;
      this.log('error', 'Redis L2: Connection failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Close Redis connection
   * 
   * Gracefully closes the Redis connection. Should be called during
   * application shutdown.
   * 
   * @example
   * ```typescript
   * await redis.disconnect();
   * ```
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      this.log('info', 'Redis L2: Disconnected');
    }
  }

  /**
   * Retrieve a value from Redis cache
   * 
   * Deserializes the JSON-stored value. Returns null if the key doesn't exist
   * or if there's a connection/parsing error.
   * 
   * @param key - The key to retrieve
   * @returns Promise resolving to the value or null if not found
   * 
   * @example
   * ```typescript
   * const userData = await redis.get('user:123');
   * if (userData !== null) {
   *   console.log('Found in Redis');
   * }
   * ```
   */
  async get(key: string): Promise<unknown> {
    if (!this.connected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (value === null) {
        return null;
      }

      return JSON.parse(value);
    } catch (error) {
      this.log('error', `Redis L2: Error getting key: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return null;
    }
  }

  /**
   * Store a value in Redis cache
   * 
   * Serializes the value as JSON and stores it with optional TTL.
   * If TTL is not provided, the key will persist indefinitely (until manually deleted).
   * 
   * @param key - The key to store
   * @param value - The value to store (will be JSON serialized)
   * @param ttlSeconds - Optional TTL in seconds
   * 
   * @example
   * ```typescript
   * // Store with 1 hour TTL
   * await redis.set('session:abc', sessionData, 3600);
   * 
   * // Store without TTL (persists until deleted)
   * await redis.set('config:app', configData);
   * ```
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.connected || !this.client) {
      this.log('warn', 'Redis L2: Cannot set - not connected', { key });
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.log('error', `Redis L2: Error setting key: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Delete a value from Redis cache
   * 
   * @param key - The key to delete
   * 
   * @example
   * ```typescript
   * await redis.delete('session:expired');
   * ```
   */
  async delete(key: string): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      this.log('error', `Redis L2: Error deleting key: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Check if a key exists in Redis cache
   * 
   * @param key - The key to check
   * @returns Promise resolving to true if the key exists
   * 
   * @example
   * ```typescript
   * if (await redis.exists('user:123')) {
   *   console.log('Key exists in Redis');
   * }
   * ```
   */
  async exists(key: string): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.log('error', `Redis L2: Error checking existence: ${key}`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Clear all keys from Redis database
   * 
   * **WARNING:** This operation flushes the entire Redis database.
   * Use with caution in production environments.
   * 
   * @example
   * ```typescript
   * await redis.clear(); // Flushes entire Redis DB
   * ```
   */
  async clear(): Promise<void> {
    if (!this.connected || !this.client) {
      return;
    }

    try {
      await this.client.flushDb();
      this.log('info', 'Redis L2: Database flushed');
    } catch (error) {
      this.log('error', 'Redis L2: Error flushing database', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Health check for Redis connection
   * 
   * Uses Redis PING command to verify connectivity and responsiveness.
   * Returns false if not connected or if PING fails.
   * 
   * @returns Promise resolving to true if Redis is healthy and responsive
   * 
   * @example
   * ```typescript
   * const isHealthy = await redis.ping();
   * if (!isHealthy) {
   *   console.error('Redis connection is down');
   * }
   * ```
   */
  async ping(): Promise<boolean> {
    if (!this.connected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.log('error', 'Redis L2: Ping failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  /**
   * Check if Redis is connected
   * 
   * @returns True if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Atomically increment a numeric value
   * 
   * Uses Redis INCRBY command for true atomic increments that are safe
   * across multiple instances and concurrent requests.
   * 
   * @param key - The key to increment
   * @param delta - The amount to increment by
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise resolving to the new value after increment
   * 
   * @example
   * ```typescript
   * // Atomic increment - safe for concurrent access
   * const newValue = await redis.increment('counter', 1, 3600);
   * ```
   */
  async increment(key: string, delta: number, ttlSeconds?: number): Promise<number> {
    if (!this.connected || !this.client) {
      this.log('warn', 'Redis L2: Cannot increment - not connected', { key });
      throw new Error('Redis not connected');
    }

    try {
      // Use INCRBY for atomic increment
      const newValue = await this.client.incrBy(key, delta);
      
      // Set TTL if specified
      if (ttlSeconds) {
        await this.client.expire(key, ttlSeconds);
      }
      
      return newValue;
    } catch (error) {
      this.log('error', `Redis L2: Error incrementing key: ${key}`, { 
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
