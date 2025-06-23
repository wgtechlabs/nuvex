/**
 * Test Fixtures
 * Sample data and configurations for tests
 */

import type { NuvexConfig } from '../../types/index.js';

export const mockRedisConfig = {
  url: 'redis://localhost:6379',
  host: 'localhost',
  port: 6379,
  db: 0
};

export const mockPostgresConfig = {
  host: 'localhost',
  port: 5432,
  database: 'test_db',
  user: 'test_user',
  password: 'test_pass'
};

export const mockNuvexConfig: NuvexConfig = {
  postgres: mockPostgresConfig,
  redis: mockRedisConfig,
  memory: {
    ttl: 3600000,
    maxSize: 1000,
    cleanupInterval: 60000
  },
  logging: {
    enabled: false
  }
};

export const sampleData = {
  user: {
    id: 'user_123',
    name: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date('2025-01-01T00:00:00Z')
  },
  
  session: {
    id: 'session_456',
    userId: 'user_123',
    token: 'abc123xyz',
    expiresAt: new Date('2025-12-31T23:59:59Z')
  },
  
  settings: {
    theme: 'dark',
    language: 'en',
    notifications: true,
    privacy: {
      analytics: false,
      marketing: false
    }
  }
};

export const sampleKeys = {
  user: 'user:123',
  session: 'session:456',
  settings: 'settings:user:123',
  cache: 'cache:temp:data',
  counter: 'counter:visits'
};

export const batchOperations = [
  {
    type: 'set' as const,
    key: 'batch:1',
    value: { data: 'first' },
    options: { ttl: 300 }
  },
  {
    type: 'set' as const,
    key: 'batch:2',
    value: { data: 'second' },
    options: { ttl: 600 }
  },
  {
    type: 'set' as const,
    key: 'batch:3',
    value: { data: 'third' }
  }
];

export const queryTestCases = [
  {
    description: 'Find by exact key',
    pattern: 'user:123',
    expectedKeys: ['user:123']
  },
  {
    description: 'Find by wildcard pattern',
    pattern: 'user:*',
    expectedKeys: ['user:123']
  },
  {
    description: 'Find by prefix',
    pattern: 'session:*',
    expectedKeys: ['session:456']
  }
];
