/**
 * Nuvex - Memory Storage Layer (L1)
 * Next-gen Unified Vault Experience
 * 
 * In-memory cache layer with LRU (Least Recently Used) eviction policy.
 * Provides the fastest access tier in the multi-layer storage architecture.
 * 
 * Features:
 * - LRU eviction with configurable maxSize
 * - TTL-based expiration
 * - Sub-millisecond access times
 * - Automatic cleanup of expired entries
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */

import type { StorageLayerInterface, Logger } from '../interfaces/index.js';

/**
 * Entry stored in the memory cache
 * Contains the value and optional expiration timestamp
 */
interface MemoryCacheEntry {
  /** The stored value */
  value: unknown;
  /** Expiration timestamp in milliseconds (undefined means no expiration) */
  expires?: number;
}

/**
 * Memory Storage Layer - L1 Cache with LRU Eviction
 * 
 * Implements an in-memory cache with Least Recently Used (LRU) eviction policy.
 * This layer provides the fastest access times but has limited capacity defined
 * by maxSize. When the cache is full, the least recently accessed item is evicted
 * to make room for new entries.
 * 
 * **LRU Implementation:**
 * - Uses JavaScript Map which maintains insertion order
 * - On get(), moves accessed entry to end (marks as recently used)
 * - On set(), evicts first entry (oldest/least recently used) when full
 * - Combines LRU with TTL-based expiration for optimal memory management
 * 
 * **Performance Characteristics:**
 * - Get: O(1) average, O(n) worst case due to delete+set for LRU
 * - Set: O(1) with occasional O(1) eviction
 * - Memory: O(maxSize)
 * 
 * @implements {StorageLayerInterface}
 * 
 * @example
 * ```typescript
 * // Create memory layer with 1000 entry limit
 * const memory = new MemoryStorage(1000);
 * 
 * // Store with 60 second TTL
 * await memory.set('user:123', userData, 60);
 * 
 * // Retrieve (marks as recently used)
 * const data = await memory.get('user:123');
 * 
 * // Check health
 * const isHealthy = await memory.ping(); // Always true
 * ```
 * 
 * @class MemoryStorage
 * @since 1.0.0
 */
export class MemoryStorage implements StorageLayerInterface {
  /** In-memory cache using Map for LRU ordering */
  private cache: Map<string, MemoryCacheEntry>;
  
  /** Maximum number of entries before LRU eviction kicks in */
  private readonly maxSize: number;
  
  /** Optional logger for debugging and monitoring */
  private logger: Logger | null;

  /**
   * Creates a new MemoryStorage instance
   * 
   * @param maxSize - Maximum number of entries to store (default: 10,000)
   * @param logger - Optional logger for debugging
   * 
   * @example
   * ```typescript
   * // Default configuration
   * const memory = new MemoryStorage();
   * 
   * // Custom size limit
   * const memory = new MemoryStorage(5000);
   * 
   * // With logging
   * const memory = new MemoryStorage(10000, console);
   * ```
   */
  constructor(maxSize = 10000, logger: Logger | null = null) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.logger = logger;
  }

  /**
   * Retrieve a value from memory cache
   * 
   * Implements LRU by moving accessed entries to the end of the Map,
   * marking them as recently used. Automatically removes expired entries.
   * 
   * @param key - The key to retrieve
   * @returns Promise resolving to the value or null if not found/expired
   * 
   * @example
   * ```typescript
   * const value = await memory.get('user:123');
   * if (value !== null) {
   *   console.log('Cache hit!');
   * }
   * ```
   */
  async get(key: string): Promise<unknown> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      this.log('debug', `Memory L1: Expired entry removed: ${key}`);
      return null;
    }

    // LRU: Move to end (mark as recently used)
    // This is done by deleting and re-adding to maintain Map insertion order
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Store a value in memory cache
   * 
   * Implements LRU eviction when cache is full. If the cache has reached
   * maxSize and the key doesn't already exist, the oldest entry (first in Map)
   * is evicted to make room for the new entry.
   * 
   * @param key - The key to store
   * @param value - The value to store
   * @param ttlSeconds - Optional TTL in seconds
   * 
   * @example
   * ```typescript
   * // Store without TTL
   * await memory.set('config:app', configData);
   * 
   * // Store with 5 minute TTL
   * await memory.set('session:abc', sessionData, 300);
   * ```
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    // LRU eviction: Remove least recently used entry if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.log('debug', `Memory L1: LRU eviction: ${firstKey}`);
      }
    }

    // Create entry with optional expiration
    const entry: MemoryCacheEntry = { value };
    if (ttlSeconds) {
      entry.expires = Date.now() + (ttlSeconds * 1000);
    }

    this.cache.set(key, entry);
  }

  /**
   * Delete a value from memory cache
   * 
   * @param key - The key to delete
   * 
   * @example
   * ```typescript
   * await memory.delete('user:123');
   * ```
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Check if a key exists in memory cache
   * 
   * Verifies existence and checks if the entry has expired.
   * Automatically removes expired entries.
   * 
   * @param key - The key to check
   * @returns Promise resolving to true if the key exists and is not expired
   * 
   * @example
   * ```typescript
   * if (await memory.exists('user:123')) {
   *   console.log('Key exists in memory');
   * }
   * ```
   */
  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all entries from memory cache
   * 
   * Removes all stored entries, resetting the cache to empty state.
   * 
   * @example
   * ```typescript
   * await memory.clear();
   * console.log('All memory cache cleared');
   * ```
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.log('info', 'Memory L1: Cache cleared');
  }

  /**
   * Health check for memory storage layer
   * 
   * Memory storage is always available if the application is running,
   * so this method always returns true unless there's a critical failure.
   * 
   * @returns Promise resolving to true (memory is always available)
   * 
   * @example
   * ```typescript
   * const isHealthy = await memory.ping();
   * console.log('Memory layer healthy:', isHealthy);
   * ```
   */
  async ping(): Promise<boolean> {
    try {
      // Memory is always available if the app is running
      // Perform a quick sanity check
      const testKey = '__nuvex_health_check__';
      const testEntry: MemoryCacheEntry = { value: true };
      this.cache.set(testKey, testEntry);
      this.cache.delete(testKey);
      return true;
    } catch (error) {
      this.log('error', 'Memory L1: Health check failed', { error });
      return false;
    }
  }

  /**
   * Get current cache size
   * 
   * Returns the number of entries currently stored in the cache.
   * Useful for monitoring and debugging.
   * 
   * @returns Current number of entries in cache
   * 
   * @example
   * ```typescript
   * console.log(`Cache usage: ${memory.size()}/${memory.getMaxSize()}`);
   * ```
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get maximum cache size
   * 
   * Returns the configured maximum number of entries.
   * 
   * @returns Maximum cache size
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Clean up expired entries
   * 
   * Iterates through all entries and removes expired ones.
   * This is useful for manual cleanup or scheduled maintenance.
   * 
   * @returns Number of entries removed
   * 
   * @example
   * ```typescript
   * const cleaned = await memory.cleanup();
   * console.log(`Removed ${cleaned} expired entries`);
   * ```
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires && now > entry.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.log('debug', `Memory L1: Cleanup removed ${cleaned} expired entries`);
    }

    return cleaned;
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
