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

export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

export interface LogContext {
  operation?: string;
  key?: string;
  layer?: string;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

// ===== Storage Interface =====

export interface Storage {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Basic operations
  set<T = any>(key: string, value: T, options?: StorageOptions): Promise<boolean>;
  get<T = any>(key: string, options?: StorageOptions): Promise<T | null>;
  delete(key: string, options?: StorageOptions): Promise<boolean>;
  exists(key: string, options?: StorageOptions): Promise<boolean>;
  expire(key: string, ttl: number): Promise<boolean>;

  // Batch operations
  setBatch(operations: BatchOperation[]): Promise<BatchResult[]>;
  getBatch(keys: string[], options?: StorageOptions): Promise<BatchResult[]>;
  deleteBatch(keys: string[]): Promise<BatchResult[]>;

  // Query operations
  query<T = any>(options: QueryOptions): Promise<QueryResult<T>>;
  keys(pattern?: string): Promise<string[]>;
  clear(pattern?: string): Promise<number>;

  // Metrics and monitoring
  getMetrics(): StorageMetrics;
  resetMetrics(): void;

  // Layer management
  promote(key: string, targetLayer: string): Promise<boolean>;
  demote(key: string, targetLayer: string): Promise<boolean>;
  getLayerInfo(key: string): Promise<{ layer: string; ttl?: number } | null>;
}

// ===== Store Interface =====

export interface Store extends Storage {
  // Configuration
  configure(config: Partial<NuvexConfig>): Promise<void>;
  getConfig(): NuvexConfig;

  // Health checks
  healthCheck(): Promise<{
    memory: boolean;
    redis: boolean;
    postgres: boolean;
    overall: boolean;
  }>;

  // Maintenance operations
  cleanup(): Promise<{ cleaned: number; errors: number }>;
  compact(): Promise<void>;
  backup(destination?: string): Promise<string>;
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

// ===== Cache Interface =====

export interface CacheLayer {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  clear(): Promise<number>;
  keys(pattern?: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
}

// ===== Legacy Interfaces (for bot migration) =====

export interface IBotsStore {
  // Ticket operations
  storeTicket(ticketData: any): Promise<boolean>;
  getTicketByMessageId(messageId: number): Promise<any | null>;
  getTicketByConversationId(conversationId: string): Promise<any | null>;
  updateTicketStatus(ticketId: string, status: string): Promise<boolean>;
  
  // User state operations
  storeUserState(userId: number, state: any): Promise<boolean>;
  getUserState(userId: number): Promise<any | null>;
  clearUserState(userId: number): Promise<boolean>;
  
  // Customer operations
  storeCustomer(customerData: any): Promise<boolean>;
  getCustomer(customerId: string): Promise<any | null>;
  updateCustomer(customerId: string, updates: any): Promise<boolean>;
}
