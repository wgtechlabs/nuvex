/**
 * PostgreSQL Configurable Schema Tests
 * Tests for custom table and column name configuration
 */

import { PostgresStorage } from '../../layers/postgres';
import { generateNuvexSchemaSQL } from '../../core/database';
import type { PostgresSchemaConfig } from '../../types/index';

describe('PostgreSQL Configurable Schema', () => {
  describe('generateNuvexSchemaSQL', () => {
    it('should generate default schema SQL', () => {
      const sql = generateNuvexSchemaSQL();
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS nuvex_storage');
      expect(sql).toContain('nuvex_key VARCHAR(512) NOT NULL UNIQUE');
      expect(sql).toContain('nuvex_data JSONB NOT NULL');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_nuvex_storage_expires_at');
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_nuvex_storage_key_pattern');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION update_nuvex_storage_updated_at()');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION cleanup_expired_nuvex_storage()');
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
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_storage_cache_key_pattern');
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
      expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_storage_cache_key_pattern');
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
    let PoolMock: jest.Mock;
    
    beforeEach(() => {
      // Create a mock Pool constructor
      PoolMock = jest.fn().mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn()
        }),
        end: jest.fn()
      }));
    });

    it('should use default table and column names', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn().mockResolvedValue({
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          release: jest.fn()
        }),
        end: jest.fn()
      };
      
      const storage = new PostgresStorage(mockPool);
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
});
