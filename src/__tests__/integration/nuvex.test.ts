/**
 * Integration Tests
 * End-to-end tests that demonstrate the full SDK functionality
 */

import { NuvexClient } from '../../core/client.js';
import { StorageLayer } from '../../types/index.js';
import { MockRedisClient } from '../mocks/redis.mock.js';
import { MockPgPool } from '../mocks/postgres.mock.js';

// Mock the external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => new MockRedisClient())
}));

jest.mock('pg', () => ({
  Pool: jest.fn(() => new MockPgPool())
}));

describe('Nuvex SDK Integration Tests', () => {
  let client: NuvexClient;

  const config = {
    postgres: {
      host: 'localhost',
      port: 5432,
      database: 'test_db',
      user: 'test_user',
      password: 'test_pass'
    },
    redis: {
      url: 'redis://localhost:6379',
      ttl: 3600
    },
    memory: {
      ttl: 1800000, // 30 minutes
      maxSize: 1000,
      cleanupInterval: 60000
    },
    logging: {
      enabled: false
    }
  };

  beforeEach(async () => {
    client = new NuvexClient(config);
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });
  describe('Multi-layer Storage Workflow', () => {
    test('should demonstrate complete storage lifecycle', async () => {
      // 1. Store user data
      interface UserData {
        id: string;
        name: string;
        email: string;
        preferences: {
          theme: string;
          notifications: boolean;
        };
      }
      
      const userData: UserData = {
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      };

      // Store in all layers (default behavior)
      const stored = await client.set('user:123', userData);
      expect(stored).toBe(true);      // 2. Retrieve data (should come from memory first)
      const retrieved = await client.get<UserData>('user:123');
      expect(retrieved).toEqual(userData);

      // 3. Check existence
      const exists = await client.exists('user:123');
      expect(exists).toBe(true);

      // 4. Update data
      const updatedData = { ...userData, name: 'John Smith' };
      await client.set('user:123', updatedData);

      const updatedRetrieved = await client.get<UserData>('user:123');
      expect(updatedRetrieved?.name).toBe('John Smith');

      // 5. Store session data with TTL
      const sessionData = {
        userId: 'user123',
        token: 'abc123xyz',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };

      await client.set('session:abc123xyz', sessionData, { ttl: 3600 });

      // 6. Batch operations
      const batchData = [
        { operation: 'set' as const, key: 'cache:1', value: { data: 'value1' } },
        { operation: 'set' as const, key: 'cache:2', value: { data: 'value2' } },
        { operation: 'set' as const, key: 'cache:3', value: { data: 'value3' } }
      ];

      const batchResults = await client.setBatch(batchData);
      expect(batchResults.every(r => r.success)).toBe(true);

      // 7. Query operations
      const cacheKeys = await client.keys('cache:*');
      expect(cacheKeys).toHaveLength(3);

      // 8. Get metrics
      const metrics = client.getMetrics();
      expect(metrics.totalOperations).toBeGreaterThan(0);

      // 9. Health check
      const health = await client.healthCheck();
      expect(health.overall).toBe(true);

      // 10. Cleanup
      const deletedCount = await client.clear('cache:*');
      expect(deletedCount).toBe(3);
    });

    test('should handle layer-specific operations', async () => {
      const testData = { message: 'layer-specific test' };

      // Store in specific layers
      await client.set('memory:test', testData, { layer: StorageLayer.MEMORY });
      await client.set('redis:test', testData, { layer: StorageLayer.REDIS });
      await client.set('postgres:test', testData, { layer: StorageLayer.POSTGRES });

      // Retrieve from specific layers
      const memoryData = await client.get('memory:test', { layer: StorageLayer.MEMORY });
      const redisData = await client.get('redis:test', { layer: StorageLayer.REDIS });
      const postgresData = await client.get('postgres:test', { layer: StorageLayer.POSTGRES });

      expect(memoryData).toEqual(testData);
      expect(redisData).toEqual(testData);
      expect(postgresData).toEqual(testData);
    });

    test('should handle error scenarios gracefully', async () => {
      // Test with disconnected client
      await client.disconnect();

      const result = await client.set('test:error', { data: 'test' });
      expect(result).toBe(false);

      const retrieved = await client.get('test:error');
      expect(retrieved).toBeNull();
    });

    test('should demonstrate configuration updates', async () => {
      const initialConfig = client.getConfig();
      expect(initialConfig.memory?.ttl).toBe(1800000);

      // Update configuration
      await client.configure({
        memory: {
          ttl: 3600000, // 1 hour
          maxSize: 2000
        }
      });

      const updatedConfig = client.getConfig();
      expect(updatedConfig.memory?.ttl).toBe(3600000);
      expect(updatedConfig.memory?.maxSize).toBe(2000);
    });
  });
});
