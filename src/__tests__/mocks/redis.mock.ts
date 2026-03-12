/**
 * Redis Mock Implementation
 * Mock Redis client for testing without actual Redis connection
 */

export class MockRedisClient {
  private store = new Map<string, any>();
  private ttlStore = new Map<string, number>();
  private setStore = new Map<string, Set<string>>();

  constructor() {
    this.store = new Map();
    this.ttlStore = new Map();
  }

  async connect(): Promise<void> {
    // Mock connection
  }
  async disconnect(): Promise<void> {
    // Mock disconnection
    this.store.clear();
    this.ttlStore.clear();
  }

  async quit(): Promise<string> {
    // Mock quit method
    this.store.clear();
    this.ttlStore.clear();
    return 'OK';
  }

  async ping(): Promise<string> {
    return 'PONG';
  }
  async set(
    key: string,
    value: any,
    options?: { EX?: number },
  ): Promise<string> {
    this.store.set(key, value);
    if (options?.EX) {
      this.ttlStore.set(key, Date.now() + options.EX * 1000);
    }
    return 'OK';
  }

  async setEx(key: string, seconds: number, value: any): Promise<string> {
    this.store.set(key, value);
    this.ttlStore.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async get(key: string): Promise<any> {
    // Check if key has expired
    const ttl = this.ttlStore.get(key);
    if (ttl && Date.now() > ttl) {
      this.store.delete(key);
      this.ttlStore.delete(key);
      return null;
    }
    return this.store.get(key) || null;
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    this.ttlStore.delete(key);
    return existed ? 1 : 0;
  }

  async sAdd(key: string, members: string | string[]): Promise<number> {
    const values = Array.isArray(members) ? members : [members];
    const set = this.setStore.get(key) ?? new Set<string>();
    let added = 0;

    for (const value of values) {
      if (!set.has(value)) {
        set.add(value);
        added++;
      }
    }

    this.setStore.set(key, set);
    return added;
  }

  async sRem(key: string, members: string | string[]): Promise<number> {
    const values = Array.isArray(members) ? members : [members];
    const set = this.setStore.get(key);
    if (!set) {
      return 0;
    }

    let removed = 0;
    for (const value of values) {
      if (set.delete(value)) {
        removed++;
      }
    }

    if (set.size === 0) {
      this.setStore.delete(key);
    }

    return removed;
  }

  async sMembers(key: string): Promise<string[]> {
    return Array.from(this.setStore.get(key) ?? []);
  }

  async exists(key: string): Promise<number> {
    // Check if key has expired
    const ttl = this.ttlStore.get(key);
    if (ttl && Date.now() > ttl) {
      this.store.delete(key);
      this.ttlStore.delete(key);
      return 0;
    }
    return this.store.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (this.store.has(key)) {
      this.ttlStore.set(key, Date.now() + seconds * 1000);
      return 1;
    }
    return 0;
  }

  async ttl(key: string): Promise<number> {
    if (!this.store.has(key)) {
      return -2;
    }

    const ttl = this.ttlStore.get(key);
    if (!ttl) {
      return -1;
    }

    const remainingMs = ttl - Date.now();
    if (remainingMs <= 0) {
      this.store.delete(key);
      this.ttlStore.delete(key);
      return -2;
    }

    return Math.ceil(remainingMs / 1000);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.store.keys()).filter((key) => regex.test(key));
  }

  async flushDb(): Promise<string> {
    this.store.clear();
    this.ttlStore.clear();
    this.setStore.clear();
    return 'OK';
  }

  async incrBy(key: string, increment: number): Promise<number> {
    const current = await this.get(key);
    const currentValue = current ? Number(current) : 0;
    const newValue = currentValue + increment;
    await this.set(key, newValue.toString());
    return newValue;
  }

  async incr(key: string): Promise<number> {
    return this.incrBy(key, 1);
  }

  async decrBy(key: string, decrement: number): Promise<number> {
    return this.incrBy(key, -decrement);
  }

  async decr(key: string): Promise<number> {
    return this.incrBy(key, -1);
  }

  isReady = true;
  isOpen = true;
}

export const createMockRedisClient = (): MockRedisClient => {
  return new MockRedisClient();
};
