/**
 * Bun Test Preload
 * Registers module mocks before any test file imports are evaluated.
 * This is necessary because mock.module() hoisting only covers direct imports
 * in the test file, not transitive imports through source modules.
 */

import { mock } from 'bun:test';
import { MockRedisClient } from './mocks/redis.mock.js';
import { MockPgPool } from './mocks/postgres.mock.js';

mock.module('redis', () => ({
  createClient: mock(() => new MockRedisClient())
}));

mock.module('pg', () => {
  const Pool = mock(() => new MockPgPool());
  return {
    default: { Pool },
    Pool
  };
});
