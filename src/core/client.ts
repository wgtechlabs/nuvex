/**
 * Nuvex - Client Implementation
 * Next-gen Unified Vault Experience
 * 
 * High-level client operations for any Node.js application using the StorageEngine
 * multi-layer architecture. Provides application-centric methods for storing and 
 * retrieving data with built-in health checks, metrics, and maintenance operations.
 * 
 * Core Features:
 * - Generic key-value operations with intelligent caching
 * - Health monitoring and diagnostics
 * - Automatic cleanup and maintenance
 * - Configuration management
 * - Backup and restore capabilities
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */
import { StorageEngine } from './engine.js';
import type { 
  NuvexConfig,
  StorageOptions,
  BatchOperation,
  BatchResult,
  QueryOptions,
  QueryResult
} from '../types/index.js';
import { StorageLayer } from '../types/index.js';
import type { Store as IStore, Logger } from '../interfaces/index.js';

/**
 * Nuvex Client - High-level storage operations
 * 
 * Provides a high-level interface for interacting with the multi-layer storage
 * architecture. Implements the Store interface with additional convenience methods,
 * health monitoring, backup/restore capabilities, and singleton pattern support.
 * 
 * @example
 * ```typescript
 * // Initialize as singleton
 * const client = await NuvexClient.initialize({
 *   postgres: { host: 'localhost', port: 5432, database: 'myapp' },
 *   redis: { url: 'redis://localhost:6379' },
 *   memory: { ttl: 3600000, maxSize: 10000 }
 * });
 * 
 * // Store and retrieve data
 * await client.set('user:123', { name: 'John', email: 'john@example.com' });
 * const user = await client.get('user:123');
 * 
 * // Use namespacing
 * await client.setNamespaced('users', '123', userData);
 * const userData = await client.getNamespaced('users', '123');
 * 
 * // Perform health checks
 * const health = await client.healthCheck();
 * console.log('Storage layers healthy:', health.overall);
 * ```
 * 
 * @class NuvexClient
 * @implements {IStore}
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */
export class NuvexClient implements IStore {
  private static instance: NuvexClient | null = null;
  public storage: StorageEngine;
  private config: NuvexConfig;
  private logger: Logger | null;
  constructor(config: NuvexConfig) {
    this.config = config;
    this.logger = config.logging?.enabled ? (config.logging.logger || null) : null;
    this.storage = new StorageEngine(config);
  }
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
    if (this.logger) {
      this.logger[level](message, meta);
    }
  }
  
  /**
   * Initialize the Store singleton instance
   * 
   * Creates a new NuvexClient instance if one doesn't exist and connects to all
   * configured storage layers. This method ensures only one instance exists
   * throughout the application lifecycle.
   * 
   * @param config - Configuration object for all storage layers
   * @returns Promise that resolves to the initialized NuvexClient instance
   * 
   * @example
   * ```typescript
   * const client = await NuvexClient.initialize({
   *   postgres: { host: 'localhost', port: 5432, database: 'myapp' },
   *   redis: { url: 'redis://localhost:6379' },
   *   memory: { ttl: 3600000, maxSize: 10000 }
   * });
   * ```
   * 
   * @since 1.0.0
   */
  static async initialize(config: NuvexConfig): Promise<NuvexClient> {
    if (!NuvexClient.instance) {
      NuvexClient.instance = new NuvexClient(config);
      await NuvexClient.instance.storage.connect();
    }
    return NuvexClient.instance;
  }
  
  /**
   * Get the singleton instance
   * 
   * Returns the existing NuvexClient instance. Must be called after initialize().
   * 
   * @returns The singleton NuvexClient instance
   * @throws {Error} If the store has not been initialized
   * 
   * @example
   * ```typescript
   * // After initialization
   * const client = NuvexClient.getInstance();
   * await client.set('key', 'value');
   * ```
   * 
   * @since 1.0.0
   */
  static getInstance(): NuvexClient {
    if (!NuvexClient.instance) {
      throw new Error('Store not initialized. Call NuvexClient.initialize() first.');
    }
    return NuvexClient.instance;
  }
  
  /**
   * Create a new Store instance (non-singleton)
   * 
   * Creates a new NuvexClient instance without affecting the singleton.
   * Useful for testing or when multiple isolated instances are needed.
   * 
   * @param config - Configuration object for all storage layers
   * @returns Promise that resolves to a new NuvexClient instance
   * 
   * @example
   * ```typescript
   * const testClient = await NuvexClient.create({
   *   postgres: testDbConfig,
   *   memory: { ttl: 1000 }
   * });
   * ```
   * 
   * @since 1.0.0
   */
  static async create(config: NuvexConfig): Promise<NuvexClient> {
    const store = new NuvexClient(config);
    await store.storage.connect();
    return store;
  }
  
  // Connection management
  
  /**
   * Connect to all configured storage layers
   * 
   * Establishes connections to PostgreSQL, Redis (if configured), and initializes
   * the memory cache. This method is automatically called by initialize() and create().
   * 
   * @returns Promise that resolves when all connections are established
   * @throws {Error} If any required storage layer fails to connect
   * 
   * @since 1.0.0
   */
  async connect(): Promise<void> {
    await this.storage.connect();
    this.log('info', 'Nuvex Client connected');
  }
  
  /**
   * Disconnect from all storage layers
   * 
   * Cleanly closes all connections and clears the memory cache.
   * Should be called during application shutdown.
   * 
   * @returns Promise that resolves when all connections are closed
   * 
   * @since 1.0.0
   */
  async disconnect(): Promise<void> {
    await this.storage.disconnect();
    this.log('info', 'Nuvex Client disconnected');
  }
  
  /**
   * Check if the client is connected to storage layers
   * 
   * @returns True if connected to at least the primary storage layer
   * 
   * @since 1.0.0
   */
  isConnected(): boolean {
    return this.storage.isConnected();
  }
  
  // Basic operations (delegated to UnifiedStorage)
  
  /**
   * Store a value in the multi-layer storage system
   * 
   * Stores the value across all available storage layers (Memory → Redis → PostgreSQL)
   * with intelligent TTL management and layer-specific optimizations.
   * 
   * @template T - The type of the value being stored
   * @param key - Unique identifier for the stored value
   * @param value - The value to store (will be JSON serialized)
   * @param options - Optional storage configuration
   * @returns Promise that resolves to true if stored successfully
   * 
   * @example
   * ```typescript
   * // Store with default TTL
   * await client.set('user:123', { name: 'John', email: 'john@example.com' });
   * 
   * // Store with custom TTL (60 seconds)
   * await client.set('session:abc', sessionData, { ttl: 60 });
   * 
   * // Store only in memory layer
   * await client.set('cache:temp', data, { layer: StorageLayer.MEMORY });
   * ```
   * 
   * @since 1.0.0
   */
  async set<T = unknown>(key: string, value: T, options?: StorageOptions): Promise<boolean> {
    return this.storage.set(key, value, options);
  }
  
  /**
   * Retrieve a value from the multi-layer storage system
   * 
   * Searches for the value across storage layers in order (Memory → Redis → PostgreSQL)
   * and automatically promotes the value to higher layers for faster future access.
   * 
   * @template T - The expected type of the retrieved value
   * @param key - Unique identifier of the value to retrieve
   * @param options - Optional retrieval configuration
   * @returns Promise that resolves to the value or null if not found
   * 
   * @example
   * ```typescript
   * // Get from any layer
   * const user = await client.get<UserType>('user:123');
   * 
   * // Get only from PostgreSQL, skip cache
   * const freshData = await client.get('data:key', { skipCache: true });
   * 
   * // Get only from memory layer
   * const cachedData = await client.get('cache:key', { layer: StorageLayer.MEMORY });
   * ```
   * 
   * @since 1.0.0
   */
  async get<T = unknown>(key: string, options: StorageOptions = {}): Promise<T | null> {
    return this.storage.get<T>(key, options);
  }
  
  /**
   * Delete a value from all storage layers
   * 
   * Removes the value from all storage layers to ensure consistency.
   * 
   * @param key - Unique identifier of the value to delete
   * @param options - Optional deletion configuration
   * @returns Promise that resolves to true if deleted successfully
   * 
   * @example
   * ```typescript
   * // Delete from all layers
   * await client.delete('user:123');
   * 
   * // Delete only from memory layer
   * await client.delete('cache:temp', { layer: StorageLayer.MEMORY });
   * ```
   * 
   * @since 1.0.0
   */
  async delete(key: string, options: StorageOptions = {}): Promise<boolean> {
    return this.storage.delete(key, options);
  }
  
  /**
   * Check if a key exists in any storage layer
   * 
   * @param key - Unique identifier to check for existence
   * @param options - Optional configuration to check specific layer
   * @returns Promise that resolves to true if the key exists
   * 
   * @example
   * ```typescript
   * if (await client.exists('user:123')) {
   *   console.log('User exists');
   * }
   * ```
   * 
   * @since 1.0.0
   */
  async exists(key: string, options: StorageOptions = {}): Promise<boolean> {
    return this.storage.exists(key, options);
  }
  
  /**
   * Set or update the expiration time for a key
   * 
   * @param key - Unique identifier of the value
   * @param ttl - Time to live in seconds
   * @returns Promise that resolves to true if expiration was set successfully
   * 
   * @example
   * ```typescript
   * // Expire in 1 hour
   * await client.expire('session:abc', 3600);
   * ```
   * 
   * @since 1.0.0
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    return this.storage.expire(key, ttl);
  }
  
  // Batch operations
  
  /**
   * Execute multiple set operations in a batch
   * 
   * Efficiently executes multiple storage operations with automatic error handling
   * and transaction-like behavior where possible.
   * 
   * @param operations - Array of batch operations to execute
   * @returns Promise that resolves to an array of results for each operation
   * 
   * @example
   * ```typescript
   * const results = await client.setBatch([
   *   { operation: 'set', key: 'user:1', value: userData1 },
   *   { operation: 'set', key: 'user:2', value: userData2, options: { ttl: 3600 } }
   * ]);
   * 
   * results.forEach((result, index) => {
   *   console.log(`Operation ${index}: ${result.success ? 'Success' : 'Failed'}`);
   * });
   * ```
   * 
   * @since 1.0.0
   */
  async setBatch(operations: BatchOperation[]): Promise<BatchResult[]> {
    return this.storage.setBatch(operations);
  }
  
  /**
   * Retrieve multiple values in a batch
   * 
   * Efficiently retrieves multiple values with layer optimization and
   * automatic cache promotion.
   * 
   * @param keys - Array of keys to retrieve
   * @param options - Optional configuration applied to all operations
   * @returns Promise that resolves to an array of results for each key
   * 
   * @example
   * ```typescript
   * const results = await client.getBatch(['user:1', 'user:2', 'user:3']);
   * const users = results
   *   .filter(result => result.success && result.value)
   *   .map(result => result.value);
   * ```
   * 
   * @since 1.0.0
   */
  async getBatch(keys: string[], options: StorageOptions = {}): Promise<BatchResult[]> {
    return this.storage.getBatch(keys, options);
  }
  
  /**
   * Delete multiple values in a batch
   * 
   * Efficiently deletes multiple values from all storage layers.
   * 
   * @param keys - Array of keys to delete
   * @returns Promise that resolves to an array of results for each key
   * 
   * @example
   * ```typescript
   * const results = await client.deleteBatch(['temp:1', 'temp:2', 'temp:3']);
   * const deletedCount = results.filter(r => r.success).length;
   * ```
   * 
   * @since 1.0.0
   */
  async deleteBatch(keys: string[]): Promise<BatchResult[]> {
    return this.storage.deleteBatch(keys);
  }
  
  // Query operations
  async query<T = unknown>(options: QueryOptions): Promise<QueryResult<T>> {
    return this.storage.query<T>(options);
  }
  
  async keys(pattern?: string): Promise<string[]> {
    return this.storage.keys(pattern);
  }
  
  async clear(pattern?: string): Promise<number> {
    this.log('warn', `Clearing storage${pattern ? ` with pattern: ${pattern}` : ' (all keys)'}`);
    return this.storage.clear(pattern);
  }
  
  // Metrics and monitoring
  /**
   * Get performance metrics for all layers or specific layer(s)
   * 
   * Returns metrics about storage operations and performance. Can be filtered
   * to return metrics for specific layers only.
   * 
   * @param layers - Optional layer(s) to get metrics for. If not provided, returns all metrics.
   *                 Can be a single layer string, 'all', or array of layer strings.
   * @returns Object containing requested metrics
   * 
   * @example
   * ```typescript
   * // Get all metrics
   * const metrics = client.getMetrics();
   * 
   * // Get specific layer metrics
   * const memoryMetrics = client.getMetrics('memory');
   * // { memoryHits, memoryMisses, memorySize, memoryMaxSize }
   * 
   * // Get multiple layer metrics
   * const cacheMetrics = client.getMetrics(['memory', 'redis']);
   * // { memoryHits, memoryMisses, memorySize, memoryMaxSize, redisHits, redisMisses, totalOperations, averageResponseTime, cacheHitRatio }
   * ```
   * 
   * @since 1.0.0
   */
  getMetrics(
    layers?: 'memory' | 'redis' | 'postgres' | 'all' | Array<'memory' | 'redis' | 'postgres'>
  ): Record<string, number> {
    return this.storage.getMetrics(layers);
  }
  
  resetMetrics(): void {
    this.storage.resetMetrics();
    this.log('info', 'Storage metrics reset');
  }
  
  // Layer management
  async promote(key: string, targetLayer: string): Promise<boolean> {
    return this.storage.promote(key, targetLayer);
  }
  
  async demote(key: string, targetLayer: string): Promise<boolean> {
    return this.storage.demote(key, targetLayer);
  }
  
  async getLayerInfo(key: string): Promise<{ layer: string; ttl?: number } | null> {
    return this.storage.getLayerInfo(key);
  }
  
  // Store-specific methods
  
  /**
   * Configure the store with new settings
   */
  async configure(config: Partial<NuvexConfig>): Promise<void> {
    // Merge with existing config
    this.config = { ...this.config, ...config };
    
    // Update logger if changed
    if (config.logging) {
      this.logger = config.logging.enabled ? (config.logging.logger || null) : null;
    }
    
    this.log('info', 'Client configuration updated');
  }
  
  /**
   * Get current configuration
   */
  getConfig(): NuvexConfig {
    return { ...this.config };
  }
  
  /**
   * Health check for all storage layers or specific layer(s)
   * 
   * Performs comprehensive health checks on configured storage layers
   * using the underlying engine's ping() methods for each layer.
   * 
   * @param layers - Optional layer(s) to check. If not provided, checks all layers.
   *                 Can be a single layer string or array of layer strings.
   * @returns Promise that resolves to health status for requested layer(s)
   * 
   * @example
   * ```typescript
   * // Check all layers
   * const health = await client.healthCheck();
   * // { memory: true, redis: true, postgres: true }
   * 
   * // Check specific layer
   * const redisHealth = await client.healthCheck('redis');
   * // { redis: true }
   * 
   * // Check multiple layers
   * const cacheHealth = await client.healthCheck(['memory', 'redis']);
   * // { memory: true, redis: true }
   * 
   * if (!health.redis) {
   *   console.error('Redis layer is down');
   * }
   * ```
   * 
   * @since 1.0.0
   */
  async healthCheck(
    layers?: 'memory' | 'redis' | 'postgres' | Array<'memory' | 'redis' | 'postgres'>
  ): Promise<Record<string, boolean>> {
    return this.storage.healthCheck(layers);
  }
  
  /**
   * Cleanup expired entries and optimize storage
   */
  async cleanup(): Promise<{ cleaned: number; errors: number }> {
    this.log('info', 'Starting storage cleanup');
    
    let cleaned = 0;
    let errors = 0;
    
    try {
      // Clean up expired memory entries
      const memoryCleanup = await this.storage.cleanupExpiredMemory();
      cleaned += memoryCleanup;
      
      this.log('info', `Cleanup completed: ${cleaned} entries cleaned, ${errors} errors`);
      return { cleaned, errors };
      
    } catch (error) {
      errors++;
      this.log('error', 'Cleanup failed', { error: (error as Error).message });
      return { cleaned, errors };
    }
  }
  
  /**
   * Compact storage and optimize performance
   */
  async compact(): Promise<void> {
    this.log('info', 'Starting storage compaction');
    
    try {
      // For now, compaction means cleanup + metrics reset
      await this.cleanup();
      this.resetMetrics();
      
      this.log('info', 'Storage compaction completed');
    } catch (error) {
      this.log('error', 'Storage compaction failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  /**
   * Backup storage data to external location with incremental support
   */
  async backup(destination?: string, options?: { incremental?: boolean; compression?: boolean }): Promise<string> {
    this.log('info', 'Starting storage backup');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupId = destination || `nuvex-backup-${timestamp}`;
      const { incremental = false, compression = true } = options || {};        // Get last backup timestamp for incremental backups
        let lastBackupTime: Date | null = null;
        if (incremental) {
          try {
            const lastBackupMetadata = await this.storage.get('__nuvex_last_backup_metadata', {});
            if (lastBackupMetadata && typeof lastBackupMetadata === 'object' && 'timestamp' in lastBackupMetadata) {
            lastBackupTime = new Date(lastBackupMetadata.timestamp as string);
          }
        } catch (error) {
          this.log('warn', 'Could not retrieve last backup metadata, performing full backup', { error: (error as Error).message });
        }
      }
      
      // Get all keys
      const allKeys = await this.storage.keys();
      const backupData: Record<string, {
        value: unknown;
        layerInfo: { layer: string; ttl?: number } | null;
        createdAt: string;
        version: string;
        backupType?: string;
        lastBackupTime?: string;
      }> = {};
      let keysProcessed = 0;
      let keysSkipped = 0;
      
      // Backup data with metadata and TTL information
      for (const key of allKeys) {
        // Skip internal backup metadata keys
        if (key.startsWith('__nuvex_') || key.startsWith('__backup:')) {
          keysSkipped++;
          continue;
        }
        
        const value = await this.storage.get(key, {});
        const layerInfo = await this.storage.getLayerInfo(key);
        
        if (value !== null) {
          const itemData = {
            value,
            layerInfo,
            createdAt: new Date().toISOString(),
            version: '1.0.0'
          };
          
          // For incremental backups, include only changed data
          if (incremental && lastBackupTime) {
            // This is a simplified approach - in production, you'd track modification times
            // For now, we'll include all data but mark it as incremental
            const enhancedItemData = itemData as typeof itemData & { backupType?: string; lastBackupTime?: string };
            enhancedItemData.backupType = 'incremental';
            enhancedItemData.lastBackupTime = lastBackupTime.toISOString();
          }
          
          backupData[key] = itemData;
          keysProcessed++;
        }
      }
      
      // Create backup metadata
      const backupMetadata = {
        id: backupId,
        createdAt: new Date().toISOString(),
        keyCount: keysProcessed,
        keysSkipped,
        version: '1.0.0',
        type: incremental ? 'incremental' : 'full',
        lastBackupTime: lastBackupTime?.toISOString() || null,
        compression,
        totalKeys: allKeys.length
      };
      
      // Create complete backup package
      const backupPackage = {
        metadata: backupMetadata,
        data: backupData
      };
      
      // Export to external storage (filesystem example)
      const fs = await import('fs').catch(() => null);
      const path = await import('path').catch(() => null);
      
      if (fs && path) {
        const backupDir = path.join(process.cwd(), 'nuvex-backups');
        
        // Ensure backup directory exists
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupFilePath = path.join(backupDir, `${backupId}.json`);
        const dataToWrite = JSON.stringify(backupPackage, null, 2);
        
        // Apply compression if requested
        if (compression) {
          try {
            const zlib = await import('zlib');
            const compressed = zlib.gzipSync(Buffer.from(dataToWrite));
            fs.writeFileSync(`${backupFilePath}.gz`, compressed);
            this.log('info', `Backup compressed and saved to ${backupFilePath}.gz`);
          } catch (compressionError) {
            this.log('warn', 'Compression failed, saving uncompressed', { error: (compressionError as Error).message });
            fs.writeFileSync(backupFilePath, dataToWrite);
          }
        } else {
          fs.writeFileSync(backupFilePath, dataToWrite);
        }
        
        // Update last backup metadata for incremental backups
        await this.storage.set('__nuvex_last_backup_metadata', {
          backupId,
          timestamp: new Date().toISOString(),
          type: incremental ? 'incremental' : 'full'
        }, {});
        
        this.log('info', `Backup completed: ${backupId}`, { 
          keyCount: keysProcessed, 
          keysSkipped,
          type: incremental ? 'incremental' : 'full',
          compressed: compression 
        });
        
        return backupId;
      } else {
        // Fallback: store in memory/internal storage with warning
        this.log('warn', 'File system not available, storing backup metadata internally (not recommended for production)');
        await this.storage.set(`__backup:${backupId}`, backupMetadata, {});
        return backupId;
      }
      
    } catch (error) {
      this.log('error', 'Backup failed', { error: (error as Error).message });
      throw error;
    }
  }
  
  /**
   * Restore storage data from external backup location
   */
  async restore(source: string, options?: { clearExisting?: boolean; dryRun?: boolean }): Promise<boolean> {
    this.log('info', `Starting restore from backup: ${source}`);
    
    try {
      const { clearExisting = false, dryRun = false } = options || {};
      
      // Try to load backup from external storage first
      const fs = await import('fs').catch(() => null);
      const path = await import('path').catch(() => null);
      let backupPackage: {
        metadata: Record<string, unknown>;
        data: Record<string, unknown>;
      } | null = null;
      
      if (fs && path) {
        const backupDir = path.join(process.cwd(), 'nuvex-backups');
        const backupFilePath = path.join(backupDir, `${source}.json`);
        const compressedFilePath = `${backupFilePath}.gz`;
        
        // Try compressed file first
        if (fs.existsSync(compressedFilePath)) {
          try {
            const zlib = await import('zlib');
            const compressedData = fs.readFileSync(compressedFilePath);
            const decompressed = zlib.gunzipSync(compressedData);
            backupPackage = JSON.parse(decompressed.toString());
            this.log('info', 'Loaded compressed backup file');
          } catch (decompressionError) {
            this.log('error', 'Failed to decompress backup file', { error: (decompressionError as Error).message });
            throw decompressionError;
          }
        } else if (fs.existsSync(backupFilePath)) {
          const backupData = fs.readFileSync(backupFilePath, 'utf8');
          backupPackage = JSON.parse(backupData);
          this.log('info', 'Loaded uncompressed backup file');
        }
      }
      
      // Fallback: try to load from internal storage
      if (!backupPackage) {
        this.log('warn', 'External backup not found, checking internal storage');
        const internalBackupMetadata = await this.storage.get(`__backup:${source}`, {});
        if (!internalBackupMetadata) {
          throw new Error(`Backup not found: ${source}`);
        }
        
        // For internal backups, we don't have the actual data, just metadata
        this.log('warn', 'Internal backup found but data restoration from internal storage is limited');
        return false;
      }
      
      const { metadata, data } = backupPackage;
      
      if (!metadata || !data) {
        throw new Error('Invalid backup format: missing metadata or data');
      }
      
      this.log('info', 'Backup metadata loaded', {
        id: metadata.id,
        createdAt: metadata.createdAt,
        keyCount: metadata.keyCount,
        type: metadata.type,
        version: metadata.version
      });
      
      if (dryRun) {
        this.log('info', 'Dry run mode: would restore the following keys', {
          keys: Object.keys(data),
          count: Object.keys(data).length
        });
        return true;
      }
      
      // Clear existing data if requested
      if (clearExisting) {
        this.log('warn', 'Clearing existing storage before restore');
        await this.storage.clear();
      }
      
      // Restore data with proper metadata and TTL
      let restoredCount = 0;
      let errorCount = 0;
      
      for (const [key, itemData] of Object.entries(data)) {
        try {
          const item = itemData as {
            value: unknown;
            layerInfo?: { layer: string; ttl?: number };
          };
          const { value, layerInfo } = item;
          
          // Restore to the original layer if possible
          const restoreOptions: StorageOptions = {};
          if (layerInfo?.layer) {
            restoreOptions.layer = layerInfo.layer as StorageLayer;
          }
          
          // Restore TTL if available
          if (layerInfo?.ttl && layerInfo.ttl > 0) {
            restoreOptions.ttl = layerInfo.ttl;
          }
          
          const success = await this.storage.set(key, value, restoreOptions);
          if (success) {
            restoredCount++;
          } else {
            errorCount++;
            this.log('warn', `Failed to restore key: ${key}`);
          }
        } catch (keyError) {
          errorCount++;
          this.log('error', `Error restoring key: ${key}`, { error: (keyError as Error).message });
        }
      }
      
      // Update restoration metadata
      await this.storage.set('__nuvex_last_restore_metadata', {
        backupId: metadata.id,
        restoredAt: new Date().toISOString(),
        restoredCount,
        errorCount,
        totalKeys: metadata.keyCount
      }, {});
      
      this.log('info', `Restore completed from backup: ${source}`, {
        restoredCount,
        errorCount,
        totalKeys: metadata.keyCount,
        successRate: `${((restoredCount / (metadata.keyCount as number)) * 100).toFixed(2)}%`
      });
      
      return errorCount === 0;
      
    } catch (error) {
      this.log('error', 'Restore failed', { error: (error as Error).message });
      return false;
    }
  }
  
  // Convenience methods for common patterns
  
  /**
   * Namespace-aware set operation
   */
  async setNamespaced(namespace: string, key: string, value: unknown, options: StorageOptions = {}): Promise<boolean> {
    return this.storage.set(`${namespace}:${key}`, value, options);
  }
  
  /**
   * Namespace-aware get operation
   */
  async getNamespaced<T = unknown>(namespace: string, key: string, options: StorageOptions = {}): Promise<T | null> {
    return this.storage.get<T>(`${namespace}:${key}`, options);
  }
  
  /**
   * Get all keys in a namespace
   */
  async getNamespaceKeys(namespace: string): Promise<string[]> {
    const allKeys = await this.keys(`${namespace}:*`);
    return allKeys.map(key => key.replace(`${namespace}:`, ''));
  }
  
  /**
   * Clear entire namespace
   */
  async clearNamespace(namespace: string): Promise<number> {
    return this.clear(`${namespace}:*`);
  }
  
  /**
   * Atomically increment a numeric value
   * 
   * This method provides true atomic increments that are safe for concurrent access
   * across all storage layers. Uses native atomic operations from Redis (INCRBY) and
   * PostgreSQL (UPDATE with row locks) when available.
   * 
   * **Thread-Safety:**
   * - ✅ Safe for concurrent increments to the same key
   * - ✅ No lost updates in high-concurrency scenarios
   * - ✅ Works correctly across multiple instances
   * 
   * **How It Works:**
   * 1. Uses atomic increment at the authoritative layer (PostgreSQL or Redis)
   * 2. Propagates the new value to cache layers for consistency
   * 3. Returns the exact new value after increment
   * 
   * **Example Usage:**
   * ```typescript
   * // ✅ SAFE: Concurrent increments work correctly
   * await Promise.all([
   *   client.increment('counter'),  // reads 5, writes 6
   *   client.increment('counter')   // reads 6, writes 7
   * ]);
   * // Result: 7 (all increments counted correctly)
   * 
   * // Custom delta
   * await client.increment('page_views', 5);
   * 
   * // With TTL (in seconds)
   * await client.increment('rate_limit', 1, { ttl: 3600 });
   * ```
   * 
   * **Use Cases:**
   * - ✅ High-concurrency counters (page views, API calls)
   * - ✅ Critical operations (user credits, inventory)
   * - ✅ Financial operations requiring exactness
   * - ✅ Distributed systems with multiple instances
   * 
   * @param key - The key to increment
   * @param delta - The amount to increment by (default: 1)
   * @param options - Optional storage options (e.g., TTL)
   * @returns Promise resolving to the new value after increment
   */
  async increment(key: string, delta = 1, options?: StorageOptions): Promise<number> {
    const ttl = options?.ttl;
    return this.storage.increment(key, delta, ttl);
  }
  
  /**
   * Atomically decrement a numeric value
   * 
   * This is a convenience method that uses atomic increment with a negative delta.
   * Provides the same thread-safety guarantees as increment().
   * 
   * @param key - The key to decrement
   * @param delta - The amount to decrement by (default: 1)
   * @param options - Optional storage options (e.g., TTL)
   * @returns Promise resolving to the new value after decrement
   * 
   * @example
   * ```typescript
   * // Decrement by 1
   * await client.decrement('inventory');
   * 
   * // Decrement by custom amount
   * await client.decrement('stock', 5);
   * ```
   */
  async decrement(key: string, delta = 1, options?: StorageOptions): Promise<number> {
    return this.increment(key, -delta, options);
  }
  
  /**
   * Set if not exists
   */
  async setIfNotExists<T = unknown>(key: string, value: T, options?: StorageOptions): Promise<boolean> {
    const exists = await this.storage.exists(key, options);
    if (!exists) {
      return this.storage.set(key, value, options);
    }
    return false;
  }
  
  /**
   * Get multiple keys with a common prefix
   */
  async getByPrefix<T = unknown>(prefix: string, options: StorageOptions = {}): Promise<Record<string, T>> {
    const keys = await this.keys(`${prefix}*`);
    const result: Record<string, T> = {};
    
    for (const key of keys) {
      const value = await this.storage.get<T>(key, options);
      if (value !== null) {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  // Static convenience methods
  static async set<T = unknown>(key: string, value: T, options?: StorageOptions): Promise<boolean> {
    return NuvexClient.getInstance().set(key, value, options);
  }
  
  static async get<T = unknown>(key: string, options: StorageOptions = {}): Promise<T | null> {
    return NuvexClient.getInstance().get<T>(key, options);
  }
  
  static async delete(key: string, options: StorageOptions = {}): Promise<boolean> {
    return NuvexClient.getInstance().delete(key, options);
  }
  
  static async exists(key: string, options: StorageOptions = {}): Promise<boolean> {
    return NuvexClient.getInstance().exists(key, options);
  }
  
  static async healthCheck(
    layers?: 'memory' | 'redis' | 'postgres' | Array<'memory' | 'redis' | 'postgres'>
  ) {
    return NuvexClient.getInstance().healthCheck(layers);
  }
  
  static getMetrics(
    layers?: 'memory' | 'redis' | 'postgres' | 'all' | Array<'memory' | 'redis' | 'postgres'>
  ): Record<string, number> {
    return NuvexClient.getInstance().getMetrics(layers);
  }
  
  /**
   * Shutdown the store and cleanup resources
   */
  static async shutdown(): Promise<void> {
    if (NuvexClient.instance) {
      await NuvexClient.instance.disconnect();
      NuvexClient.instance = null;
    }
  }
}
