/**
 * Nuvex - Core Module Exports
 * Next-gen Unified Vault Experience
 * 
 * Clean exports for all core components
 * 
 * @author Waren Gonzaga, WG Technology Labs
 * @version 1.0.0
 * @since 2025
 */

// Core storage engine
export { StorageEngine } from './engine.js';

// Main client interface
export { NuvexClient } from './client.js';

// Database utilities
export * from './database.js';

// Convenience exports
export { NuvexClient as Client } from './client.js';
export { StorageEngine as Engine } from './engine.js';
