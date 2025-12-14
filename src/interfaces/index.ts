/**
 * Nuvex - Interface Definitions
 * Next-gen Unified Vault Experience
 * 
 * Core interfaces for the multi-layer storage SDK
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */

import type { 
  StorageOptions, 
  StorageMetrics, 
  BatchOperation, 
  BatchResult, 
  QueryOptions, 
  QueryResult,
  NuvexConfig,
  LogLevel
} from '../types/index.js';

// ===== Logging Interface =====

/**
 * Logger interface for consistent logging across the storage system
 * 
 * Defines the standard logging interface that can be implemented by any
 * logging library (Winston, Bunyan, console, etc.). All log methods
 * accept optional metadata for structured logging.
 * 
 * @interface Logger
 */
export interface Logger {
  /** Log debug information for development and troubleshooting */
  debug(message: string, meta?: unknown): void;
  /** Log general information about system operations */
  info(message: string, meta?: unknown): void;
  /** Log warnings about non-critical issues that should be addressed */
  warn(message: string, meta?: unknown): void;
  /** Log errors and exceptions that require immediate attention */
  error(message: string, meta?: unknown): void;
}

/**
 * Structured logging context
 * 
 * Standard metadata structure for logging operations and performance data.
 * Provides consistent context across all log entries.
 * 
 * @interface LogContext
 */
export interface LogContext {
  /** Name of the operation being performed */
  operation?: string;
  /** Key involved in the operation */
  key?: string;
  /** Storage layer where the operation occurred */
  layer?: string;
  /** Duration of the operation in milliseconds */
  duration?: number;
  /** Whether the operation completed successfully */
  success?: boolean;
  /** Error message if the operation failed */
  error?: string;
  /** Additional operation-specific metadata */
  metadata?: Record<string, unknown>;
}

// ===== Storage Interface =====

/**
 * Core storage interface
 * 
 * Defines the fundamental storage operations that must be implemented by
 * any storage engine. This interface provides the low-level operations
 * for the multi-layer storage architecture.
 * 
 * @interface Storage
 */
export interface Storage {
  // Connection management
  
  /** Establish connections to all configured storage layers */
  connect(): Promise<void>;
  /** Close all connections and cleanup resources */
  disconnect(): Promise<void>;
  /** Check if the storage engine is connected and ready */
  isConnected(): boolean;
  // Basic operations
  /** Store a value with optional configuration */
  set<T = unknown>(key: string, value: T, options?: StorageOptions): Promise<boolean>;
  /** Retrieve a value from storage */
  get<T = unknown>(key: string, options: StorageOptions): Promise<T | null>;
  /** Delete a value from all storage layers */
  delete(key: string, options: StorageOptions): Promise<boolean>;
  /** Check if a key exists in any storage layer */
  exists(key: string, options: StorageOptions): Promise<boolean>;
  /** Set or update expiration time for a key */
  expire(key: string, ttl: number): Promise<boolean>;

  // Batch operations
  
  /** Execute multiple storage operations in a batch */
  setBatch(operations: BatchOperation[]): Promise<BatchResult[]>;
  /** Retrieve multiple values in a batch */
  getBatch(keys: string[], options: StorageOptions): Promise<BatchResult[]>;
  /** Delete multiple values in a batch */
  deleteBatch(keys: string[]): Promise<BatchResult[]>;

  // Query operations
  
  /** Execute advanced queries with filtering and pagination */
  query<T = unknown>(options: QueryOptions): Promise<QueryResult<T>>;
  /** Get all keys matching an optional pattern */
  keys(pattern?: string): Promise<string[]>;
  /** Clear all keys or keys matching a pattern */
  clear(pattern?: string): Promise<number>;

  // Metrics and monitoring
  
  /** Get current performance metrics */
  getMetrics(): StorageMetrics;
  /** Reset all performance metrics to zero */
  resetMetrics(): void;

  // Layer management
  
  /** Promote a key to a higher performance layer */
  promote(key: string, targetLayer: string): Promise<boolean>;
  /** Demote a key to a lower performance layer */
  demote(key: string, targetLayer: string): Promise<boolean>;
  /** Get information about which layer currently holds a key */
  getLayerInfo(key: string): Promise<{ layer: string; ttl?: number } | null>;
}

// ===== Store Interface =====

/**
 * High-level store interface
 * 
 * Extends the basic Storage interface with additional features for
 * configuration management, health monitoring, and maintenance operations.
 * This is typically the interface used by application developers.
 * 
 * @interface Store
 * @extends Storage
 */
export interface Store extends Storage {
  // Configuration
  
  /** Update configuration with new settings */
  configure(config: Partial<NuvexConfig>): Promise<void>;
  /** Get current configuration */
  getConfig(): NuvexConfig;

  // Health checks
  
  /** Perform comprehensive health checks on all storage layers */
  healthCheck(): Promise<{
    memory: boolean;
    redis: boolean;
    postgres: boolean;
    overall: boolean;
  }>;

  // Maintenance operations
  
  /** Clean up expired entries and optimize storage */
  cleanup(): Promise<{ cleaned: number; errors: number }>;
  /** Compact storage and optimize performance */
  compact(): Promise<void>;
  /** Create a backup of all stored data */
  backup(destination?: string): Promise<string>;
  /** Restore data from a backup */
  restore(source: string): Promise<boolean>;
}

// ===== Database Connection Interface =====

export interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  query(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}

// ===== Storage Layer Interface =====

/**
 * Storage Layer interface for modular storage implementations
 * 
 * Defines the contract that all storage layer implementations must follow.
 * Each layer (Memory, Redis, PostgreSQL) implements this interface to provide
 * consistent operations across the storage hierarchy.
 * 
 * This interface supports:
 * - Basic CRUD operations (get, set, delete)
 * - Existence checks
 * - Optional clear operation for cache layers
 * - Health check via ping() method
 * 
 * @interface StorageLayerInterface
 * @since 1.0.0
 */
export interface StorageLayerInterface {
  /**
   * Retrieve a value from this storage layer
   * @param key - The key to retrieve
   * @returns Promise resolving to the value or null if not found
   */
  get(key: string): Promise<unknown>;
  
  /**
   * Store a value in this storage layer
   * @param key - The key to store
   * @param value - The value to store
   * @param ttlSeconds - Optional TTL in seconds
   * @returns Promise resolving when the operation completes
   */
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  
  /**
   * Delete a value from this storage layer
   * @param key - The key to delete
   * @returns Promise resolving when the operation completes
   */
  delete(key: string): Promise<void>;
  
  /**
   * Check if a key exists in this storage layer
   * @param key - The key to check
   * @returns Promise resolving to true if the key exists
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Clear all data from this storage layer (optional for some layers)
   * @returns Promise resolving when the operation completes
   */
  clear?(): Promise<void>;
  
  /**
   * Health check for this storage layer
   * @returns Promise resolving to true if the layer is healthy and operational
   */
  ping(): Promise<boolean>;
}

// ===== Cache Interface =====

export interface CacheLayer {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<number>;
  keys(pattern?: string): Promise<string[]>;  ttl(key: string): Promise<number>;
}
