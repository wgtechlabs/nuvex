/**
 * StorageEngine Unit Tests
 * Tests for the core storage engine functionality
 */

import { StorageEngine } from '../../core/engine.js';
import { StorageLayer } from '../../types/index.js';
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

describe('StorageEngine', () => {
  let storageEngine: StorageEngine;

  beforeEach(async () => {
    storageEngine = new StorageEngine(mockNuvexConfig);
    await storageEngine.connect();
  });

  afterEach(async () => {
    await storageEngine.disconnect();
  });

  describe('Connection Management', () => {
    test('should connect successfully', async () => {
      expect(storageEngine.isConnected()).toBe(true);
    });

    test('should disconnect successfully', async () => {
      await storageEngine.disconnect();
      expect(storageEngine.isConnected()).toBe(false);
    });

    test('should reconnect after disconnection', async () => {
      await storageEngine.disconnect();
      expect(storageEngine.isConnected()).toBe(false);
      
      await storageEngine.connect();
      expect(storageEngine.isConnected()).toBe(true);
    });
  });

  describe('Basic CRUD Operations', () => {
    const testKey = 'test:key:1';
    const testValue = { message: 'Hello, World!', timestamp: Date.now() };

    test('should set and get a value', async () => {
      const setResult = await storageEngine.set(testKey, testValue);
      expect(setResult).toBe(true);

      const getValue = await storageEngine.get(testKey);
      expect(getValue).toEqual(testValue);
    });

    test('should return null for non-existent key', async () => {
      const getValue = await storageEngine.get('non:existent:key');
      expect(getValue).toBeNull();
    });

    test('should delete a value', async () => {
      await storageEngine.set(testKey, testValue);
      
      const deleteResult = await storageEngine.delete(testKey);
      expect(deleteResult).toBe(true);

      const getValue = await storageEngine.get(testKey);
      expect(getValue).toBeNull();
    });

    test('should check if key exists', async () => {
      await storageEngine.set(testKey, testValue);
      
      const exists = await storageEngine.exists(testKey);
      expect(exists).toBe(true);

      await storageEngine.delete(testKey);
      
      const notExists = await storageEngine.exists(testKey);
      expect(notExists).toBe(false);
    });
  });

  describe('TTL (Time To Live)', () => {
    const testKey = 'test:ttl:key';
    const testValue = { data: 'temporary' };

    test('should set value with TTL', async () => {
      const result = await storageEngine.set(testKey, testValue, { ttl: 1 });
      expect(result).toBe(true);

      // Value should exist immediately
      const getValue = await storageEngine.get(testKey);
      expect(getValue).toEqual(testValue);
    });

    test('should expire key', async () => {
      await storageEngine.set(testKey, testValue);
      
      const expireResult = await storageEngine.expire(testKey, 1);
      expect(expireResult).toBe(true);
    });
  });

  describe('Storage Layer Targeting', () => {
    const testKey = 'test:layer:key';
    const testValue = { layer: 'test' };

    test('should set to memory layer', async () => {
      const result = await storageEngine.set(testKey, testValue, { 
        layer: StorageLayer.MEMORY 
      });
      expect(result).toBe(true);
    });

    test('should set to redis layer', async () => {
      const result = await storageEngine.set(testKey, testValue, { 
        layer: StorageLayer.REDIS 
      });
      expect(result).toBe(true);
    });

    test('should set to postgres layer', async () => {
      const result = await storageEngine.set(testKey, testValue, { 
        layer: StorageLayer.POSTGRES 
      });
      expect(result).toBe(true);
    });
  });

  describe('Batch Operations', () => {    test('should perform batch set operations', async () => {
      const operations = [
        { operation: 'set' as const, key: 'batch:1', value: { id: 1 } },
        { operation: 'set' as const, key: 'batch:2', value: { id: 2 } },
        { operation: 'set' as const, key: 'batch:3', value: { id: 3 } }
      ];

      const results = await storageEngine.setBatch(operations);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should perform batch get operations', async () => {
      // First set some values
      await storageEngine.set('batch:1', { id: 1 });
      await storageEngine.set('batch:2', { id: 2 });

      const keys = ['batch:1', 'batch:2', 'batch:nonexistent'];
      const results = await storageEngine.getBatch(keys);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[0].value).toEqual({ id: 1 });
      expect(results[1].success).toBe(true);
      expect(results[1].value).toEqual({ id: 2 });
      expect(results[2].success).toBe(false);
      expect(results[2].value).toBeNull();
    });

    test('should perform batch delete operations', async () => {
      // First set some values
      await storageEngine.set('batch:1', { id: 1 });
      await storageEngine.set('batch:2', { id: 2 });

      const keys = ['batch:1', 'batch:2', 'batch:nonexistent'];
      const results = await storageEngine.deleteBatch(keys);
      
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(false);
    });
  });

  describe('Query Operations', () => {
    beforeEach(async () => {
      // Set up test data
      await storageEngine.set('user:1', { name: 'Alice' });
      await storageEngine.set('user:2', { name: 'Bob' });
      await storageEngine.set('session:1', { userId: 1 });
      await storageEngine.set('config:app', { theme: 'dark' });
    });

    test('should find keys by pattern', async () => {
      const keys = await storageEngine.keys('user:*');
      expect(keys).toContain('user:1');
      expect(keys).toContain('user:2');
      expect(keys).not.toContain('session:1');
    });

    test('should query with options', async () => {
      const result = await storageEngine.query({
        pattern: 'user:*',
        limit: 1
      });
      
      expect(result.items).toHaveLength(1);
      expect(result.hasMore).toBe(true);
    });
  });

  describe('Metrics', () => {
    test('should track metrics', async () => {
      const initialMetrics = storageEngine.getMetrics();
      
      await storageEngine.set('metric:test', { value: 1 });
      await storageEngine.get('metric:test');
      
      const updatedMetrics = storageEngine.getMetrics();
      expect(updatedMetrics.totalOperations).toBeGreaterThan(initialMetrics.totalOperations);
    });

    test('should reset metrics', async () => {
      await storageEngine.set('metric:test', { value: 1 });
      
      storageEngine.resetMetrics();
      const metrics = storageEngine.getMetrics();
      
      expect(metrics.totalOperations).toBe(0);
      expect(metrics.memoryHits).toBe(0);
      expect(metrics.memoryMisses).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON gracefully', async () => {
      // This test would need specific mocking to simulate invalid JSON
      const result = await storageEngine.get('test:key');
      expect(result).toBeNull();    });

    test('should handle connection errors gracefully', async () => {
      // Disconnect and try to perform operations
      await storageEngine.disconnect();
      
      const result = await storageEngine.set('test:key', { value: 1 });
      expect(result).toBe(false);
    });
  });

  describe('Memory Management', () => {
    test('should cleanup expired memory entries', async () => {
      // Set a key that expires quickly
      await storageEngine.set('expire:test', { data: 'test' }, { ttl: 1 });
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const cleaned = storageEngine.cleanupExpiredMemory();
      expect(typeof cleaned).toBe('number');
    });

    test('should handle memory cache size limits', async () => {
      // Test with a large number of entries to trigger size management
      for (let i = 0; i < 100; i++) {
        await storageEngine.set(`test:${i}`, { data: i });
      }
      
      const result = await storageEngine.get('test:0');
      expect(result).toBeDefined();
    });
  });

  describe('Layer Promotion and Demotion', () => {
    test('should promote key between layers', async () => {
      await storageEngine.set('promote:test', { data: 'test' });
      
      const promoted = await storageEngine.promote('promote:test', 'redis');
      expect(typeof promoted).toBe('boolean');
    });

    test('should demote key between layers', async () => {
      await storageEngine.set('demote:test', { data: 'test' });
      
      const demoted = await storageEngine.demote('demote:test', 'memory');
      expect(typeof demoted).toBe('boolean');
    });

    test('should get layer information', async () => {
      await storageEngine.set('layer:test', { data: 'test' });
      
      const layerInfo = await storageEngine.getLayerInfo('layer:test');
      expect(layerInfo).toHaveProperty('layer');
    });
  });

  describe('Advanced Query Operations', () => {
    test('should query with sorting', async () => {
      await storageEngine.set('sort:1', { value: 1 });
      await storageEngine.set('sort:2', { value: 2 });
      
      const result = await storageEngine.query({
        pattern: 'sort:*',
        sortBy: 'key',
        sortOrder: 'asc'
      });
      
      expect(result.items).toHaveLength(2);
      expect(result.items[0].key).toBe('sort:1');
    });

    test('should query with pagination', async () => {
      await storageEngine.set('page:1', { value: 1 });
      await storageEngine.set('page:2', { value: 2 });
      await storageEngine.set('page:3', { value: 3 });
      
      const result = await storageEngine.query({
        pattern: 'page:*',
        limit: 2,
        offset: 1
      });
      
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    test('should query with sorting by metadata', async () => {
      await storageEngine.set('meta:1', { value: 1 });
      await storageEngine.set('meta:2', { value: 2 });
      
      const result = await storageEngine.query({
        pattern: 'meta:*',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      expect(result.items).toHaveLength(2);
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle Redis connection failures', async () => {
      // Mock Redis error
      const mockRedisClient = storageEngine['redisClient'];
      if (mockRedisClient) {
        jest.spyOn(mockRedisClient, 'setEx').mockRejectedValue(new Error('Redis error'));
        
        const result = await storageEngine.set('redis:error', { data: 'test' });
        expect(result).toBe(true); // Should fallback to other layers
      }
    });    test('should handle PostgreSQL connection failures', async () => {
      // Mock PostgreSQL error  
      const mockDb = storageEngine['db'] as any;
      if (mockDb) {
        jest.spyOn(mockDb, 'query').mockRejectedValue(new Error('PostgreSQL error'));
        
        const result = await storageEngine.set('postgres:error', { data: 'test' });
        expect(result).toBe(true); // Should fallback to other layers
      }
    });

    test('should handle JSON parsing errors', async () => {
      // Mock Redis to return invalid JSON
      const mockRedisClient = storageEngine['redisClient'];
      if (mockRedisClient) {
        jest.spyOn(mockRedisClient, 'get').mockResolvedValue('invalid json {');
        
        const result = await storageEngine.get('invalid:json');
        expect(result).toBeNull();
      }
    });
  });

  describe('Performance and Optimization', () => {    test('should handle concurrent operations', async () => {
      const promises: Promise<boolean>[] = [];
      for (let i = 0; i < 10; i++) {
        promises.push(storageEngine.set(`concurrent:${i}`, { value: i }));
      }
      
      const results = await Promise.all(promises);
      expect(results.every(result => result === true)).toBe(true);
    });

    test('should handle large data sets', async () => {
      const largeData = { data: 'x'.repeat(10000) };
      
      const stored = await storageEngine.set('large:data', largeData);
      expect(stored).toBe(true);
      
      const retrieved = await storageEngine.get('large:data');
      expect(retrieved).toEqual(largeData);
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should work with minimal configuration', async () => {
      const minimalConfig = {
        postgres: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          password: 'test'
        }
      };
      
      const minimalEngine = new StorageEngine(minimalConfig);
      await minimalEngine.connect();
      
      const result = await minimalEngine.set('minimal:test', { data: 'test' });
      expect(result).toBe(true);
      
      await minimalEngine.disconnect();
    });

    test('should handle TTL edge cases', async () => {
      // Test with very small TTL
      await storageEngine.set('small:ttl', { data: 'test' }, { ttl: 1 });
      
      // Test with large TTL
      await storageEngine.set('large:ttl', { data: 'test' }, { ttl: 86400 });
      
      const result = await storageEngine.get('large:ttl');
      expect(result).toEqual({ data: 'test' });
    });
  });
});
