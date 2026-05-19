import { vi } from 'vitest';

// Mock Square payment API
export const mockSquarePaymentsApi = {
  createPayment: vi.fn(),
  cancelPaymentById: vi.fn(),
  getPayment: vi.fn(),
};

export const mockSquareClient = {
  paymentsApi: mockSquarePaymentsApi,
};

// Mock successful payment response
export const createMockPaymentResponse = (overrides = {}) => ({
  id: 'sq-payment-test',
  status: 'COMPLETED',
  amountMoney: {
    amount: 1000,
    currency: 'USD',
  },
  createdAt: new Date().toISOString(),
  ...overrides,
});

// Mock failed payment response
export const createMockPaymentError = (message = 'Payment failed') => ({
  errors: [{ message }],
});
