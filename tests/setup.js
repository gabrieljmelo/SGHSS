// Setup file for Jest tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_testing_only';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters';

// Disable console logs during tests unless specifically needed
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
