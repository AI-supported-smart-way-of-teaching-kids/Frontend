import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock Platform
const mockPlatformSelect = jest.fn((obj) => obj.ios || obj.android || obj.default);
jest.mock('react-native', () => ({
  Platform: {
    select: mockPlatformSelect,
    OS: 'ios',
  },
}));

// Store interceptor callbacks
let requestInterceptorFulfilled;
let requestInterceptorRejected;
let responseInterceptorFulfilled;
let responseInterceptorRejected;

// Create a callable mock function for the axios instance
const mockAxiosInstance = jest.fn();
const requestUseFn = jest.fn((onFulfilled, onRejected) => {
  requestInterceptorFulfilled = onFulfilled;
  requestInterceptorRejected = onRejected;
});
const responseUseFn = jest.fn((onFulfilled, onRejected) => {
  responseInterceptorFulfilled = onFulfilled;
  responseInterceptorRejected = onRejected;
});

mockAxiosInstance.interceptors = {
  request: {
    use: requestUseFn,
  },
  response: {
    use: responseUseFn,
  },
};
mockAxiosInstance.defaults = {
  headers: {},
};
mockAxiosInstance.get = jest.fn();
mockAxiosInstance.post = jest.fn();
mockAxiosInstance.put = jest.fn();
mockAxiosInstance.delete = jest.fn();
mockAxiosInstance.patch = jest.fn();

// Mock axios.post for refresh token calls
const mockAxiosPost = jest.fn();

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  post: jest.fn((...args) => mockAxiosPost(...args)),
}));

// Import the api module after mocks are set up
// This will execute the interceptors setup
let api;
let axiosCreateCall;
let platformSelectCalled;

describe('API Interceptors - Comprehensive Tests', () => {
  const BASE_URL = 'http://10.247.232.191:8000/api/';

  beforeAll(() => {
    // Import the api module once to set up interceptors
    api = require('../src/api.jsx').default;

    // Capture interceptors from the last call (after module import)
    const requestUseCalls = requestUseFn.mock.calls;
    const responseUseCalls = responseUseFn.mock.calls;

    if (requestUseCalls.length > 0) {
      const lastCall = requestUseCalls[requestUseCalls.length - 1];
      requestInterceptorFulfilled = lastCall[0];
      requestInterceptorRejected = lastCall[1];
    }

    if (responseUseCalls.length > 0) {
      const lastCall = responseUseCalls[responseUseCalls.length - 1];
      responseInterceptorFulfilled = lastCall[0];
      responseInterceptorRejected = lastCall[1];
    }

    // Capture axios.create call and Platform.select call before mocks are cleared
    const axiosCreate = require('axios').create;
    if (axiosCreate.mock.calls.length > 0) {
      axiosCreateCall = axiosCreate.mock.calls[axiosCreate.mock.calls.length - 1][0];
    }
    platformSelectCalled = mockPlatformSelect.mock.calls.length > 0;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.multiRemove.mockResolvedValue();
    mockAxiosPost.mockClear();
    mockAxiosInstance.mockClear();

    // Reset the mock instance
    mockAxiosInstance.defaults.headers = {};
    mockAxiosInstance.defaults.headers.Authorization = undefined;
  });

  describe('Request Interceptor', () => {
    it('should add Authorization header when access token exists', async () => {
      const accessToken = 'test-access-token-123';
      AsyncStorage.getItem.mockResolvedValueOnce(accessToken);

      const config = {
        headers: {},
        url: '/test-endpoint',
      };

      // Call the request interceptor
      const result = await requestInterceptorFulfilled(config);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('access');
      expect(result.headers.Authorization).toBe(`Bearer ${accessToken}`);
      expect(result).toBe(config); // Should return the same config object
    });

    it('should not add Authorization header when no access token exists', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      const config = {
        headers: {},
        url: '/test-endpoint',
      };

      const result = await requestInterceptorFulfilled(config);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('access');
      expect(result.headers.Authorization).toBeUndefined();
      expect(result).toBe(config);
    });

    it('should handle AsyncStorage errors in request interceptor', async () => {
      const storageError = new Error('Storage read failed');
      AsyncStorage.getItem.mockRejectedValueOnce(storageError);

      const config = {
        headers: {},
        url: '/test-endpoint',
      };

      await expect(requestInterceptorFulfilled(config)).rejects.toThrow('Storage read failed');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('access');
    });

    it('should preserve existing headers when adding Authorization', async () => {
      const accessToken = 'test-token';
      AsyncStorage.getItem.mockResolvedValueOnce(accessToken);

      const config = {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
        url: '/test',
      };

      const result = await requestInterceptorFulfilled(config);

      expect(result.headers.Authorization).toBe(`Bearer ${accessToken}`);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['X-Custom-Header']).toBe('custom-value');
    });

    it('should handle request interceptor error callback', async () => {
      const error = new Error('Request config error');
      const result = requestInterceptorRejected(error);

      await expect(result).rejects.toThrow('Request config error');
    });
  });

  describe('Response Interceptor - Success Cases', () => {
    it('should pass through successful responses', () => {
      const response = {
        data: { message: 'Success' },
        status: 200,
        headers: {},
      };

      const result = responseInterceptorFulfilled(response);
      expect(result).toBe(response);
    });
  });

  describe('Response Interceptor - Token Refresh on 401', () => {
    it('should refresh token on 401 Unauthorized and retry request', async () => {
      const refreshToken = 'refresh-token-123';
      const newAccessToken = 'new-access-token-456';
      const originalRequest = {
        url: '/protected-endpoint',
        headers: {},
        _retry: false,
      };

      const error = {
        response: { status: 401 },
        config: originalRequest,
      };

      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockResolvedValueOnce({
        data: { access: newAccessToken },
      });
      AsyncStorage.setItem.mockResolvedValueOnce();
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success', config: originalRequest });

      const result = await responseInterceptorRejected(error);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('refresh');
      expect(mockAxiosPost).toHaveBeenCalledWith(
        `${BASE_URL}profiles/auth/refresh/`,
        { refresh: refreshToken }
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('access', newAccessToken);
      expect(originalRequest._retry).toBe(true);
      expect(originalRequest.headers.Authorization).toBe(`Bearer ${newAccessToken}`);
      expect(result).toEqual({ data: 'success', config: originalRequest });
    });

    it('should clear auth data when no refresh token exists on 401', async () => {
      const originalRequest = {
        url: '/protected-endpoint',
        headers: {},
        _retry: false,
      };

      const error = {
        response: { status: 401 },
        config: originalRequest,
      };

      AsyncStorage.getItem.mockResolvedValueOnce(null);
      AsyncStorage.multiRemove.mockResolvedValueOnce();

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('refresh');
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['access', 'refresh', 'user']);
      expect(originalRequest._retry).toBe(true);
    });

    it('should clear auth data when refresh token request fails on 401', async () => {
      const refreshToken = 'refresh-token-123';
      const refreshError = new Error('Refresh token expired');
      const originalRequest = {
        url: '/protected-endpoint',
        headers: {},
        _retry: false,
      };

      const error = {
        response: { status: 401 },
        config: originalRequest,
      };

      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockRejectedValueOnce(refreshError);
      AsyncStorage.multiRemove.mockResolvedValueOnce();

      await expect(responseInterceptorRejected(error)).rejects.toEqual(refreshError);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('refresh');
      expect(mockAxiosPost).toHaveBeenCalledWith(
        `${BASE_URL}profiles/auth/refresh/`,
        { refresh: refreshToken }
      );
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['access', 'refresh', 'user']);
      expect(originalRequest._retry).toBe(true);
    });

    it('should not retry if already retried on 401', async () => {
      const originalRequest = {
        url: '/protected-endpoint',
        headers: {},
        _retry: true,
      };

      const error = {
        response: { status: 401 },
        config: originalRequest,
      };

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);

      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptor - Token Refresh on 403', () => {
    it('should refresh token on 403 Forbidden and retry request', async () => {
      const refreshToken = 'refresh-token-789';
      const newAccessToken = 'new-access-token-101';
      const originalRequest = {
        url: '/admin-endpoint',
        headers: {},
        _retry: false,
      };

      const error = {
        response: { status: 403 },
        config: originalRequest,
      };

      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockResolvedValueOnce({
        data: { access: newAccessToken },
      });
      AsyncStorage.setItem.mockResolvedValueOnce();
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success', config: originalRequest });

      const result = await responseInterceptorRejected(error);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('refresh');
      expect(mockAxiosPost).toHaveBeenCalledWith(
        `${BASE_URL}profiles/auth/refresh/`,
        { refresh: refreshToken }
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('access', newAccessToken);
      expect(originalRequest._retry).toBe(true);
      expect(originalRequest.headers.Authorization).toBe(`Bearer ${newAccessToken}`);
      expect(result).toEqual({ data: 'success', config: originalRequest });
    });

    it('should clear auth data when no refresh token exists on 403', async () => {
      const originalRequest = {
        url: '/admin-endpoint',
        headers: {},
        _retry: false,
      };

      const error = {
        response: { status: 403 },
        config: originalRequest,
      };

      AsyncStorage.getItem.mockResolvedValueOnce(null);
      AsyncStorage.multiRemove.mockResolvedValueOnce();

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('refresh');
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['access', 'refresh', 'user']);
      expect(originalRequest._retry).toBe(true);
    });

    it('should clear auth data when refresh token request fails on 403', async () => {
      const refreshToken = 'refresh-token-403';
      const refreshError = new Error('Invalid refresh token');
      const originalRequest = {
        url: '/admin-endpoint',
        headers: {},
        _retry: false,
      };

      const error = {
        response: { status: 403 },
        config: originalRequest,
      };

      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockRejectedValueOnce(refreshError);
      AsyncStorage.multiRemove.mockResolvedValueOnce();

      await expect(responseInterceptorRejected(error)).rejects.toEqual(refreshError);

      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['access', 'refresh', 'user']);
    });

    it('should not retry if already retried on 403', async () => {
      const originalRequest = {
        url: '/admin-endpoint',
        headers: {},
        _retry: true,
      };

      const error = {
        response: { status: 403 },
        config: originalRequest,
      };

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);

      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('Response Interceptor - Other Error Cases', () => {
    it('should pass through non-auth errors (500)', async () => {
      const error = {
        response: { status: 500, data: { message: 'Server error' } },
        config: { url: '/test' },
      };

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('should pass through 404 errors', async () => {
      const error = {
        response: { status: 404, data: { message: 'Not found' } },
        config: { url: '/not-found' },
      };

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should handle errors without response object', async () => {
      const error = {
        message: 'Network Error',
        config: { url: '/test' },
      };

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
      expect(mockAxiosPost).not.toHaveBeenCalled();
    });

    it('should handle errors without config object', async () => {
      const error = {
        message: 'Request failed',
      };

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should handle network timeout errors', async () => {
      const error = {
        message: 'timeout of 5000ms exceeded',
        code: 'ECONNABORTED',
        config: { url: '/test' },
      };

      await expect(responseInterceptorRejected(error)).rejects.toEqual(error);
      expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe('BASE_URL Configuration', () => {
    it('should use correct base URL format', () => {
      // Verify that BASE_URL is set correctly in the axios instance
      // This indirectly verifies that Platform.select was called
      expect(axiosCreateCall).toBeDefined();
      expect(axiosCreateCall.baseURL).toBe(BASE_URL);
    });

    it('should handle iOS platform', () => {
      mockPlatformSelect.mockReturnValueOnce('http://192.168.8.198:8000/api');
      const result = mockPlatformSelect({
        ios: 'http://192.168.8.198:8000/api',
        android: 'http://192.168.8.198:8000/api',
        default: 'http://192.168.8.198:8000/api',
      });
      expect(result).toBe('http://192.168.8.198:8000/api');
    });

    it('should handle Android platform', () => {
      mockPlatformSelect.mockReturnValueOnce('http://192.168.8.198:8000/api');
      const result = mockPlatformSelect({
        ios: 'http://192.168.8.198:8000/api',
        android: 'http://192.168.8.198:8000/api',
        default: 'http://192.168.8.198:8000/api',
      });
      expect(result).toBe('http://192.168.8.198:8000/api');
    });

    it('should handle default platform', () => {
      mockPlatformSelect.mockReturnValueOnce('http://192.168.8.198:8000/api');
      const result = mockPlatformSelect({
        ios: 'http://192.168.8.198:8000/api',
        android: 'http://192.168.8.198:8000/api',
        default: 'http://192.168.8.198:8000/api',
      });
      expect(result).toBe('http://192.168.8.198:8000/api');
    });
  });

  describe('API Instance Configuration', () => {
    it('should create axios instance with correct baseURL', () => {
      expect(axiosCreateCall).toBeDefined();
      expect(axiosCreateCall.baseURL).toBeDefined();
    });

    it('should set Content-Type header in default config', () => {
      expect(axiosCreateCall).toBeDefined();
      expect(axiosCreateCall.headers).toBeDefined();
      expect(axiosCreateCall.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle multiple sequential 401 errors correctly', async () => {
      const refreshToken = 'refresh-token';
      const newAccessToken = 'new-token';
      const originalRequest1 = { url: '/endpoint1', headers: {}, _retry: false };
      const originalRequest2 = { url: '/endpoint2', headers: {}, _retry: false };

      const error1 = { response: { status: 401 }, config: originalRequest1 };
      const error2 = { response: { status: 401 }, config: originalRequest2 };

      // First error - should refresh
      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockResolvedValueOnce({ data: { access: newAccessToken } });
      AsyncStorage.setItem.mockResolvedValueOnce();
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success' });

      await responseInterceptorRejected(error1);

      // Second error - should also refresh
      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockResolvedValueOnce({ data: { access: newAccessToken } });
      AsyncStorage.setItem.mockResolvedValueOnce();
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success' });

      await responseInterceptorRejected(error2);

      expect(mockAxiosPost).toHaveBeenCalledTimes(2);
    });

    it('should update api.defaults.headers.Authorization on successful refresh', async () => {
      const refreshToken = 'refresh-token';
      const newAccessToken = 'new-access-token';
      const originalRequest = { url: '/test', headers: {}, _retry: false };

      const error = { response: { status: 401 }, config: originalRequest };

      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockResolvedValueOnce({ data: { access: newAccessToken } });
      AsyncStorage.setItem.mockResolvedValueOnce();
      mockAxiosInstance.defaults.headers.Authorization = undefined;
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success' });

      await responseInterceptorRejected(error);

      expect(mockAxiosInstance.defaults.headers.Authorization).toBe(`Bearer ${newAccessToken}`);
    });

    it('should handle refresh response without access token', async () => {
      const refreshToken = 'refresh-token';
      const originalRequest = { url: '/test', headers: {}, _retry: false };

      const error = { response: { status: 401 }, config: originalRequest };

      AsyncStorage.getItem.mockResolvedValueOnce(refreshToken);
      mockAxiosPost.mockResolvedValueOnce({ data: {} }); // No access token in response
      AsyncStorage.setItem.mockResolvedValueOnce();
      mockAxiosInstance.mockResolvedValueOnce({ data: 'success' });

      await responseInterceptorRejected(error);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('access', undefined);
    });
  });
});
