![GitHub Repo Banner](https://ghrb.waren.build/banner?header=Nuvex+%F0%9F%97%84%EF%B8%8F%F0%9F%92%8E&subheader=TypeScript-first+3-layer+storage+SDK+for+Node.js.&bg=016EEA-016EEA&color=FFFFFF&headerfont=Google+Sans+Code&subheaderfont=Sour+Gummy&watermarkpos=bottom-right)
<!-- Created with GitHub Repo Banner by Waren Gonzaga: https://ghrb.waren.build -->

# Nuvex 🗄️💎 [![made by](https://img.shields.io/badge/made%20by-WG%20Tech%20Labs-0060a0.svg?logo=github&longCache=true&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs)

[![github actions workflow status](https://img.shields.io/github/actions/workflow/status/wgtechlabs/nuvex/test.yml?branch=main&style=flat-square&logo=github&labelColor=181717)](https://github.com/wgtechlabs/nuvex/actions/workflows/test.yml) [![codecov](https://img.shields.io/codecov/c/github/wgtechlabs/nuvex?token=PWRJTBVKQ9&style=flat-square&logo=codecov&labelColor=181717)](https://codecov.io/gh/wgtechlabs/nuvex) [![npm downloads](https://img.shields.io/npm/d18m/nuvex?style=flat-square&logo=npm&label=installs&labelColor=181717&color=%23CD0000)](https://www.npmjs.com/package/nuvex) [![sponsors](https://img.shields.io/badge/sponsor-%E2%9D%A4-%23db61a2.svg?&logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://github.com/sponsors/wgtechlabs) [![release](https://img.shields.io/github/release/wgtechlabs/nuvex.svg?logo=github&labelColor=181717&color=green&style=flat-square)](https://github.com/wgtechlabs/nuvex/releases) [![star](https://img.shields.io/github/stars/wgtechlabs/nuvex.svg?&logo=github&labelColor=181717&color=yellow&style=flat-square)](https://github.com/wgtechlabs/nuvex/stargazers) [![license](https://img.shields.io/github/license/wgtechlabs/nuvex.svg?&logo=github&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs/nuvex/blob/main/LICENSE)

**Nuvex** is the ultimate production-ready, TypeScript-first 3-layer storage SDK for Node.js applications. Combining the speed of memory cache, the reliability of Redis, and the persistence of PostgreSQL — all with one simple API and zero configuration hassle. Born from real-world development challenges and proven in production environments, Nuvex delivers enterprise-grade storage with intelligent caching that actually works.

The first storage SDK with built-in automatic data promotion/demotion, comprehensive health monitoring, and backup/restore capabilities. Stop wrestling with complex storage configurations and start building amazing applications with confidence. Whether you're creating high-performance APIs, developing microservices, or deploying production servers, Nuvex provides intelligent multi-layer storage that scales with your application's growth — from your first prototype to handling millions of requests across distributed systems.

## ⚡ Why Developers Choose Nuvex

**Tired of juggling Redis, PostgreSQL, and in-memory caches?** You're not alone.

Every developer has been there: your app is slow because you're hitting the database for every request. You add Redis, now you're managing cache invalidation. You add memory caching, now you're dealing with three different APIs and complex fallback logic. One service goes down, your entire storage layer breaks.

**Nuvex solves this once and for all:**

- **🎯 One API, Zero Headaches**: Write `storage.set()` and `storage.get()` — Nuvex handles Memory → Redis → PostgreSQL automatically
- **⚡ Performance That Just Works**: Sub-millisecond access for hot data, with intelligent promotion keeping your most-used data blazing fast
- **🛡️ Production-Grade Reliability**: Battle-tested with automatic error recovery and graceful fallbacks when services go down
- **📊 Built-in Observability**: Real-time metrics and health monitoring so you know exactly what's happening
- **💪 TypeScript-First DX**: Full type safety and excellent IntelliSense that makes coding a joy
- **🔧 Zero Configuration**: Works perfectly out of the box — no complex setup, no YAML files, no DevOps nightmares

**The result?** You focus on building features while Nuvex handles the storage complexity. From prototype to production, from thousands to millions of requests — storage that scales with your ambitions.

**Ready to 10x your storage performance?** [Get started now](#-quick-start) ⚡

## 🤗 Special Thanks

<!-- markdownlint-disable MD033 -->
| <div align="center">💎 Platinum Sponsor</div> |
|:-------------------------------------------:|
| <a href="https://unthread.com"><img src="https://raw.githubusercontent.com/wgtechlabs/unthread-discord-bot/main/.github/assets/sponsors/platinum_unthread.png" width="250" alt="Unthread"></a> |
| <div align="center"><a href="https://unthread.com" target="_blank"><b>Unthread</b></a><br/>Streamlined support ticketing for modern teams.</div> |
<!-- markdownlint-enable MD033 -->

## 💸 Sponsored Ads

Open source development is resource-intensive. These **sponsored ads help keep Log Engine free and actively maintained** while connecting you with tools and services that support open-source development.

[![sponsored ads](https://gitads.dev/v1/ad-serve?source=wgtechlabs/nuvex@github)](https://gitads.dev/v1/ad-track?source=wgtechlabs/nuvex@github)

## 🚀 Quick Start

```bash
pnpm add nuvex pg redis
```

```typescript
import { NuvexClient } from 'nuvex';

// Initialize once, use everywhere
const storage = await NuvexClient.initialize({
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'password'
  },
  redis: { url: 'redis://localhost:6379' } // Optional but recommended
});

// Simple, powerful API
await storage.set('user:123', { name: 'John', email: 'john@example.com' });
const user = await storage.get('user:123');
await storage.delete('user:123');

// Namespace your data
await storage.setNamespaced('sessions', 'abc123', { userId: 789, expires: Date.now() + 3600000 });
const session = await storage.getNamespaced('sessions', 'abc123');

// Batch operations for efficiency
const results = await storage.setBatch([
  { operation: 'set', key: 'product:1', value: { name: 'iPhone', price: 999 } },
  { operation: 'set', key: 'product:2', value: { name: 'MacBook', price: 1999 } }
]);

// Health monitoring
const health = await storage.healthCheck();
console.log('Storage healthy:', health.overall);
```

## 📦 Installation

```bash
pnpm add nuvex pg redis
```

## 🎯 Perfect For Any Node.js Application

- **🌐 Web APIs**: Session management, response caching, rate limiting
- **🛒 E-commerce**: Product catalogs, shopping carts, user preferences  
- **🎮 Gaming**: Player data, leaderboards, real-time game state
- **🤖 Bots & Automation**: User state, conversation flow, command history
- **📱 Mobile Backends**: User profiles, app data, push notifications
- **🏢 Enterprise**: Configuration management, temporary data, metrics
- **📊 Analytics**: Event storage, metrics aggregation, reporting data

## 📚 Documentation

### Configuration

```typescript
const config = {
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'password'
  },
  redis: { url: 'redis://localhost:6379' }, // Optional but recommended
  memory: { ttl: 86400000, maxSize: 10000 }, // Optional
  logging: { enabled: true } // Optional
};
```

#### PostgreSQL Schema Configuration

Nuvex uses strongly branded table and column names by default (`nuvex_storage`, `nuvex_key`, `nuvex_data`). For backwards compatibility with existing applications, you can customize these names:

```typescript
// Default configuration (recommended for new apps)
const storage = await NuvexClient.initialize({
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'postgres',
    password: 'password'
    // Uses: table 'nuvex_storage', columns 'nuvex_key' and 'nuvex_data'
  }
});

// Custom configuration for Telegram bot compatibility
const storage = await NuvexClient.initialize({
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'telegram_bot',
    user: 'postgres',
    password: 'password',
    schema: {
      tableName: 'storage_cache',
      columns: {
        key: 'key',
        value: 'value'
      }
    }
  }
});

// Custom configuration for Discord bot compatibility
const storage = await NuvexClient.initialize({
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'discord_bot',
    user: 'postgres',
    password: 'password',
    schema: {
      tableName: 'storage_cache',
      columns: {
        key: 'cache_key',
        value: 'data'
      }
    }
  }
});
```

**Schema Configuration Reference:**

| App           | Table           | Key Column     | Data Column   |
|---------------|-----------------|---------------|---------------|
| **Nuvex** (default) | nuvex_storage   | nuvex_key     | nuvex_data    |
| Telegram Bot  | storage_cache   | key           | value         |
| Discord Bot   | storage_cache   | cache_key     | data          |

### API Reference

```typescript
// Basic operations
await storage.set('key', value, { ttl: 3600 });
const data = await storage.get('key');
await storage.delete('key');
await storage.exists('key');

// Namespace operations
await storage.setNamespaced('users', '123', userData);
const user = await storage.getNamespaced('users', '123');

// Batch operations
const results = await storage.setBatch([
  { operation: 'set', key: 'key1', value: 'value1' },
  { operation: 'get', key: 'key2' }
]);

// Atomic operations
const newValue = await storage.increment('counter', 5);
await storage.decrement('counter', 2);
```

### Monitoring & Maintenance

```typescript
// Health monitoring
const health = await storage.healthCheck();
console.log('All systems:', health.overall ? '✅' : '❌');

// Performance metrics
const metrics = storage.getMetrics();
console.log(`Cache hit rate: ${(metrics.memoryHits / metrics.totalOperations * 100).toFixed(2)}%`);

// Backup & restore
const backupId = await storage.backup('my-backup', { compression: true });
await storage.restore('my-backup', { clearExisting: false });

// Query operations
const results = await storage.query({
  pattern: 'user:*',
  limit: 100,
  sortBy: 'createdAt'
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

### API Reference

#### Core Operations

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

#### Advanced Features

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

## 🏗️ How It Works

**3-Layer Architecture** → **Automatic Optimization** → **Lightning Fast**

1. **Memory** (< 1ms) → **Redis** (1-5ms) → **PostgreSQL** (5-50ms)
2. **Smart promotion**: Hot data moves to faster layers automatically
3. **Graceful fallback**: If Redis is down, PostgreSQL takes over seamlessly
4. **Zero config**: Works perfectly out of the box with sensible defaults

## 🤝 Community & Support

- 💬 **[GitHub Discussions](https://github.com/wgtechlabs/nuvex/discussions)** - Ask questions, share ideas
- 🐛 **[Issues](https://github.com/wgtechlabs/nuvex/issues)** - Report bugs, request features  
- 📖 **[Documentation](https://github.com/wgtechlabs/nuvex#readme)** - Complete API reference
- ⭐ **[Star this repo](https://github.com/wgtechlabs/nuvex)** - Show your support!

## 🎯 Contributing

We ❤️ contributions! Here's how you can help:

- **🐛 Report bugs** - Found an issue? [Open an issue](https://github.com/wgtechlabs/nuvex/issues/new)
- **💡 Suggest features** - Have ideas? [Start a discussion](https://github.com/wgtechlabs/nuvex/discussions)
- **📝 Improve docs** - Help make our documentation better
- **🔧 Submit PRs** - Check out our [contributing guide](./CONTRIBUTING.md) to get started

## 🛟 Help & Support

Need assistance? Here's how to get support:

- **Community Support**: Check the [Help & Support](https://github.com/wgtechlabs/nuvex/discussions/categories/help-support) discussions
- **Ask Questions**: Create a [new discussion](https://github.com/wgtechlabs/nuvex/discussions/new?category=help-support)
- **Security Issues**: Follow our [security policy](./security.md) for responsible disclosure

## 🙏 Sponsor

Like this project? **Leave a star**! ⭐⭐⭐⭐⭐

There are several ways you can support this project:

- [Become a sponsor](https://github.com/sponsors/wgtechlabs) and get some perks! 💖
- [Buy me a coffee](https://buymeacoffee.com/wgtechlabs) if you just love what I do! ☕

## ⭐ GitHub Star Nomination

Found this project helpful? Consider nominating me **(@warengonzaga)** for the [GitHub Star program](https://stars.github.com/nominate/)! This recognition supports ongoing development of this project and [my other open-source projects](https://github.com/warengonzaga?tab=repositories). GitHub Stars are recognized for their significant contributions to the developer community - your nomination makes a difference and encourages continued innovation!

## 📋 Code of Conduct

I'm committed to providing a welcoming and inclusive environment for all contributors and users. Please review the project's [Code of Conduct](./code_of_conduct.md) to understand the community standards and expectations for participation.

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

## 📝 Author

This project is created by **[Waren Gonzaga](https://github.com/warengonzaga)** at [WG Technology Labs](https://github.com/wgtechlabs), with the help of awesome *[contributors](https://github.com/wgtechlabs/nuvex/graphs/contributors)*.

[![contributors](https://contrib.rocks/image?repo=wgtechlabs/nuvex)](https://github.com/wgtechlabs/nuvex/graphs/contributors)

---

💻 with ❤️ by [Waren Gonzaga](https://warengonzaga.com) at [WG Technology Labs](https://wgtechlabs.com), and [Him](https://www.youtube.com/watch?v=HHrxS4diLew&t=44s) 🙏

<!-- GitAds-Verify: [TO_BE_CONFIGURED] -->
