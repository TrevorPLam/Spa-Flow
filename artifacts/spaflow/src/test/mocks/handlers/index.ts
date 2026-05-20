import { authHandlers } from './auth';
import { clientHandlers } from './clients';
import { dashboardHandlers } from './dashboard';

/**
 * Combined MSW handlers
 * Following 2026 best practices: organized by feature
 */

export const handlers = [...authHandlers, ...clientHandlers, ...dashboardHandlers];
