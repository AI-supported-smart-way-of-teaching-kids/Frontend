// Get jest-expo preset but override setupFiles to avoid react-native jest mock issues
const jestExpoPreset = require('jest-expo/jest-preset');

module.exports = {
  ...jestExpoPreset,
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: [
    ...(jestExpoPreset.setupFilesAfterEnv || []),
    '@testing-library/jest-native/extend-expect',
  ],
  moduleNameMapper: {
    '\\.(png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|@unimodules|unimodules|react-native-gesture-handler|@react-navigation|expo-font|@expo/vector-icons)/)',
  ],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': [
      'babel-jest',
      {
        presets: [
          'module:metro-react-native-babel-preset',
          '@babel/preset-flow',
        ],
        plugins: ['@babel/plugin-transform-flow-strip-types'],
      },
    ],
  },
  testEnvironment: 'node',
  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'src/**/*.{js,jsx,ts,tsx}',
    'contexts/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/__mocks__/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/jest.setup.js',
    '!**/babel.config.js',
    '!**/metro.config.js',
  ],
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
  ],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/__mocks__/',
    '/coverage/',
    '\\.config\\.js$',
    'jest.setup.js',
  ],
};
