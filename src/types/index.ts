/**
 * Nuvex - Type Definitions
 * Next-gen Unified Vault Experience
 * 
 * Comprehensive type definitions for the multi-layer storage SDK.
 * Provides type safety and IntelliSense support for all storage operations,
 * configurations, and data structures.
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */

import type { Logger } from '../interfaces/index.js';

// ===== Configuration Types =====

/**
 * PostgreSQL database configuration
 * 
 * Configuration options for the PostgreSQL storage layer, which serves as
 * the persistent storage tier in the multi-layer architecture.
 * 
 * @interface PostgresConfig
 */
export interface PostgresConfig {
  /** Database server hostname or IP address */
  host: string;
  /** Database server port number (typically 5432) */
  port: number;
  /** Name of the database to connect to */
  database: string;
  /** Database username for authentication */
  user: string;
  /** Database password for authentication */
  password: string;
  /** SSL/TLS configuration - boolean for default or object for custom settings */
  ssl?: boolean | object;
  /** Maximum number of connections in the pool (default: 10) */
  max?: number;
  /** Time to wait before timing out idle connections (ms) */
  idleTimeoutMillis?: number;
  /** Time to wait for connection establishment (ms) */
  connectionTimeoutMillis?: number;
}

/**
 * Redis cache configuration
 * 
 * Configuration options for the Redis storage layer, which serves as
 * the distributed cache tier for improved performance.
 * 
 * @interface RedisConfig
 */
export interface RedisConfig {
  /** Redis connection URL (e.g., redis://localhost:6379) */
  url: string;
  /** Default time to live for Redis entries in seconds (default: 3 days) */
  ttl?: number;
  /** Delay between retry attempts on failover (ms) */
  retryDelayOnFailover?: number;
  /** Maximum number of retry attempts per request */
  maxRetriesPerRequest?: number;
}

/**
 * Memory cache configuration
 * 
 * Configuration options for the in-memory storage layer, which provides
 * the fastest access tier in the multi-layer architecture.
 * 
 * @interface MemoryConfig
 */
export interface MemoryConfig {
  /** Default time to live for memory entries in milliseconds (default: 24 hours) */
  ttl?: number;
  /** Maximum number of entries to store in memory (default: 10,000) */
  maxSize?: number;
  /** Interval for cleaning up expired entries in milliseconds */
  cleanupInterval?: number;
}

/**
 * Logging configuration
 * 
 * Configuration options for logging and monitoring throughout the storage system.
 * 
 * @interface LoggingConfig
 */
export interface LoggingConfig {
  /** Whether logging is enabled */
  enabled?: boolean;
  /** Custom logger implementation (must implement Logger interface) */
  logger?: Logger;
  /** Minimum log level to output */
  level?: LogLevel;
  /** Include performance metrics in log output */
  includeMetrics?: boolean;
  /** Include operation performance data in logs */
  includePerformance?: boolean;
  /** Include stack traces in error logs */
  includeStackTrace?: boolean;
}

/**
 * Main Nuvex configuration
 * 
 * Root configuration object that defines all storage layers and system behavior.
 * Only PostgreSQL configuration is required - Redis and memory layers are optional
 * but highly recommended for optimal performance.
 * 
 * @interface NuvexConfig
 */
export interface NuvexConfig {
  /** PostgreSQL configuration (required) - persistent storage layer */
  postgres: PostgresConfig;
  /** Redis configuration (optional) - distributed cache layer */
  redis?: RedisConfig;
  /** Memory configuration (optional) - in-memory cache layer */
  memory?: MemoryConfig;
  /** Logging configuration (optional) - monitoring and debugging */
  logging?: LoggingConfig;
}

// ===== Storage Types =====

/**
 * Storage operation options
 * 
 * Configuration options that can be applied to individual storage operations
 * to customize behavior, targeting, and performance characteristics.
 * 
 * @interface StorageOptions
 */
export interface StorageOptions {
  /** Custom time to live override for this operation (seconds) */
  ttl?: number;
  /** Target a specific storage layer instead of using the default multi-layer approach */
  layer?: StorageLayer;
  /** Skip cache layers and go directly to persistent storage */
  skipCache?: boolean;
}

/**
 * Storage performance metrics
 * 
 * Comprehensive metrics about storage operations and performance across
 * all layers. Used for monitoring, optimization, and debugging.
 * 
 * @interface StorageMetrics
 */
export interface StorageMetrics {
  /** Number of successful cache hits in memory layer */
  memoryHits: number;
  /** Number of cache misses in memory layer */
  memoryMisses: number;
  /** Number of successful cache hits in Redis layer */
  redisHits: number;
  /** Number of cache misses in Redis layer */
  redisMisses: number;
  /** Number of successful reads from PostgreSQL layer */
  postgresHits: number;
  /** Number of failed reads from PostgreSQL layer */
  postgresMisses: number;
  /** Total number of operations performed */
  totalOperations: number;
  /** Average response time across all operations (milliseconds) */
  averageResponseTime: number;
}

/**
 * Storage item metadata
 * 
 * Metadata associated with a stored item, including lifecycle information
 * and layer-specific details.
 * 
 * @template T - The type of the stored value
 * @interface StorageItem
 */
export interface StorageItem<T = unknown> {
  /** The actual stored value */
  value: T;
  /** When the item was first created */
  createdAt: Date;
  /** When the item will expire (if applicable) */
  expiresAt?: Date;
  /** Which storage layer currently holds this item */
  layer: StorageLayer;
}

// ===== Operation Types =====

/**
 * Batch operation definition
 * 
 * Defines a single operation within a batch request. Supports set, get,
 * and delete operations with optional per-operation configuration.
 * 
 * @interface BatchOperation
 */
export interface BatchOperation {
  /** Type of operation to perform */
  operation: 'set' | 'get' | 'delete';
  /** Key for the operation */
  key: string;
  /** Value to store (required for 'set' operations) */
  value?: unknown;
  /** Optional configuration for this specific operation */
  options?: StorageOptions;
}

/**
 * Batch operation result
 * 
 * Result of a single operation within a batch request, including
 * success status and any returned data or error information.
 * 
 * @template T - The type of the returned value
 * @interface BatchResult
 */
export interface BatchResult<T = unknown> {
  /** Key that was operated on */
  key: string;
  /** Whether the operation completed successfully */
  success: boolean;
  /** Returned value (for successful get operations) */
  value?: T;
  /** Error message (for failed operations) */
  error?: string;
}

/**
 * Query operation options
 * 
 * Configuration for advanced query operations that can search across
 * multiple keys and return filtered, sorted, and paginated results.
 * 
 * @interface QueryOptions
 */
export interface QueryOptions {
  /** Glob pattern for key matching (e.g., 'user:*', 'session:?????') */
  pattern?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
  /** Field to sort results by */
  sortBy?: 'key' | 'createdAt' | 'expiresAt';
  /** Sort order direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Query operation result
 * 
 * Results from a query operation, including the matching items,
 * pagination information, and metadata.
 * 
 * @template T - The type of the stored values
 * @interface QueryResult
 */
export interface QueryResult<T = unknown> {
  /** Array of matching items with their metadata */
  items: Array<{ key: string; value: T; metadata: StorageItem<T> }>;
  /** Total number of matching items (before pagination) */
  total: number;
  /** Whether there are more results available */
  hasMore: boolean;
}

// ===== Enum Types =====

/**
 * Storage layer enumeration
 * 
 * Defines the available storage layers in the multi-tier architecture.
 * Each layer has different performance characteristics and use cases.
 * 
 * @enum {string}
 */
export enum StorageLayer {
  /** In-memory cache layer - fastest access, volatile storage */
  MEMORY = 'memory',
  /** Redis cache layer - fast distributed cache, configurable persistence */
  REDIS = 'redis',
  /** PostgreSQL layer - persistent storage, ACID compliance */
  POSTGRES = 'postgres'
}

/**
 * Logging level enumeration
 * 
 * Defines the available logging levels for the system logger.
 * 
 * @enum {string}
 */
export enum LogLevel {
  /** Detailed debug information */
  DEBUG = 'debug',
  /** General information messages */
  INFO = 'info',
  /** Warning messages for non-critical issues */
  WARN = 'warn',
  /** Error messages for failures and exceptions */
  ERROR = 'error'
}

// ===== Legacy Types (for migration from bot-specific code) =====

export interface TicketData {
  ticketId: string;
  conversationId: string;
  telegramMessageId: number;
  status: string;
  priority: string;
  subject: string;
  description: string;
  customerId: string;
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface UserState {
  currentStep: string;
  formData: Record<string, any>;
  context: Record<string, any>;
  lastActivity: Date;
  expiresAt?: Date;
}

export interface CustomerData {
  customerId: string;
  telegramUserId: number;
  name: string;
  email?: string;
  phone?: string;
  preferences: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserData {
  userId: string;
  telegramUserId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isBot: boolean;
  isPremium?: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  lastSeen: Date;
}

export interface AgentMessageData {
  messageId: string;
  ticketId: string;
  agentId: string;
  content: string;
  messageType: 'text' | 'image' | 'document' | 'voice';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TicketInfo {
  ticketId: string;
  status: string;
  priority: string;
  assignedAgent?: string;
  lastActivity: Date;
  messageCount: number;
}
