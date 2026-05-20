// @ts-nocheck
import { vi } from 'vitest';

// Mock Twilio SMS API
export const mockTwilioClient = {
  messages: {
    create: vi.fn(),
  },
};

// Mock successful SMS response
export const createMockSmsResponse = (overrides = {}) => ({
  sid: 'SMtest123',
  status: 'queued',
  to: '+15551234567',
  from: '+15559876543',
  body: 'Test message',
  ...overrides,
});

// Mock failed SMS response
export const createMockSmsError = (message = 'SMS failed') => ({
  status: 400,
  message,
  moreInfo: 'https://www.twilio.com/docs/errors',
});
