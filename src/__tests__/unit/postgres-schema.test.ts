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
  });
});
