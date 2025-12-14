/**
 * Database Utilities Tests
 * Tests for database schema setup and cleanup functions
 */

import {
  setupNuvexSchema,
  cleanupExpiredEntries,
  dropNuvexSchema,
  NUVEX_SCHEMA_SQL,
  SchemaSetupOptions
} from '../../core/database';
import { createMockPgPool } from '../mocks/postgres.mock';

describe('Database Utilities', () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = createMockPgPool();
    // Mock console methods to avoid test output noise
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('NUVEX_SCHEMA_SQL', () => {
    it('should contain the complete schema definition', () => {
      expect(NUVEX_SCHEMA_SQL).toContain('CREATE TABLE IF NOT EXISTS nuvex_storage');
      expect(NUVEX_SCHEMA_SQL).toContain('id SERIAL PRIMARY KEY');
      expect(NUVEX_SCHEMA_SQL).toContain('nuvex_key VARCHAR(512) NOT NULL UNIQUE');
      expect(NUVEX_SCHEMA_SQL).toContain('nuvex_data JSONB NOT NULL');
      expect(NUVEX_SCHEMA_SQL).toContain('expires_at TIMESTAMP WITH TIME ZONE');
      expect(NUVEX_SCHEMA_SQL).toContain('idx_nuvex_storage_expires_at');
      expect(NUVEX_SCHEMA_SQL).toContain('update_nuvex_storage_updated_at');
      expect(NUVEX_SCHEMA_SQL).toContain('cleanup_expired_nuvex_storage');
    });
  });

  describe('setupNuvexSchema', () => {
    it('should execute schema setup with default options', async () => {
      const querySpy = jest.spyOn(mockDb, 'query');

      await setupNuvexSchema(mockDb);

      expect(querySpy).toHaveBeenCalledWith(NUVEX_SCHEMA_SQL);
      expect(console.log).toHaveBeenCalledWith('Nuvex database schema setup completed successfully');
    });

    it('should enable trigram extension when requested', async () => {
      const querySpy = jest.spyOn(mockDb, 'query');
      const options: SchemaSetupOptions = { enableTrigram: true };

      await setupNuvexSchema(mockDb, options);

      expect(querySpy).toHaveBeenCalledWith('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      expect(querySpy).toHaveBeenCalledWith(NUVEX_SCHEMA_SQL);
    });    it('should setup cleanup job when requested', async () => {
      const querySpy = jest.spyOn(mockDb, 'query');
      // Make the cron job query fail to trigger the error
      querySpy.mockImplementation((...args: unknown[]) => {
        const sql = args[0] as string;
        if (sql.includes('cron.schedule')) {
          return Promise.reject(new Error('pg_cron extension not available'));
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      });
      
      const options: SchemaSetupOptions = { enableCleanupJob: true };

      // Should throw an error when cron job setup fails
      await expect(setupNuvexSchema(mockDb, options)).rejects.toThrow('pg_cron extension not available');

      expect(querySpy).toHaveBeenCalledWith(NUVEX_SCHEMA_SQL);
      // Should attempt to setup cron job (will fail in mock, as expected)
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining('cron.schedule'),
        expect.arrayContaining([expect.stringMatching(/nuvex-cleanup-\d+/)])
      );
    });

    it('should handle schema setup errors', async () => {
      const error = new Error('Database connection failed');
      jest.spyOn(mockDb, 'query').mockRejectedValue(error);

      await expect(setupNuvexSchema(mockDb)).rejects.toThrow('Database connection failed');
      expect(console.error).toHaveBeenCalledWith('Failed to setup Nuvex database schema:', error);
    });

    it('should handle both options together', async () => {
      const querySpy = jest.spyOn(mockDb, 'query');
      const options: SchemaSetupOptions = { 
        enableTrigram: true, 
        enableCleanupJob: true 
      };

      await setupNuvexSchema(mockDb, options);      expect(querySpy).toHaveBeenCalledWith('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
      expect(querySpy).toHaveBeenCalledWith(NUVEX_SCHEMA_SQL);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining('cron.schedule'),
        expect.arrayContaining([expect.stringMatching(/nuvex-cleanup-\d+/)])
      );
    });
  });

  describe('cleanupExpiredEntries', () => {
    it('should return number of deleted entries', async () => {
      const mockResult = { rows: [{ deleted_count: 5 }] };
      jest.spyOn(mockDb, 'query').mockResolvedValue(mockResult);

      const deletedCount = await cleanupExpiredEntries(mockDb);

      expect(deletedCount).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith('SELECT cleanup_expired_nuvex_storage() as deleted_count;');
    });

    it('should return 0 when no deleted_count in result', async () => {
      const mockResult = { rows: [{}] };
      jest.spyOn(mockDb, 'query').mockResolvedValue(mockResult);

      const deletedCount = await cleanupExpiredEntries(mockDb);

      expect(deletedCount).toBe(0);
    });

    it('should return 0 when no rows in result', async () => {
      const mockResult = { rows: [] };
      jest.spyOn(mockDb, 'query').mockResolvedValue(mockResult);

      const deletedCount = await cleanupExpiredEntries(mockDb);

      expect(deletedCount).toBe(0);
    });

    it('should handle cleanup errors', async () => {
      const error = new Error('Cleanup failed');
      jest.spyOn(mockDb, 'query').mockRejectedValue(error);

      await expect(cleanupExpiredEntries(mockDb)).rejects.toThrow('Cleanup failed');
      expect(console.error).toHaveBeenCalledWith('Failed to cleanup expired entries:', error);
    });
  });

  describe('dropNuvexSchema', () => {
    it('should drop all schema components', async () => {
      const querySpy = jest.spyOn(mockDb, 'query');

      await dropNuvexSchema(mockDb);

      expect(querySpy).toHaveBeenCalledWith(expect.stringContaining('DROP TRIGGER'));
      expect(querySpy).toHaveBeenCalledWith(expect.stringContaining('DROP FUNCTION'));
      expect(querySpy).toHaveBeenCalledWith(expect.stringContaining('DROP TABLE'));
      expect(console.log).toHaveBeenCalledWith('Nuvex database schema dropped successfully');
    });

    it('should handle drop schema errors', async () => {
      const error = new Error('Drop schema failed');
      jest.spyOn(mockDb, 'query').mockRejectedValue(error);

      await expect(dropNuvexSchema(mockDb)).rejects.toThrow('Drop schema failed');
      expect(console.error).toHaveBeenCalledWith('Failed to drop Nuvex database schema:', error);
    });
  });
});
