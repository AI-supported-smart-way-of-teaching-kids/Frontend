# Testing Guide

This project uses Jest for unit testing. The test suite covers API services, authentication, and core business logic.

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run a specific test file
npm test -- profilesApi.test.js
```

## Test Structure

### Test Files

- `__tests__/profilesApi.test.js` - Tests for API service functions (login, register, CRUD operations)
- `__tests__/login.test.js` - Tests for authentication and registration flows
- `__tests__/childManagement.test.js` - Tests for child profile management
- `__tests__/teacherDashboard.test.js` - Tests for teacher dashboard functionality
- `__tests__/parentDashboard.test.js` - Tests for parent dashboard functionality

### Test Coverage

The tests cover:
- ✅ API service functions (profilesApi)
- ✅ Authentication (login/register)
- ✅ Child CRUD operations
- ✅ Teacher profile management
- ✅ Data normalization (uuid to id conversion)
- ✅ Error handling

## Writing New Tests

When adding new features, create corresponding test files following this pattern:

```javascript
import * as moduleToTest from '../path/to/module';

describe('ModuleName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('functionName', () => {
    it('should do something', async () => {
      // Arrange
      const mockData = { ... };
      
      // Act
      const result = await moduleToTest.functionName(mockData);
      
      // Assert
      expect(result).toEqual(expectedResult);
    });
  });
});
```

## Mocking

The `jest.setup.js` file contains mocks for:
- AsyncStorage
- expo-router
- React Native components
- Expo modules
- Context providers

## Known Issues

- React Native preset may have TypeScript syntax issues in some environments
- Component tests require additional setup for React Native Testing Library

## Future Improvements

- Add integration tests for full user flows
- Add component tests with React Native Testing Library
- Add E2E tests with Detox or similar
- Increase coverage threshold to 80%

















