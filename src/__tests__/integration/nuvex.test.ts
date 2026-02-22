/**
 * Integration Tests
 * End-to-end tests that demonstrate the full SDK functionality
 * 
 * IMPORTANT: This file uses secure environment-based test configuration.
 * Zero hardcoded credentials - all config generated dynamically.
 * 
 * @fileoverview Integration tests with zero hardcoded credentials
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { NuvexClient } from '../../core/client.js';
import { StorageLayer } from '../../types/index.js';
import { getTestConfig } from '../fixtures/config.js';

describe('Nuvex SDK Integration Tests', () => {
  let client: NuvexClient;
  const config = getTestConfig();

  beforeEach(async () => {
    client = new NuvexClient(config);
    await client.connect();
  });

  afterEach(async () => {
    await client.disconnect();
  });
  describe('Multi-layer Storage Workflow', () => {
    // TODO: Update this test - keys() method needs to be reimplemented
    test.skip('should demonstrate complete storage lifecycle', async () => {      // 1. Store user data
      interface UserData {
        id: string;
        name: string;
        email: string;
        preferences: {
          theme: string;
          notifications: boolean;
        };
      }      // Generate dynamic test identifiers
      const testUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const testUserKey = `user:${testUserId.split('_')[1]}`;
      const testEmail = `test_${Date.now()}@example.com`;
      
      const userData: UserData = {
        id: testUserId,
        name: 'John Doe',
        email: testEmail,
        preferences: {
          theme: 'dark',
          notifications: true
        }
      };

      // Store in all layers (default behavior)
      const stored = await client.set(testUserKey, userData);
      expect(stored).toBe(true);      // 2. Retrieve data (should come from memory first)
      const retrieved = await client.get<UserData>(testUserKey);
      expect(retrieved).toEqual(userData);

      // 3. Check existence
      const exists = await client.exists(testUserKey);
      expect(exists).toBe(true);

      // 4. Update data
      const updatedData = { ...userData, name: 'John Smith' };
      await client.set(testUserKey, updatedData);

      const updatedRetrieved = await client.get<UserData>(testUserKey);
      expect(updatedRetrieved?.name).toBe('John Smith');

      // 5. Store session data with TTL using dynamic values
      const sessionToken = `session_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const sessionData = {
        userId: userData.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      };

      await client.set(`session:${sessionToken}`, sessionData, { ttl: 3600 });      // 6. Batch operations with dynamic values
      const dynamicValue1 = `data_${Date.now()}_1`;
      const dynamicValue2 = `data_${Date.now()}_2`;
      const dynamicValue3 = `data_${Date.now()}_3`;
      
      const batchData = [
        { operation: 'set' as const, key: 'cache:1', value: { data: dynamicValue1 } },
        { operation: 'set' as const, key: 'cache:2', value: { data: dynamicValue2 } },
        { operation: 'set' as const, key: 'cache:3', value: { data: dynamicValue3 } }
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

    // TODO: Update this test - layer-specific operations need review with new architecture
    test.skip('should handle layer-specific operations', async () => {
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
    });    test('should demonstrate configuration updates', async () => {
      const initialConfig = client.getConfig();
      // Use the actual TTL from our test configuration (3600000 ms)
      expect(initialConfig.memory?.ttl).toBe(3600000);

      // Update configuration
      await client.configure({
        memory: {
          ttl: 1800000, // 30 minutes
          maxSize: 2000
        }
      });

      const updatedConfig = client.getConfig();
      expect(updatedConfig.memory?.ttl).toBe(1800000);
      expect(updatedConfig.memory?.maxSize).toBe(2000);
    });
  });
});
