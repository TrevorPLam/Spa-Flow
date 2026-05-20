import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW server setup for integration tests
 * Following 2026 best practices: network-level mocking
 */

export const server = setupServer(...handlers);
