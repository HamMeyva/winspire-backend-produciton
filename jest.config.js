module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  testMatch: ['**/test/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  setupFilesAfterEnv: ['./test/setup.js'],
}; 