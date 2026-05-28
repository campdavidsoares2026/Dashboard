import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Skip Playwright e2e specs — they run via `npm run test:e2e`
  testPathIgnorePatterns: ['/node_modules/', '/tests/', '/.next/'],
};

export default createJestConfig(config);
