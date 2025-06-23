/**
 * Nuvex - Type Definitions
 * Next-gen Unified Vault Experience
 * 
 * Core type definitions for the multi-layer storage SDK
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0 * @since 2025
 */

import type { Logger } from '../interfaces/index.js';

// ===== Configuration Types =====

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export interface RedisConfig {
  url: string;
  ttl?: number; // Time to live in seconds
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

export interface MemoryConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export interface LoggingConfig {
  enabled?: boolean;
  logger?: Logger;
  level?: LogLevel;
  includeMetrics?: boolean;
  includePerformance?: boolean;
  includeStackTrace?: boolean;
}

export interface NuvexConfig {
  postgres: PostgresConfig;
  redis?: RedisConfig;
  memory?: MemoryConfig;
  logging?: LoggingConfig;
}

// ===== Storage Types =====

export interface StorageOptions {
  ttl?: number; // Time to live override
  layer?: StorageLayer; // Specific layer to use
  skipCache?: boolean; // Skip memory/redis, go straight to postgres
}

export interface StorageMetrics {
  memoryHits: number;
  memoryMisses: number;
  redisHits: number;
  redisMisses: number;
  postgresHits: number;
  postgresMisses: number;
  totalOperations: number;
  averageResponseTime: number;
}

export interface StorageItem<T = any> {
  value: T;
  createdAt: Date;
  expiresAt?: Date;
  layer: StorageLayer;
}

// ===== Operation Types =====

export interface BatchOperation {
  operation: 'set' | 'get' | 'delete';
  key: string;
  value?: any;
  options?: StorageOptions;
}

export interface BatchResult<T = any> {
  key: string;
  success: boolean;
  value?: T;
  error?: string;
}

export interface QueryOptions {
  pattern?: string; // Key pattern for search
  limit?: number;
  offset?: number;
  sortBy?: 'key' | 'createdAt' | 'expiresAt';
  sortOrder?: 'asc' | 'desc';
}

export interface QueryResult<T = any> {
  items: Array<{ key: string; value: T; metadata: StorageItem<T> }>;
  total: number;
  hasMore: boolean;
}

// ===== Enum Types =====

export enum StorageLayer {
  MEMORY = 'memory',
  REDIS = 'redis',
  POSTGRES = 'postgres'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
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
