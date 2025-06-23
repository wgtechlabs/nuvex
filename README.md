# Nuvex — Next-gen Unified Vault Experience

A minimalist SDK for structured memory layering in Redis and PostgreSQL.

[![npm version](https://badge.fury.io/js/nuvex.svg)](https://badge.fury.io/js/nuvex)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

## Overview

Nuvex provides intelligent multi-layer storage for Node.js applications through a three-tier architecture:

- **Layer 1: Memory Cache** (24hr TTL) - Ultra-fast in-memory storage
- **Layer 2: Redis Cache** (3-day TTL) - Distributed caching for scalability  
- **Layer 3: PostgreSQL** (Permanent) - Persistent storage for critical data

## Features

✨ **Multi-layer Architecture** - Automatic data tier management and promotion/demotion  
🚀 **High Performance** - Sub-millisecond access for frequently used data  
🔄 **Intelligent Fallback** - Graceful degradation when storage layers are unavailable  
📊 **Built-in Metrics** - Cache hit rates, performance monitoring, and analytics  
🔌 **Pluggable Logging** - Optimized for [@wgtechlabs/log-engine](https://github.com/wgtechlabs/log-engine), supports any logger  
💪 **TypeScript First** - Full type safety and excellent developer experience  
🛡️ **Production Ready** - Connection pooling, error recovery, and health checks

## Installation

```bash
npm install nuvex
```

### Peer Dependencies

```bash
# For PostgreSQL support
npm install pg @types/pg

# For Redis support  
npm install redis

# Recommended: Enhanced logging with log-engine
npm install @wgtechlabs/log-engine
```

> **💡 Recommended:** Use [`@wgtechlabs/log-engine`](https://github.com/wgtechlabs/log-engine) for enhanced logging capabilities, structured output, and seamless integration with Nuvex.

## Quick Start

```typescript
import { Nuvex } from 'nuvex';

// Initialize Nuvex
const storage = new Nuvex({
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'password'
  },
  redis: {
    url: 'redis://localhost:6379'
  }
});

// Connect to storage layers
await storage.connect();

// Store data (automatically chooses optimal layer)
await storage.set('user:123', { name: 'John', email: 'john@example.com' });

// Retrieve data (checks layers in order: Memory → Redis → PostgreSQL)
const user = await storage.get('user:123');

// Set with custom TTL
await storage.set('session:abc', sessionData, { ttl: 3600 });
```

## Configuration

### Basic Configuration

```typescript
const config = {
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'password'
  },
  redis: {
    url: 'redis://localhost:6379',
    ttl: 259200 // 3 days
  },
  memory: {
    ttl: 86400000, // 24 hours in milliseconds
    maxSize: 10000 // Maximum entries
  }
};
```

### With Logging

#### Recommended: @wgtechlabs/log-engine

The recommended logging solution for Nuvex, designed for optimal integration:

```typescript
import { LogEngine } from '@wgtechlabs/log-engine';
import { Nuvex } from 'nuvex';

// Configure log-engine
LogEngine.configure({
  level: 'info',
  service: 'nuvex-app',
  version: '1.0.0',
  environment: 'production'
});

const storage = new Nuvex({
  postgres: { /* ... */ },
  redis: { /* ... */ },
  logging: {
    enabled: true,
    logger: LogEngine,
    level: 'info',
    includeMetrics: true,
    includePerformance: true
  }
});
```

#### Alternative Loggers

Nuvex supports any logger that implements the simple interface:

```typescript
// With Winston
import winston from 'winston';
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// With Pino  
import pino from 'pino';
const logger = pino({ level: 'info' });

// With Console (development)
const logger = console;

// Use any logger
const storage = new Nuvex({
  postgres: { /* ... */ },
  logging: { enabled: true, logger }
});
```

## Logging

Nuvex supports pluggable logging with any logger that implements the simple interface. 

### 🔥 Recommended: @wgtechlabs/log-engine

[`@wgtechlabs/log-engine`](https://github.com/wgtechlabs/log-engine) is specifically designed to work seamlessly with Nuvex:

```typescript
import { LogEngine } from '@wgtechlabs/log-engine';
import { Nuvex } from 'nuvex';

// One-time configuration
LogEngine.configure({
  level: 'info',
  service: 'my-app',
  structured: true,
  colorize: true
});

const storage = new Nuvex({
  postgres: { /* config */ },
  logging: {
    enabled: true,
    logger: LogEngine,
    includeMetrics: true // Cache hit/miss rates
  }
});
```

**Benefits of log-engine with Nuvex:**
- 🎯 **Structured Logging** - Perfect for monitoring Nuvex metrics
- ⚡ **High Performance** - Minimal overhead for storage operations  
- 🔧 **Easy Configuration** - Works out of the box
- 📊 **Rich Context** - Detailed operation metadata

### Other Supported Loggers

```typescript
// Winston
import winston from 'winston';
const logger = winston.createLogger({ level: 'info' });

// Pino
import pino from 'pino';
const logger = pino();

// Console (development)
const logger = console;

// Custom logger (just implement the interface)
const logger = {
  debug: (msg, meta) => { /* your implementation */ },
  info: (msg, meta) => { /* your implementation */ },
  warn: (msg, meta) => { /* your implementation */ },
  error: (msg, meta) => { /* your implementation */ }
};
```

## API Reference

### Core Operations

```typescript
// Basic CRUD operations
await storage.set(key, value, options?);
await storage.get(key, options?);
await storage.delete(key);
await storage.exists(key);

// Batch operations
await storage.setBatch([
  { operation: 'set', key: 'key1', value: 'value1' },
  { operation: 'set', key: 'key2', value: 'value2' }
]);

// Query operations
const results = await storage.query({
  pattern: 'user:*',
  limit: 10,
  sortBy: 'createdAt'
});
```

### Advanced Features

```typescript
// Force specific storage layer
await storage.set('key', value, { layer: StorageLayer.POSTGRES });

// Skip cache layers
await storage.get('key', { skipCache: true });

// Layer management
await storage.promote('key', StorageLayer.MEMORY);
await storage.demote('key', StorageLayer.POSTGRES);

// Metrics and monitoring
const metrics = storage.getMetrics();
const health = await storage.healthCheck();
```

## Storage Layers

### Memory Cache (Layer 1)
- **TTL**: 24 hours (configurable)
- **Use case**: Hot data, session information
- **Performance**: < 1ms access time

### Redis Cache (Layer 2)  
- **TTL**: 3 days (configurable)
- **Use case**: Warm data, distributed caching
- **Performance**: 1-5ms access time

### PostgreSQL (Layer 3)
- **TTL**: Permanent storage
- **Use case**: Cold data, critical information
- **Performance**: 5-50ms access time

## Migration Guide

### From Bot-Specific Storage

If you're migrating from a bot-specific implementation:

```typescript
// Old bot-specific way
await botsStore.storeTicket(ticketData);
await botsStore.getUserState(userId);

// New generic way
await storage.set(`ticket:${ticketId}`, ticketData);
await storage.get(`user:${userId}:state`);
```

## Performance

Nuvex is designed for high-performance applications:

- **Memory Cache**: Sub-millisecond access for hot data
- **Intelligent Caching**: Automatic promotion of frequently accessed data
- **Connection Pooling**: Optimized database connections
- **Batch Operations**: Efficient bulk data operations

## Error Handling

Nuvex provides graceful error handling and fallback mechanisms:

```typescript
try {
  await storage.set('key', 'value');
} catch (error) {
  // Nuvex automatically falls back to available layers
  console.log('Storage operation failed:', error);
}
```

## Health Monitoring

```typescript
const health = await storage.healthCheck();
// Returns: { memory: true, redis: true, postgres: true, overall: true }

const metrics = storage.getMetrics();
// Returns: { memoryHits: 150, redisHits: 45, postgresHits: 12, ... }
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [WG Technology Labs](https://wgtechlabs.com)

## Support

- 📧 Email: [support@wgtechlabs.com](mailto:support@wgtechlabs.com)
- 🐛 Issues: [GitHub Issues](https://github.com/wgtechlabs/nuvex/issues)
- 📖 Documentation: [Full Documentation](https://nuvex.wgtechlabs.com)

---

**Built with ❤️ by [WG Technology Labs](https://wgtechlabs.com)**
