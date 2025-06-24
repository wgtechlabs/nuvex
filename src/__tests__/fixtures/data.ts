/**
 * Test Fixtures
 * Sample data and configurations for tests
 * 
 * IMPORTANT: This file contains test data only.
 * All configurations use secure environment-based settings with zero hardcoded credentials.
 * 
 * @fileoverview Test fixtures with zero hardcoded credentials
 */

import type { NuvexConfig } from '../../types/index.js';
import { getTestConfig, getTestRedisConfig, getTestPostgresConfig } from './config.js';

// Use environment-based configuration to avoid hardcoded credentials
export const mockRedisConfig = getTestRedisConfig();

export const mockPostgresConfig = getTestPostgresConfig();

export const mockNuvexConfig: NuvexConfig = getTestConfig();

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
