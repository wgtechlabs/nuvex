/**
 * PostgreSQL Configurable Schema Tests
 * Tests for custom table and column name configuration
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import type { Mock } from 'bun:test';
import pg, { type Pool as PoolType } from 'pg';
import { PostgresStorage } from '../../layers/postgres';
import { generateNuvexSchemaSQL } from '../../core/database';
import type { PostgresSchemaConfig } from '../../types/index';
import { createMockPgPool } from '../mocks/postgres.mock';

describe('PostgreSQL Configurable Schema', () => {
  describe('generateNuvexSchemaSQL', () => {
    it('should generate default schema SQL', () => {
      const sql = generateNuvexSchemaSQL();
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS nuvex_storage');
      expect(sql).toContain('nuvex_key VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('nuvex_data JSONB NOT NULL');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_nuvex_storage_expires_at');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION update_nuvex_storage_updated_at()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION cleanup_expired_nuvex_storage()');
      expect(sql).not.toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      expect(sql).not.toContain('CREATE INDEX IF NOT EXISTS idx_nuvex_storage_key_pattern');
    });

    it('should generate trigram schema SQL only when enabled', () => {
      const sql = generateNuvexSchemaSQL(undefined, { enableTrigram: true });

      expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pg_trgm');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_nuvex_storage_key_pattern');
    });

    it('should reject invalid table names with SQL injection attempts', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage_cache; DROP TABLE users; --',
        columns: {
          key: 'key',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid table name');
    });

    it('should reject invalid column names with SQL injection attempts', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage_cache',
        columns: {
          key: 'key\' OR 1=1 --',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid key column name');
    });

    it('should accept valid identifiers with underscores and numbers', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage_cache_v2',
        columns: {
          key: 'cache_key_123',
          value: 'data_value_v1'
        }
      };
      
      const sql = generateNuvexSchemaSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS storage_cache_v2');
      expect(sql).toContain('cache_key_123 VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('data_value_v1 JSONB NOT NULL');
    });

    it('should reject empty string as table name', () => {
      const schema: PostgresSchemaConfig = {
        tableName: '',
        columns: {
          key: 'key',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid table name');
    });

    it('should reject empty string as column name', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage_cache',
        columns: {
          key: '',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid key column name');
    });

    it('should reject identifier starting with number', () => {
      const schema: PostgresSchemaConfig = {
        tableName: '123_storage',
        columns: {
          key: 'key',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid table name');
    });

    it('should reject column name starting with number', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage_cache',
        columns: {
          key: '1key',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid key column name');
    });

    it('should reject identifier with only special characters', () => {
      const schema: PostgresSchemaConfig = {
        tableName: '!!!',
        columns: {
          key: 'key',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid table name');
    });

    it('should reject identifier with spaces', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage cache',
        columns: {
          key: 'key',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid table name');
    });

    it('should reject identifier with hyphens', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage-cache',
        columns: {
          key: 'key',
          value: 'value'
        }
      };
      
      expect(() => generateNuvexSchemaSQL(schema)).toThrow('Invalid table name');
    });

    it('should accept identifier starting with underscore', () => {
      const schema: PostgresSchemaConfig = {
        tableName: '_storage_cache',
        columns: {
          key: '_key',
          value: '_value'
        }
      };
      
      const sql = generateNuvexSchemaSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS _storage_cache');
      expect(sql).toContain('_key VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('_value JSONB NOT NULL');
    });

    it('should generate custom schema SQL for Telegram bot', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage_cache',
        columns: {
          key: 'key',
          value: 'value'
        }
      };
      
      const sql = generateNuvexSchemaSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS storage_cache');
      expect(sql).toContain('key VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('value JSONB NOT NULL');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_storage_cache_expires_at');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION update_storage_cache_updated_at()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION cleanup_expired_storage_cache()');
    });

    it('should generate custom schema SQL for Discord bot', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'storage_cache',
        columns: {
          key: 'cache_key',
          value: 'data'
        }
      };
      
      const sql = generateNuvexSchemaSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS storage_cache');
      expect(sql).toContain('cache_key VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('data JSONB NOT NULL');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_storage_cache_expires_at');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION update_storage_cache_updated_at()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION cleanup_expired_storage_cache()');
    });

    it('should support partial schema configuration', () => {
      const schema: PostgresSchemaConfig = {
        tableName: 'my_storage'
      };
      
      const sql = generateNuvexSchemaSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS my_storage');
      expect(sql).toContain('nuvex_key VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('nuvex_data JSONB NOT NULL');
    });

    it('should support column-only configuration', () => {
      const schema: PostgresSchemaConfig = {
        columns: {
          key: 'my_key',
          value: 'my_value'
        }
      };
      
      const sql = generateNuvexSchemaSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS nuvex_storage');
      expect(sql).toContain('my_key VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('my_value JSONB NOT NULL');
    });
  });

  describe('PostgresStorage with custom schema', () => {
    // Mock the pg.Pool constructor
    let _poolMock: Mock<any>;
    
    beforeEach(() => {
      // Create a mock Pool constructor
      _poolMock = mock().mockImplementation(() => ({
        query: mock().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: mock().mockResolvedValue({
          query: mock().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: mock()
        }),
        end: mock()
      }));
    });

    it('should use default table and column names', async () => {
      const mockPool = {
        query: mock().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: mock().mockResolvedValue({
          query: mock().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: mock()
        }),
        end: mock()
      };
      
      const storage = new PostgresStorage(mockPool as unknown as PoolType);
      await storage.connect();
      
      // Test get operation
      await storage.get('test-key');
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM nuvex_storage'),
        expect.any(Array)
      );
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE nuvex_key = $1'),
        expect.any(Array)
      );
    });

    it('should use custom table name from schema config (Telegram bot)', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: {
          tableName: 'storage_cache'
        }
      };
      
      // Create storage instance
      const storage = new PostgresStorage(config);
      
      // Access private members to verify schema configuration
      expect((storage as any).tableName).toBe('storage_cache');
      expect((storage as any).keyColumn).toBe('nuvex_key');
      expect((storage as any).valueColumn).toBe('nuvex_data');
    });

    it('should use custom column names from schema config', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: {
          columns: {
            key: 'cache_key',
            value: 'data'
          }
        }
      };
      
      const storage = new PostgresStorage(config);
      
      // Access private members to verify schema configuration
      expect((storage as any).tableName).toBe('nuvex_storage');
      expect((storage as any).keyColumn).toBe('cache_key');
      expect((storage as any).valueColumn).toBe('data');
    });

    it('should use custom table and column names for Telegram bot', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: {
          tableName: 'storage_cache',
          columns: {
            key: 'key',
            value: 'value'
          }
        }
      };
      
      const storage = new PostgresStorage(config);
      
      // Access private members to verify schema configuration
      expect((storage as any).tableName).toBe('storage_cache');
      expect((storage as any).keyColumn).toBe('key');
      expect((storage as any).valueColumn).toBe('value');
    });

    it('should use custom table and column names for Discord bot', async () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: {
          tableName: 'storage_cache',
          columns: {
            key: 'cache_key',
            value: 'data'
          }
        }
      };
      
      const storage = new PostgresStorage(config);
      
      // Access private members to verify schema configuration
      expect((storage as any).tableName).toBe('storage_cache');
      expect((storage as any).keyColumn).toBe('cache_key');
      expect((storage as any).valueColumn).toBe('data');
    });

    it('should reject invalid table name in constructor', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: {
          tableName: 'storage; DROP TABLE users; --'
        }
      };
      
      expect(() => new PostgresStorage(config)).toThrow('Invalid table name');
    });

    it('should reject invalid column name in constructor', () => {
      const config = {
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: {
          columns: {
            key: 'key\' OR 1=1 --'
          }
        }
      };
      
      expect(() => new PostgresStorage(config)).toThrow('Invalid key column name');
    });
  });

  describe('PostgresStorage readiness and auto setup', () => {
    const poolConstructor = (pg as { Pool: Mock<() => PoolType> }).Pool;

    beforeEach(() => {
      poolConstructor.mockImplementation(() => createMockPgPool() as unknown as PoolType);
    });

    const createReadyPool = (options: {
      tableExists?: boolean;
      columns?: string[];
      createTableOnSetup?: boolean;
      failSelectWithMissingTable?: boolean;
    } = {}) => {
      let tableExists = options.tableExists ?? true;
      let currentTableName = 'nuvex_storage';
      const columns = options.columns ?? ['nuvex_key', 'nuvex_data'];

      const queryImpl = mock((sql: string, params?: unknown[]) => {
        if (sql === 'SELECT 1') {
          return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
        }

        if (sql.includes('CREATE TABLE IF NOT EXISTS')) {
          if (options.createTableOnSetup !== false) {
            tableExists = true;
          }
          const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
          if (match) {
            currentTableName = match[1];
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        if (options.failSelectWithMissingTable && sql.startsWith('SELECT') && sql.includes('expires_at')) {
          return Promise.reject(Object.assign(new Error(`relation "${currentTableName}" does not exist`), { code: '42P01' }));
        }

        return Promise.resolve({ rows: [], rowCount: 0, params });
      });

      const clientQuery = mock((sql: string, params?: unknown[]) => {
        if (sql === 'SELECT 1') {
          return Promise.resolve({ rows: [{ '?column?': 1 }], rowCount: 1 });
        }

        if (sql.includes('SELECT to_regclass')) {
          return Promise.resolve({
            rows: [{ table_name: tableExists ? (params?.[0] ?? currentTableName) : null }],
            rowCount: 1
          });
        }

        if (sql.includes('FROM information_schema.columns')) {
          return Promise.resolve({
            rows: columns.map((column_name) => ({ column_name })),
            rowCount: columns.length
          });
        }

        if (sql === 'BEGIN' || sql === 'ROLLBACK') {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }

        if (sql.includes('INSERT INTO')) {
          if (!tableExists) {
            return Promise.reject(Object.assign(new Error(`relation "${currentTableName}" does not exist`), { code: '42P01' }));
          }
          return Promise.resolve({ rows: [], rowCount: 1 });
        }

        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      return {
        query: queryImpl,
        connect: mock().mockResolvedValue({
          query: clientQuery,
          release: mock()
        }),
        end: mock()
      };
    };

    it('should report postgres not ready when connection succeeds but schema is missing', async () => {
      const logger = {
        debug: mock(),
        info: mock(),
        warn: mock(),
        error: mock()
      };
      const pool = createReadyPool({ tableExists: false });
      const storage = new PostgresStorage(pool as unknown as PoolType, logger);

      await storage.connect();

      expect(await storage.ping()).toBe(true);
      expect(await storage.isReady()).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'PostgreSQL L3: Nuvex schema is not ready - storage table is missing',
        expect.objectContaining({ tableName: 'nuvex_storage' })
      );
    });

    it('should auto setup schema and become ready on a fresh database', async () => {
      const pool = createReadyPool({ tableExists: false });
      poolConstructor.mockImplementation(() => pool);
      const storage = new PostgresStorage({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        autoSetupSchema: true
      });

      await storage.connect();

      expect(await storage.isReady()).toBe(true);
      await expect(storage.set('fresh:key', { ok: true })).resolves.toBeUndefined();
      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS nuvex_storage'));
    });

    it('should honor custom schema when auto setup is enabled', async () => {
      const pool = createReadyPool({ tableExists: false, columns: ['key', 'value'] });
      poolConstructor.mockImplementation(() => pool);
      const storage = new PostgresStorage({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        autoSetupSchema: true,
        schema: {
          tableName: 'storage_cache',
          columns: {
            key: 'key',
            value: 'value'
          }
        }
      });

      await storage.connect();

      expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS storage_cache'));
    });

    it('should treat mixed-case configured identifiers as ready when schema exists in lowercase', async () => {
      const pool = createReadyPool({
        tableExists: true,
        columns: ['cachekey', 'datavalue']
      });
      poolConstructor.mockImplementation(() => pool);
      const storage = new PostgresStorage({
        host: 'localhost',
        port: 5432,
        database: 'test',
        user: 'test',
        password: 'test',
        schema: {
          tableName: 'StorageCache',
          columns: {
            key: 'CacheKey',
            value: 'DataValue'
          }
        }
      });

      await storage.connect();

      expect(await storage.isReady()).toBe(true);
    });

    it('should log missing schema errors on get instead of silently treating them as cache misses', async () => {
      const logger = {
        debug: mock(),
        info: mock(),
        warn: mock(),
        error: mock()
      };
      const pool = createReadyPool({
        tableExists: true,
        failSelectWithMissingTable: true
      });
      const storage = new PostgresStorage(pool as unknown as PoolType, logger);

      await storage.connect();

      await expect(storage.get('missing:schema')).resolves.toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'PostgreSQL L3: get failed because the Nuvex schema is missing',
        expect.objectContaining({ key: 'missing:schema' })
      );
    });

    it('should downgrade repeated missing schema read logs after the first warning', async () => {
      const logger = {
        debug: mock(),
        info: mock(),
        warn: mock(),
        error: mock()
      };
      const pool = createReadyPool({
        tableExists: true,
        failSelectWithMissingTable: true
      });
      const storage = new PostgresStorage(pool as unknown as PoolType, logger);

      await storage.connect();

      await storage.get('missing:schema');
      await storage.get('missing:schema');

      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledWith(
        'PostgreSQL L3: get failed because the Nuvex schema is missing',
        expect.objectContaining({ key: 'missing:schema' })
      );
    });
  });
});
