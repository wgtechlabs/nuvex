/**
 * # Nuvex - Next-gen Unified Vault Experience
 * 
 * A production-ready, minimalist SDK for structured memory layering in Redis and PostgreSQL.
 * Designed for any Node.js application that needs intelligent multi-layer storage with automatic
 * data promotion, demotion, and comprehensive reliability features.
 * 
 * ## Architecture Overview
 * 
 * Nuvex implements a sophisticated three-tier storage system:
 * 
 * ### Layer 1: Memory Cache (Ultra-fast)
 * - **TTL**: Configurable (default: 24 hours)
 * - **Use case**: Hot data, session information, frequently accessed content
 * - **Performance**: Sub-millisecond access time
 * - **Features**: LRU eviction, automatic cleanup, size limits
 * 
 * ### Layer 2: Redis Cache (Fast & Distributed)
 * - **TTL**: Configurable (default: 3 days)
 * - **Use case**: Warm data, distributed caching across instances
 * - **Performance**: 1-5ms access time
 * - **Features**: Atomic operations, cluster support, persistence
 * 
 * ### Layer 3: PostgreSQL (Persistent & Reliable)
 * - **TTL**: Permanent storage with optional expiration
 * - **Use case**: Cold data, critical information, audit trails
 * - **Performance**: 5-50ms access time depending on query complexity
 * - **Features**: ACID compliance, advanced querying, schema flexibility
 * 
 * ## Key Components
 * 
 * - **{@link StorageEngine}**: Low-level multi-layer storage implementation
 * - **{@link NuvexClient}**: High-level client with convenience methods
 * - **Database Utilities**: Schema management and migration tools
 * - **Type System**: Comprehensive TypeScript definitions
 * 
 * ## Quick Start Example
 * 
 * ```typescript
 * import { NuvexClient } from 'nuvex';
 * 
 * const client = new NuvexClient({
 *   memory: { ttl: 3600000, maxSize: 10000 },
 *   redis: { url: 'redis://localhost:6379', ttl: 86400 },
 *   postgres: { 
 *     host: 'localhost', 
 *     database: 'myapp',
 *     user: 'user',
 *     password: 'pass'
 *   }
 * });
 * 
 * await client.connect();
 * 
 * // Set data (automatically stored in all layers)
 * await client.set('user:123', { name: 'John', email: 'john@example.com' });
 * 
 * // Get data (automatically checks Memory → Redis → PostgreSQL)
 * const user = await client.get('user:123');
 * ```
 *  * ## Use Cases
 * 
 * - **Session Management**: Store user sessions with automatic expiration
 * - **API Caching**: Cache API responses with intelligent invalidation
 * - **Configuration Storage**: Store application settings with fallback
 * - **Real-time Data**: Handle high-frequency data with performance optimization
 * - **Application State**: Store application state and user preferences
 * - **Microservices**: Shared data layer across distributed services
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @since 2025
 * @see {@link https://github.com/wgtechlabs/nuvex} GitHub Repository
 * @see {@link https://wgtechlabs.com} WG Technology Labs
 * 
 * @packageDocumentation
 */

// Core components
export { StorageEngine } from './core/engine.js';
export { NuvexClient } from './core/client.js';

// Database utilities
export * from './core/database.js';

// Type definitions
export type * from './types/index.js';
export type * from './interfaces/index.js';

// Main export (recommended usage)
export { NuvexClient as Nuvex } from './core/client.js';

// Alternative exports for different use cases
export { NuvexClient as Client } from './core/client.js';
export { StorageEngine as Engine } from './core/engine.js';
