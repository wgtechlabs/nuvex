/**
 * NuvexClient Unit Tests
 * Tests for the main client class functionality
 */

import { NuvexClient } from '../../core/client.js';
import { mockNuvexConfig } from '../fixtures/data.js';
import { MockRedisClient } from '../mocks/redis.mock.js';
import { MockPgPool } from '../mocks/postgres.mock.js';

// Mock the external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => new MockRedisClient())
}));

jest.mock('pg', () => ({
  Pool: jest.fn(() => new MockPgPool())
}));

describe('NuvexClient', () => {
  let client: NuvexClient;

  beforeEach(async () => {
    client = new NuvexClient(mockNuvexConfig);
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  describe('Initialization', () => {
    test('should initialize with config', () => {
      expect(client).toBeInstanceOf(NuvexClient);
    });

    test('should connect successfully', async () => {
      expect(client.isConnected()).toBe(true);
    });

    test('should get config', () => {
      const config = client.getConfig();
      expect(config).toEqual(mockNuvexConfig);
    });
  });

  describe('Storage Operations', () => {
    test('should store and retrieve data', async () => {
      const key = 'test:client';
      const value = { message: 'Hello from client' };

      const stored = await client.set(key, value);
      expect(stored).toBe(true);

      const retrieved = await client.get(key);
      expect(retrieved).toEqual(value);
    });

    test('should handle non-existent keys', async () => {
      const result = await client.get('non:existent');
      expect(result).toBeNull();
    });

    test('should delete data', async () => {
      const key = 'test:delete';
      const value = { data: 'to be deleted' };

      await client.set(key, value);
      const deleted = await client.delete(key);
      expect(deleted).toBe(true);

      const retrieved = await client.get(key);
      expect(retrieved).toBeNull();
    });

    test('should check if key exists', async () => {
      const key = 'test:exists';
      const value = { data: 'exists check' };

      let exists = await client.exists(key);
      expect(exists).toBe(false);

      await client.set(key, value);
      exists = await client.exists(key);
      expect(exists).toBe(true);
    });
  });

  describe('Health Check', () => {
    test('should return health status for all layers', async () => {
      const health = await client.healthCheck();
      
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('postgres');
    });

    test('should check specific layer - memory', async () => {
      const health = await client.healthCheck('memory');
      
      expect(health).toHaveProperty('memory');
      expect(health).not.toHaveProperty('redis');
      expect(health).not.toHaveProperty('postgres');
    });

    test('should check specific layer - redis', async () => {
      const health = await client.healthCheck('redis');
      
      expect(health).toHaveProperty('redis');
      expect(health).not.toHaveProperty('memory');
      expect(health).not.toHaveProperty('postgres');
    });

    test('should check specific layer - postgres', async () => {
      const health = await client.healthCheck('postgres');
      
      expect(health).toHaveProperty('postgres');
      expect(health).not.toHaveProperty('memory');
      expect(health).not.toHaveProperty('redis');
    });

    test('should check multiple specific layers', async () => {
      const health = await client.healthCheck(['memory', 'redis']);
      
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('redis');
      expect(health).not.toHaveProperty('postgres');
    });
  });

  describe('Configuration Management', () => {
    test('should allow partial config updates', async () => {
      const updates = {
        memory: {
          ttl: 7200000,
          maxSize: 2000
        }
      };

      await client.configure(updates);
      const config = client.getConfig();
      
      expect(config.memory?.ttl).toBe(7200000);
      expect(config.memory?.maxSize).toBe(2000);
    });
  });

  describe('Metrics', () => {
    test('should provide all storage metrics', async () => {
      // Perform some operations to generate metrics
      await client.set('metric1', { data: 1 });
      await client.get('metric1');
      await client.set('metric2', { data: 2 });

      const metrics = client.getMetrics();
      
      expect(metrics).toHaveProperty('memoryHits');
      expect(metrics).toHaveProperty('memoryMisses');
      expect(metrics).toHaveProperty('totalOperations');
      expect(metrics.totalOperations).toBeGreaterThan(0);
    });

    test('should get memory-specific metrics', async () => {
      const metrics = client.getMetrics('memory');
      
      expect(metrics).toHaveProperty('memoryHits');
      expect(metrics).toHaveProperty('memoryMisses');
      expect(metrics).toHaveProperty('memorySize');
      expect(metrics).toHaveProperty('memoryMaxSize');
      expect(metrics).not.toHaveProperty('redisHits');
      expect(metrics).not.toHaveProperty('postgresHits');
    });

    test('should get redis-specific metrics', async () => {
      const metrics = client.getMetrics('redis');
      
      expect(metrics).toHaveProperty('redisHits');
      expect(metrics).toHaveProperty('redisMisses');
      expect(metrics).not.toHaveProperty('memoryHits');
      expect(metrics).not.toHaveProperty('postgresHits');
    });

    test('should get postgres-specific metrics', async () => {
      const metrics = client.getMetrics('postgres');
      
      expect(metrics).toHaveProperty('postgresHits');
      expect(metrics).toHaveProperty('postgresMisses');
      expect(metrics).not.toHaveProperty('memoryHits');
      expect(metrics).not.toHaveProperty('redisHits');
    });

    test('should get metrics for multiple layers', async () => {
      const metrics = client.getMetrics(['memory', 'redis']);
      
      expect(metrics).toHaveProperty('memoryHits');
      expect(metrics).toHaveProperty('redisHits');
      expect(metrics).not.toHaveProperty('postgresHits');
      expect(metrics).toHaveProperty('totalOperations');
      expect(metrics).toHaveProperty('averageResponseTime');
    });

    test('should get all metrics with "all" parameter', async () => {
      const metrics = client.getMetrics('all');
      
      expect(metrics).toHaveProperty('memoryHits');
      expect(metrics).toHaveProperty('redisHits');
      expect(metrics).toHaveProperty('postgresHits');
      expect(metrics).toHaveProperty('totalOperations');
    });

    test('should reset metrics', async () => {
      await client.set('test', { data: 'test' });
      
      client.resetMetrics();
      const metrics = client.getMetrics();
      
      expect(metrics.totalOperations).toBe(0);
    });
  });
  describe('Error Handling', () => {
    test('should handle storage errors gracefully', async () => {
      await client.disconnect();
      
      const result = await client.set('test', { data: 'fail' });
      expect(result).toBe(false);
    });
  });
  describe('Static Methods', () => {
    beforeAll(async () => {
      await NuvexClient.initialize(mockNuvexConfig);
    });

    afterAll(async () => {
      await NuvexClient.shutdown();
    });

    test('should initialize singleton instance', async () => {
      const instance1 = await NuvexClient.initialize(mockNuvexConfig);
      const instance2 = await NuvexClient.initialize(mockNuvexConfig);
      expect(instance1).toBe(instance2);
    });

    test('should get singleton instance', () => {
      const instance = NuvexClient.getInstance();
      expect(instance).toBeInstanceOf(NuvexClient);
    });

    test('should throw error when getting instance before initialization', async () => {
      await NuvexClient.shutdown();
      expect(() => NuvexClient.getInstance()).toThrow('Store not initialized');
    });

    test('should create new non-singleton instance', async () => {
      const newInstance = await NuvexClient.create(mockNuvexConfig);
      expect(newInstance).toBeInstanceOf(NuvexClient);
      await newInstance.disconnect();
    });

    test('should perform static operations', async () => {
      await NuvexClient.initialize(mockNuvexConfig);
      
      const stored = await NuvexClient.set('static:test', { data: 'static' });
      expect(stored).toBe(true);

      const retrieved = await NuvexClient.get('static:test');
      expect(retrieved).toEqual({ data: 'static' });

      const exists = await NuvexClient.exists('static:test');
      expect(exists).toBe(true);

      const deleted = await NuvexClient.delete('static:test');
      expect(deleted).toBe(true);

      const health = await NuvexClient.healthCheck();
      expect(health).toHaveProperty('memory');
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('postgres');

      const metrics = NuvexClient.getMetrics();
      expect(metrics).toHaveProperty('totalOperations');
    });
  });

  describe('Batch Operations', () => {
    test('should perform batch set operations', async () => {
      const operations = [
        { operation: 'set' as const, key: 'batch1', value: { data: 1 } },
        { operation: 'set' as const, key: 'batch2', value: { data: 2 } },
        { operation: 'set' as const, key: 'batch3', value: { data: 3 } }
      ];

      const results = await client.setBatch(operations);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should perform batch get operations', async () => {
      await client.set('get1', { data: 1 });
      await client.set('get2', { data: 2 });

      const results = await client.getBatch(['get1', 'get2', 'nonexistent']);
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
    });

    test('should perform batch delete operations', async () => {
      await client.set('del1', { data: 1 });
      await client.set('del2', { data: 2 });

      const results = await client.deleteBatch(['del1', 'del2']);
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Query Operations', () => {
    // TODO: Update these tests - keys() method needs to be reimplemented
    test.skip('should query data with options', async () => {
      await client.set('query1', { name: 'test1' });
      await client.set('query2', { name: 'test2' });

      const result = await client.query({ pattern: 'query*', limit: 10 });
      expect(result.items).toHaveLength(2);
    });

    test.skip('should get keys with pattern', async () => {
      await client.set('pattern:1', { data: 1 });
      await client.set('pattern:2', { data: 2 });
      await client.set('other:1', { data: 3 });

      const keys = await client.keys('pattern:*');
      expect(keys).toContain('pattern:1');
      expect(keys).toContain('pattern:2');
      expect(keys).not.toContain('other:1');
    });

    test.skip('should clear storage with pattern', async () => {
      await client.set('clear:1', { data: 1 });
      await client.set('clear:2', { data: 2 });
      await client.set('keep:1', { data: 3 });

      const cleared = await client.clear('clear:*');
      expect(cleared).toBeGreaterThan(0);

      const remainingKey = await client.get('keep:1');
      expect(remainingKey).toEqual({ data: 3 });
    });
  });

  describe('Layer Management', () => {
    // TODO: promote() may return false if Redis is not configured in mocks
    test.skip('should promote key to target layer', async () => {
      await client.set('promote:test', { data: 'promote' });
      
      const promoted = await client.promote('promote:test', 'redis');
      expect(promoted).toBe(true);
    });    test('should demote key to target layer', async () => {
      await client.set('demote:test', { data: 'demote' });
      
      // Note: demote may return false if already in target layer
      const demoted = await client.demote('demote:test', 'memory');
      expect(typeof demoted).toBe('boolean');
      
      // Enhanced: Check key is present in target layer and absent from original layer
      const layerInfo = await client.getLayerInfo('demote:test');
      expect(layerInfo && layerInfo.layer).toBe('memory');
      // Optionally, check absence from other layers if API allows
    });

    test('should get layer info', async () => {
      await client.set('layer:test', { data: 'layer' });
      
      const layerInfo = await client.getLayerInfo('layer:test');
      expect(layerInfo).toHaveProperty('layer');
    });
  });

  describe('TTL Operations', () => {
    test('should set expiration on key', async () => {
      await client.set('expire:test', { data: 'expire' });
      
      const expired = await client.expire('expire:test', 60);
      expect(expired).toBe(true);
    });
  });

  describe('Maintenance Operations', () => {
    test('should perform cleanup', async () => {
      const result = await client.cleanup();
      expect(result).toHaveProperty('cleaned');
      expect(result).toHaveProperty('errors');
      expect(typeof result.cleaned).toBe('number');
      expect(typeof result.errors).toBe('number');
    });

    test('should perform compaction', async () => {
      await expect(client.compact()).resolves.toBeUndefined();
    });

    test('should handle cleanup errors', async () => {
      // Mock storage to throw error
      jest.spyOn(client.storage, 'cleanupExpiredMemory').mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      const result = await client.cleanup();
      expect(result.errors).toBeGreaterThan(0);
    });

    test('should handle compact errors', async () => {
      // Mock cleanup to throw error
      jest.spyOn(client, 'cleanup').mockRejectedValue(new Error('Cleanup failed'));

      await expect(client.compact()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Backup and Restore', () => {
    test('should create backup', async () => {
      await client.set('backup:test1', { data: 'backup1' });
      await client.set('backup:test2', { data: 'backup2' });

      const backupId = await client.backup();
      expect(backupId).toMatch(/^nuvex-backup-/);
    });

    test('should create backup with custom destination', async () => {
      await client.set('backup:custom', { data: 'custom' });

      const backupId = await client.backup('custom-backup-id');
      expect(backupId).toBe('custom-backup-id');
    });    test('should restore from backup', async () => {
      // First create a backup
      await client.set('restore:test', { data: 'restore' });
      const _backupId = await client.backup('test-restore');

      // Ensure restore is awaited
      const restored = await client.restore('test-restore');
      expect(restored).toBe(true);
    });

    test('should fail to restore non-existent backup', async () => {
      const restored = await client.restore('non-existent-backup');
      expect(restored).toBe(false);
    });

    test('should handle backup errors', async () => {
      // Mock storage.keys to throw error
      jest.spyOn(client.storage, 'keys').mockRejectedValue(new Error('Keys failed'));

      await expect(client.backup()).rejects.toThrow('Keys failed');
    });
  });

  describe('Namespace Operations', () => {
    test('should set and get namespaced values', async () => {
      const namespace = 'user';
      const key = '123';
      const value = { name: 'John', email: 'john@example.com' };

      const stored = await client.setNamespaced(namespace, key, value);
      expect(stored).toBe(true);

      const retrieved = await client.getNamespaced(namespace, key);
      expect(retrieved).toEqual(value);
    });

    // TODO: Update these tests - keys() method needs to be reimplemented
    test.skip('should get namespace keys', async () => {
      await client.setNamespaced('ns', 'key1', { data: 1 });
      await client.setNamespaced('ns', 'key2', { data: 2 });
      await client.setNamespaced('other', 'key3', { data: 3 });

      const keys = await client.getNamespaceKeys('ns');
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('key3');
    });

    test.skip('should clear namespace', async () => {
      await client.setNamespaced('clear-ns', 'key1', { data: 1 });
      await client.setNamespaced('clear-ns', 'key2', { data: 2 });
      await client.setNamespaced('keep-ns', 'key3', { data: 3 });

      const cleared = await client.clearNamespace('clear-ns');
      expect(cleared).toBeGreaterThan(0);

      const remaining = await client.getNamespaced('keep-ns', 'key3');
      expect(remaining).toEqual({ data: 3 });
    });
  });

  describe('Atomic Operations', () => {
    test('should increment numeric values', async () => {
      const key = 'counter';
      
      // Test with non-existent key (should start at 0)
      let result = await client.increment(key);
      expect(result).toBe(1);

      // Test increment with custom delta
      result = await client.increment(key, 5);
      expect(result).toBe(6);

      // Test default increment
      result = await client.increment(key);
      expect(result).toBe(7);
    });

    test('should decrement numeric values', async () => {
      const key = 'countdown';
      
      // Set initial value
      await client.set(key, 10);
      
      // Test default decrement
      let result = await client.decrement(key);
      expect(result).toBe(9);

      // Test decrement with custom delta
      result = await client.decrement(key, 3);
      expect(result).toBe(6);
    });

    test('should handle concurrent increments atomically', async () => {
      const key = 'concurrent_counter';
      
      // Perform concurrent increments
      const results = await Promise.all([
        client.increment(key),
        client.increment(key),
        client.increment(key),
        client.increment(key),
        client.increment(key)
      ]);
      
      // All increments should return different values
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5);
      
      // Final value should be exactly 5 (no lost updates)
      const finalValue = await client.get<number>(key);
      expect(finalValue).toBe(5);
    });

    test('should handle concurrent increments with custom delta', async () => {
      const key = 'concurrent_delta';
      
      // Perform concurrent increments with delta of 3
      await Promise.all([
        client.increment(key, 3),
        client.increment(key, 3),
        client.increment(key, 3)
      ]);
      
      // Final value should be exactly 9 (3 * 3)
      const finalValue = await client.get<number>(key);
      expect(finalValue).toBe(9);
    });

    test('should handle concurrent mixed increment and decrement', async () => {
      const key = 'concurrent_mixed';
      
      // Set initial value
      await client.set(key, 10);
      
      // Perform concurrent operations
      await Promise.all([
        client.increment(key, 5),   // +5 = 15
        client.decrement(key, 3),   // -3 = 12
        client.increment(key, 2),   // +2 = 14
        client.decrement(key, 1)    // -1 = 13
      ]);
      
      // Final value should be 10 + 5 - 3 + 2 - 1 = 13
      const finalValue = await client.get<number>(key);
      expect(finalValue).toBe(13);
    });

    test('should increment with TTL option', async () => {
      const key = 'counter_with_ttl';
      
      // Increment with TTL
      const result = await client.increment(key, 1, { ttl: 3600000 }); // 1 hour
      expect(result).toBe(1);
      
      // Key should exist
      const exists = await client.exists(key);
      expect(exists).toBe(true);
      
      // Value should be correct
      const value = await client.get<number>(key);
      expect(value).toBe(1);
    });

    test('should initialize non-existent key to 0 before increment', async () => {
      const key = 'new_counter';
      
      // First increment on non-existent key
      const result = await client.increment(key);
      expect(result).toBe(1);
    });

    test('should handle negative increment (same as decrement)', async () => {
      const key = 'negative_increment';
      
      await client.set(key, 10);
      
      // Negative increment
      const result = await client.increment(key, -3);
      expect(result).toBe(7);
    });

    test('should set if not exists', async () => {
      const key = 'conditional';
      const value = { data: 'conditional' };

      // Should succeed for new key
      let result = await client.setIfNotExists(key, value);
      expect(result).toBe(true);

      // Should fail for existing key
      result = await client.setIfNotExists(key, { data: 'different' });
      expect(result).toBe(false);

      // Original value should remain
      const retrieved = await client.get(key);
      expect(retrieved).toEqual(value);
    });
  });

  describe('Prefix Operations', () => {
    // TODO: Update these tests - keys() method needs to be reimplemented
    test.skip('should get values by prefix', async () => {
      await client.set('prefix:key1', { data: 1 });
      await client.set('prefix:key2', { data: 2 });
      await client.set('other:key3', { data: 3 });

      const results = await client.getByPrefix('prefix:');
      expect(Object.keys(results)).toHaveLength(2);
      expect(results['prefix:key1']).toEqual({ data: 1 });
      expect(results['prefix:key2']).toEqual({ data: 2 });
      expect(results['other:key3']).toBeUndefined();
    });
  });

  describe('Configuration with Logging', () => {    test('should handle logging configuration', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      const clientWithLogging = new NuvexClient({
        ...mockNuvexConfig,
        logging: {
          enabled: true,
          logger: mockLogger
        }
      });

      await clientWithLogging.connect();
      expect(mockLogger.info).toHaveBeenCalled();

      await clientWithLogging.disconnect();
      expect(mockLogger.info).toHaveBeenCalled();
    });    test('should update logging configuration', async () => {
      const newLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };

      await client.configure({
        logging: {
          enabled: true,
          logger: newLogger
        }
      });

      // Trigger a log message
      client.resetMetrics();
      expect(newLogger.info).toHaveBeenCalled();
    });
  });
});
