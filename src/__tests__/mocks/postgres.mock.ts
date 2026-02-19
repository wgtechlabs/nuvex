/**
 * PostgreSQL Mock Implementation
 * Mock PostgreSQL client for testing without actual database connection
 */

export interface MockQueryResult {
  rows: any[];
  rowCount: number;
  command: string;
}

export class MockPgPool {
  private tables = new Map<string, Map<string, any>>();
  
  constructor() {
    this.tables = new Map();
    // Initialize the nuvex_storage table
    this.tables.set('nuvex_storage', new Map());
  }

  async connect(): Promise<MockPgClient> {
    return new MockPgClient(this.tables);
  }

  async query(text: string, params?: any[]): Promise<MockQueryResult> {
    const client = await this.connect();
    const result = await client.query(text, params);
    client.release();
    return result;
  }

  async end(): Promise<void> {
    this.tables.clear();
  }
}

export class MockPgClient {
  constructor(private tables: Map<string, Map<string, any>>) {}

  async query(text: string, params?: any[]): Promise<MockQueryResult> {
    const sql = text.toLowerCase().trim();
    
    // Handle CREATE TABLE
    if (sql.includes('create table')) {
      // Updated regex: supports optional schema, case-insensitive
      const tableMatch = text.match(/create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)/i);
      if (tableMatch) {
        const tableName = tableMatch[1].toLowerCase();
        this.tables.set(tableName, new Map());
      }
      return { rows: [], rowCount: 0, command: 'CREATE' };
    }
    
    // Handle INSERT with ON CONFLICT (UPSERT) for nuvex_storage
    if (sql.includes('insert into nuvex_storage') && sql.includes('on conflict')) {
      if (params && params.length >= 2) {
        const [key, value, expiresAt] = params;
        const table = this.tables.get('nuvex_storage') || new Map();
        
        // Handle ON CONFLICT DO NOTHING (used by increment when key doesn't exist)
        if (sql.includes('do nothing')) {
          // Only insert if key doesn't exist
          if (!table.has(key)) {
            const record = {
              key,
              value: typeof value === 'number' ? JSON.stringify(value) : value,
              expires_at: expiresAt,
              created_at: new Date(),
              updated_at: new Date()
            };
            
            table.set(key, record);
            this.tables.set('nuvex_storage', table);
            return { rows: [record], rowCount: 1, command: 'INSERT' };
          }
          return { rows: [], rowCount: 0, command: 'INSERT' };
        }
        
        // Handle atomic increment operations
        if (sql.includes('coalesce(cast(nuvex_storage.value as numeric)')) {
          const existingRecord = table.get(key);
          const currentValue = existingRecord ? Number(existingRecord.value) || 0 : 0;
          const delta = Number(value);
          const newValue = currentValue + delta;
          
          const record = {
            key,
            value: newValue.toString(),
            expires_at: expiresAt,
            created_at: new Date(),
            updated_at: new Date()
          };
          
          table.set(key, record);
          this.tables.set('nuvex_storage', table);
          return { rows: [{ numeric_value: newValue }], rowCount: 1, command: 'INSERT' };
        }
        
        // Regular upsert operation
        const record = {
          key,
          value,
          expires_at: expiresAt,
          created_at: new Date(),
          updated_at: new Date()
        };
        
        table.set(key, record);
        this.tables.set('nuvex_storage', table);
        return { rows: [record], rowCount: 1, command: 'INSERT' };
      }
      return { rows: [], rowCount: 0, command: 'INSERT' };
    }
    
    // Handle SELECT from nuvex_storage with expiration check
    if (sql.includes('select value from nuvex_storage')) {
      const table = this.tables.get('nuvex_storage') || new Map();
      
      if (params && params.length > 0) {
        const key = params[0];
        const record = table.get(key);
        
        if (record) {
          // Check if record has expired (compare in UTC)
          if (record.expires_at) {
            const nowUtc = new Date(Date.now());
            const expiresAtUtc = new Date(record.expires_at);
            if (nowUtc.getTime() > expiresAtUtc.getTime()) {
              table.delete(key); // Remove expired record
              return { rows: [], rowCount: 0, command: 'SELECT' };
            }
          }
          return { rows: [{ value: record.value }], rowCount: 1, command: 'SELECT' };
        }
      }
      
      return { rows: [], rowCount: 0, command: 'SELECT' };
    }
    
    // Handle DELETE from nuvex_storage
    if (sql.includes('delete from nuvex_storage')) {
      const table = this.tables.get('nuvex_storage') || new Map();
      
      if (params && params.length > 0) {
        const key = params[0];
        const existed = table.has(key);
        table.delete(key);
        return { rows: [], rowCount: existed ? 1 : 0, command: 'DELETE' };
      }
      
      return { rows: [], rowCount: 0, command: 'DELETE' };
    }
    
    // Handle UPDATE for atomic increment
    if (sql.includes('update nuvex_storage') && sql.includes('returning')) {
      const table = this.tables.get('nuvex_storage') || new Map();
      
      if (params && params.length >= 3) {
        const [delta, expiresAt, key] = params;
        const existingRecord = table.get(key);
        
        if (existingRecord) {
          // Check if record has expired
          if (existingRecord.expires_at) {
            const nowUtc = new Date(Date.now());
            const expiresAtUtc = new Date(existingRecord.expires_at);
            if (nowUtc.getTime() > expiresAtUtc.getTime()) {
              table.delete(key);
              return { rows: [], rowCount: 0, command: 'UPDATE' };
            }
          }
          
          // Parse the current numeric value from JSONB
          let currentValue = 0;
          try {
            const parsed = typeof existingRecord.value === 'string' 
              ? JSON.parse(existingRecord.value)
              : existingRecord.value;
            currentValue = typeof parsed === 'number' ? parsed : 0;
          } catch {
            currentValue = 0;
          }
          
          const newValue = currentValue + Number(delta);
          
          const record = {
            ...existingRecord,
            value: JSON.stringify(newValue),
            expires_at: expiresAt,
            updated_at: new Date()
          };
          
          table.set(key, record);
          this.tables.set('nuvex_storage', table);
          return { rows: [{ value: newValue }], rowCount: 1, command: 'UPDATE' };
        }
        
        // Key doesn't exist
        return { rows: [], rowCount: 0, command: 'UPDATE' };
      }
      
      return { rows: [], rowCount: 0, command: 'UPDATE' };
    }
    
    // Handle generic SELECT for other operations
    if (sql.includes('select')) {
      const tableMatch = sql.match(/from\s+(\w+)/);
      if (tableMatch) {
        const tableName = tableMatch[1];
        const table = this.tables.get(tableName) || new Map();
        
        // Handle WHERE clause
        if (sql.includes('where') && params && params.length > 0) {
          const record = table.get(params[0]);
          return {
            rows: record ? [record] : [],
            rowCount: record ? 1 : 0,
            command: 'SELECT'
          };
        }
        
        // Return all records
        const rows = Array.from(table.values());
        return { rows, rowCount: rows.length, command: 'SELECT' };
      }
      return { rows: [], rowCount: 0, command: 'SELECT' };
    }
    
    // Default response
    return { rows: [], rowCount: 0, command: 'UNKNOWN' };
  }

  release(): void {
    // Mock release
  }
}

export const createMockPgPool = (): MockPgPool => {
  return new MockPgPool();
};
