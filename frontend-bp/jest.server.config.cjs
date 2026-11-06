module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/server/**/*.spec.cjs'],
  collectCoverageFrom: [
    'server/**/*.cjs',
    '!server/**/*.spec.cjs',
    '!server/start.cjs',
    '!server/dev.cjs',
  ],
  coverageDirectory: 'coverage-server',
  coverageThreshold: { global: { branches: 70, functions: 70, lines: 70, statements: 70 } },
  coverageReporters: ['text', 'html', 'json-summary'],
};
