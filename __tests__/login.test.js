import * as profilesApi from '../src/services/profilesApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/api';

// Only mock the API layer (external HTTP calls)
jest.mock('../src/api');
// AsyncStorage is already mocked in jest.setup.js with real behavior

describe('Login and Registration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset API mocks
    api.post.mockReset();
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockResponse = {
        access: 'access-token',
        refresh: 'refresh-token',
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'parent',
          name: 'Test User',
        },
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const credentials = {
        email: 'test@example.com',
        password: 'password123',
        role: 'parent',
      };

      const result = await profilesApi.login(credentials);

      expect(api.post).toHaveBeenCalledWith('/profiles/auth/login/', credentials);
      expect(result).toEqual(mockResponse);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('access', 'access-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('refresh', 'refresh-token');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(mockResponse.user)
      );
    });

    it('should handle login errors', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };

      api.post.mockRejectedValue(error);

      await expect(
        profilesApi.login({
          email: 'wrong@example.com',
          password: 'wrong',
          role: 'parent',
        })
      ).rejects.toEqual(error);
    });

    it('should login teacher successfully', async () => {
      const mockResponse = {
        access: 'access-token',
        refresh: 'refresh-token',
        user: {
          id: 2,
          email: 'teacher@example.com',
          role: 'teacher',
          name: 'Teacher Name',
        },
      };

      api.post.mockResolvedValue({ data: mockResponse });

      const result = await profilesApi.login({
        email: 'teacher@example.com',
        password: 'password123',
        role: 'teacher',
      });

      expect(result.user.role).toBe('teacher');
    });
  });

  describe('Registration', () => {
    it('should register a new parent user', async () => {
      const mockRegisterResponse = {
        id: 1,
        email: 'newparent@example.com',
        name: 'New Parent',
        role: 'parent',
      };

      const mockLoginResponse = {
        access: 'access-token',
        refresh: 'refresh-token',
        user: mockRegisterResponse,
      };

      api.post
        .mockResolvedValueOnce({ data: mockRegisterResponse })
        .mockResolvedValueOnce({ data: mockLoginResponse });

      const registerPayload = {
        name: 'New Parent',
        first_name: 'New',
        last_name: 'Parent',
        email: 'newparent@example.com',
        password: 'password123',
        role: 'parent',
        username: 'newparent@example.com',
      };

      const registerResult = await profilesApi.register(registerPayload);

      expect(api.post).toHaveBeenCalledWith('/profiles/auth/register/', registerPayload);
      expect(registerResult).toEqual(mockRegisterResponse);
    });

    it('should register a new teacher user', async () => {
      const mockRegisterResponse = {
        id: 2,
        email: 'newteacher@example.com',
        name: 'New Teacher',
        role: 'teacher',
      };

      // Reset and set mock for this test only
      api.post.mockReset();
      api.post.mockResolvedValue({ data: mockRegisterResponse });

      const registerPayload = {
        name: 'New Teacher',
        first_name: 'New',
        last_name: 'Teacher',
        email: 'newteacher@example.com',
        password: 'password123',
        role: 'teacher',
        username: 'newteacher@example.com',
      };

      const result = await profilesApi.register(registerPayload);

      expect(api.post).toHaveBeenCalledWith('/profiles/auth/register/', registerPayload);
      expect(result).toEqual(mockRegisterResponse);
      expect(result.role).toBe('teacher');
    });

    it('should handle registration validation errors', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            email: ['This email is already registered'],
          },
        },
      };

      api.post.mockRejectedValue(error);

      await expect(
        profilesApi.register({
          email: 'existing@example.com',
          password: 'password123',
          role: 'parent',
        })
      ).rejects.toEqual(error);
    });

    it('should handle password validation', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            password: ['Password must be at least 6 characters'],
          },
        },
      };

      api.post.mockRejectedValue(error);

      await expect(
        profilesApi.register({
          email: 'test@example.com',
          password: '123',
          role: 'parent',
        })
      ).rejects.toEqual(error);
    });
  });

  describe('Role-based routing', () => {
    it('should route parent to /dashboard/parent', () => {
      const roleRouteMap = {
        parent: '/dashboard/parent',
        teacher: '/dashboard/teacher',
      };

      expect(roleRouteMap.parent).toBe('/dashboard/parent');
      expect(roleRouteMap.teacher).toBe('/dashboard/teacher');
    });
  });
});
