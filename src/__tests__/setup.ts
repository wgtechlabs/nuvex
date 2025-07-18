/**
 * Jest Test Setup
 * Global test configuration and utilities with zero hardcoded credentials
 */

import { initializeTestEnvironment, validateTestEnvironment, cleanupTestEnvironment } from './fixtures/config.js';

// Initialize secure test environment
initializeTestEnvironment();

// Validate test environment
const validation = validateTestEnvironment();
if (!validation.isValid) {
  throw new Error('Test environment validation failed. Check configuration.');
}

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods during tests (optional)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  // Optionally suppress console output during tests
  // Uncomment the lines below if you want to suppress console output
  // console.error = jest.fn();
  // console.warn = jest.fn();
});

afterAll(() => {
  // Restore console methods
  console.error = originalError;
  console.warn = originalWarn;
  
  // Cleanup test environment
  cleanupTestEnvironment();
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom Jest matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

export {};
