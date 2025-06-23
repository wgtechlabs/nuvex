# Nuvex 🗄️💎 [![made by](https://img.shields.io/badge/made%20by-WG%20Tech%20Labs-0060a0.svg?logo=github&longCache=true&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs)

[![github actions workflow status](https://img.shields.io/github/actions/workflow/status/wgtechlabs/nuvex/test.yml?branch=main&style=flat-square&logo=github&labelColor=181717)](https://github.com/wgtechlabs/nuvex/actions/workflows/test.yml) [![codecov](https://img.shields.io/codecov/c/github/wgtechlabs/nuvex?token=PWRJTBVKQ9&style=flat-square&logo=codecov&labelColor=181717)](https://codecov.io/gh/wgtechlabs/nuvex) [![npm downloads](https://img.shields.io/npm/d18m/nuvex?style=flat-square&logo=npm&label=installs&labelColor=181717&color=%23CD0000)](https://www.npmjs.com/package/nuvex) [![sponsors](https://img.shields.io/badge/sponsor-%E2%9D%A4-%23db61a2.svg?&logo=github&logoColor=white&labelColor=181717&style=flat-square)](https://github.com/sponsors/wgtechlabs) [![release](https://img.shields.io/github/release/wgtechlabs/nuvex.svg?logo=github&labelColor=181717&color=green&style=flat-square)](https://github.com/wgtechlabs/nuvex/releases) [![star](https://img.shields.io/github/stars/wgtechlabs/nuvex.svg?&logo=github&labelColor=181717&color=yellow&style=flat-square)](https://github.com/wgtechlabs/nuvex/stargazers) [![license](https://img.shields.io/github/license/wgtechlabs/nuvex.svg?&logo=github&labelColor=181717&style=flat-square)](https://github.com/wgtechlabs/nuvex/blob/main/LICENSE)

[![banner](https://raw.githubusercontent.com/wgtechlabs/nuvex/main/.github/assets/repo_banner.jpg)](https://github.com/wgtechlabs/nuvex)

WG's Nuvex is the **ultimate multi-layer storage solution for Node.js developers** - a lightweight, battle-tested SDK specifically engineered for Discord bots, Telegram bots, web servers, APIs, and server-side applications. Born from real-world development challenges and proven in production environments, Nuvex delivers enterprise-grade storage with zero complexity, intelligent data tier management, and **comprehensive TypeScript support**.

**The first multi-layer storage SDK with built-in intelligent caching and comprehensive Redis/PostgreSQL integration.** Stop wrestling with complex storage configurations and start building amazing applications efficiently. Whether you're creating the next viral Discord community bot, building high-performance APIs, developing microservices, or deploying production servers, Nuvex provides intelligent three-tier storage with automatic data promotion/demotion, seamless fallback mechanisms, and built-in performance monitoring that scales with your application's growth - from your first "Hello World" to handling millions of requests across distributed systems.

## ❣️ Motivation

Modern bots and APIs need fast, reliable, and scalable storage. Traditional solutions force you to choose between speed (caching) and reliability (databases), making development complex and error-prone.

**Nuvex solves this by providing a unified, intelligent storage layer that combines caching and persistence—out of the box.** No more manual cache management or worrying about data loss. Just simple, efficient storage for all your Node.js applications.

## ✨ Key Features

- **🗄️ Multi-layer Architecture**: Three-tier intelligent storage system with **Memory Cache (24hr TTL)**, **Redis Cache (3-day TTL)**, and **PostgreSQL (permanent)** - the first SDK with comprehensive automated data tier management.
- **⚡ High Performance Storage**: Sub-millisecond access for frequently used data with intelligent promotion and demotion based on access patterns.
- **🔄 Intelligent Fallback**: Graceful degradation when storage layers are unavailable - automatic layer switching with zero downtime.
- **📊 Built-in Metrics & Monitoring**: Comprehensive cache hit rates, performance analytics, and health monitoring with real-time insights.
- **🔌 Pluggable Logging Integration**: Optimized for [@wgtechlabs/log-engine](https://github.com/wgtechlabs/log-engine) with support for any logger - structured logging that just works.
- **💪 TypeScript First**: Full type safety with comprehensive interfaces and excellent developer experience across all storage operations.
- **🛡️ Production Ready**: Connection pooling, automatic error recovery, health checks, and enterprise-grade reliability features.
- **🚀 Zero Configuration**: Intelligent defaults that work out of the box - just connect and start storing data efficiently.
- **🎯 Smart Data Management**: Automatic data tier optimization based on access frequency and patterns - hot data stays fast, cold data stays persistent.
- **🔗 Seamless Integration**: Simple API that works seamlessly with existing Node.js applications - Discord bots, APIs, web servers, and microservices.
- **⚙️ Auto-Layer Selection**: Intelligent storage layer selection based on data type, size, and access patterns - no manual configuration required.
- **📈 Scalable Architecture**: Designed to scale from small applications to enterprise-level systems handling millions of operations.

## 🤔 How It Works
<!-- markdownlint-disable MD051 -->
1. Nuvex automatically initializes your three-tier storage architecture with intelligent defaults optimized for your environment
2. When you store data, Nuvex intelligently selects the optimal storage layer based on data size, type, and access patterns
3. Each data retrieval checks layers in order: **Memory → Redis → PostgreSQL**, providing sub-millisecond to millisecond response times
4. Frequently accessed data is automatically promoted to faster layers, while unused data gracefully demotes to persistent storage
5. Built-in health monitoring continuously tracks layer availability and automatically handles failover with zero downtime
6. Performance metrics are collected in real-time, providing insights into cache hit rates, response times, and layer utilization

Ready to supercharge your application storage? Get started in seconds with our [simple installation](#📦-installation)!
<!-- markdownlint-enable MD051 -->

## 🤗 Special Thanks

<!-- markdownlint-disable MD033 -->
| <div align="center">💎 Platinum Sponsor</div> |
|:-------------------------------------------:|
| <a href="https://unthread.com"><img src="https://raw.githubusercontent.com/wgtechlabs/unthread-discord-bot/main/.github/assets/sponsors/platinum_unthread.png" width="250" alt="Unthread"></a> |
| <div align="center"><a href="https://unthread.com" target="_blank"><b>Unthread</b></a><br/>Streamlined support ticketing for modern teams.</div> |
<!-- markdownlint-enable MD033 -->

## 💸 Sponsored Ads

Open source development is resource-intensive. These **sponsored ads help keep Nuvex free and actively maintained** while connecting you with tools and services that support open-source development.

[![sponsored ads](https://gitads.dev/v1/ad-serve?source=wgtechlabs/nuvex@github)](https://gitads.dev/v1/ad-track?source=wgtechlabs/nuvex@github)

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

## 🕹️ Usage

### Quick Start

```typescript
import { Nuvex } from 'nuvex';

// Initialize Nuvex with auto-configuration
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
await storage.set('user:123', { 
  name: 'John', 
  email: 'john@example.com',
  preferences: { theme: 'dark' }
});

// Retrieve data (checks layers in order: Memory → Redis → PostgreSQL)
const user = await storage.get('user:123');

// Set with custom TTL and layer preferences
await storage.set('session:abc', sessionData, { 
  ttl: 3600,
  layer: 'redis' // Force specific layer
});

// Batch operations for high performance
await storage.setBatch([
  { operation: 'set', key: 'key1', value: 'value1' },
  { operation: 'set', key: 'key2', value: 'value2' }
]);
```

### Configuration Options

#### Basic Configuration

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
};
```

#### Logging Integration

##### Enhanced Logging with @wgtechlabs/log-engine

[`@wgtechlabs/log-engine`](https://github.com/wgtechlabs/log-engine) is specifically designed to work seamlessly with Nuvex:

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

## 🗄️ Storage Layer Architecture

Nuvex uses a sophisticated three-tier storage system that automatically optimizes data placement and retrieval:

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

## 💬 Community Discussions

Join our community discussions to get help, share ideas, and connect with other users:

- 📣 **[Announcements](https://github.com/wgtechlabs/nuvex/discussions/categories/announcements)**: Official updates from the maintainer
- 📸 **[Showcase](https://github.com/wgtechlabs/nuvex/discussions/categories/showcase)**: Show and tell your implementation
- 💖 **[Wall of Love](https://github.com/wgtechlabs/nuvex/discussions/categories/wall-of-love)**: Share your experience with the library
- 🛟 **[Help & Support](https://github.com/wgtechlabs/nuvex/discussions/categories/help-support)**: Get assistance from the community
- 🧠 **[Ideas](https://github.com/wgtechlabs/nuvex/discussions/categories/ideas)**: Suggest new features and improvements

## 🛟 Help & Support

### Getting Help

Need assistance with the library? Here's how to get help:
<!-- markdownlint-disable MD051 -->
- **Community Support**: Check the [Help & Support](https://github.com/wgtechlabs/nuvex/discussions/categories/help-support) category in our GitHub Discussions for answers to common questions.
- **Ask a Question**: Create a [new discussion](https://github.com/wgtechlabs/nuvex/discussions/new?category=help-support) if you can't find answers to your specific issue.
- **Documentation**: Review the [usage instructions](#🕹️-usage) in this README for common examples and configurations.
- **Known Issues**: Browse [existing issues](https://github.com/wgtechlabs/nuvex/issues) to see if your problem has already been reported.
<!-- markdownlint-enable MD051 -->

### Reporting Issues

Please report any issues, bugs, or improvement suggestions by [creating a new issue](https://github.com/wgtechlabs/nuvex/issues/new/choose). Before submitting, please check if a similar issue already exists to avoid duplicates.

### Security Vulnerabilities

For security vulnerabilities, please do not report them publicly. Follow the guidelines in our [security policy](./security.md) to responsibly disclose security issues.

Your contributions to improving this project are greatly appreciated! 🙏✨

## 🎯 Contributing

Contributions are welcome, create a pull request to this repo and I will review your code. Please consider to submit your pull request to the `dev` branch. Thank you!

Read the project's [contributing guide](./CONTRIBUTING.md) for more info, including testing guidelines and requirements.

## 🙏 Sponsor

Like this project? **Leave a star**! ⭐⭐⭐⭐⭐

There are several ways you can support this project:

- [Become a sponsor](https://github.com/sponsors/wgtechlabs) and get some perks! 💖
- [Buy me a coffee](https://buymeacoffee.com/wgtechlabs) if you just love what I do! ☕

## ⭐ GitHub Star Nomination

Found this project helpful? Consider nominating me **(@warengonzaga)** for the [GitHub Star program](https://stars.github.com/nominate/)! This recognition supports ongoing development of this project and [my other open-source projects](https://github.com/warengonzaga?tab=repositories). GitHub Stars are recognized for their significant contributions to the developer community - your nomination makes a difference and encourages continued innovation!

## 📋 Code of Conduct

I'm committed to providing a welcoming and inclusive environment for all contributors and users. Please review the project's [Code of Conduct](./code_of_conduct.md) to understand the community standards and expectations for participation.

## 📃 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). See the [LICENSE](LICENSE) file for the full license text.

## 📝 Author

This project is created by **[Waren Gonzaga](https://github.com/warengonzaga)** under [WG Technology Labs](https://github.com/wgtechlabs), with the help of awesome [contributors](https://github.com/wgtechlabs/nuvex/graphs/contributors).

**Latest Version:** v1.0.0 - Enhanced with intelligent multi-layer storage, comprehensive TypeScript support, and production-ready reliability.

[![contributors](https://contrib.rocks/image?repo=wgtechlabs/nuvex)](https://github.com/wgtechlabs/nuvex/graphs/contributors)

---

💻 with ❤️ by [Waren Gonzaga](https://warengonzaga.com) under [WG Technology Labs](https://wgtechlabs.com), and [Him](https://www.youtube.com/watch?v=HHrxS4diLew&t=44s) 🙏

<!-- GitAds-Verify: [TO_BE_CONFIGURED] -->
