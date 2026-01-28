export default {
  testEnvironment: 'jsdom',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/scripts/'
  ],
  transform: {},
  moduleFileExtensions: ['js'],
  testMatch: [
    '**/__tests__/**/*.test.js'
  ]
};
