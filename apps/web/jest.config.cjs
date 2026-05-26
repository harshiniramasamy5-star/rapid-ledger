/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest')
const createJestConfig = nextJest({ dir: './' })
module.exports = createJestConfig({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/', '/tests/'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
})
