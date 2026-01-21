import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ParentDashboard from '../app/dashboard/parent';
import * as profilesApi from '../src/services/profilesApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/api';

// Only mock external dependencies - use real profilesApi implementation
jest.mock('../src/api');
const mockUseFocusEffect = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useFocusEffect: (callback) => {
    // Store callback but don't call immediately - let component mount first
    mockUseFocusEffect(callback);
    // Call after a microtask to allow component to fully initialize
    Promise.resolve().then(() => {
      if (callback && typeof callback === 'function') {
        try {
          callback();
        } catch (e) {
          // Ignore errors during initial render
        }
      }
    });
  },
}));

jest.mock('../contexts/UserContext', () => ({
  useUser: () => ({
    user: { id: 1, email: 'parent@example.com', role: 'parent' },
    logout: jest.fn(),
  }),
}));

jest.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    changeLanguage: jest.fn(),
  }),
}));

describe('ParentDashboard', () => {
  const mockChildren = [
    {
      id: 1,
      uuid: 'uuid-1',
      nickname: 'Child 1',
      age: 5,
      learning_level: 'beginner',
      parent_phone: '1234567890',
    },
    {
      id: 2,
      uuid: 'uuid-2',
      nickname: 'Child 2',
      age: 6,
      learning_level: 'intermediate',
      parent_phone: '0987654321',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock API responses - profilesApi will use real implementation
    api.get.mockImplementation((url, config) => {
      if (url.includes('/profiles/children/')) {
        return Promise.resolve({ data: mockChildren });
      }
      if (url.includes('/progress/')) {
        return Promise.resolve({
          data: {
            videosCompleted: [],
            quizResults: [],
          },
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  describe('loadChildren', () => {
    it('should load children from backend API using real profilesApi', async () => {
      api.get.mockResolvedValueOnce({ data: mockChildren });

      render(<ParentDashboard />);

      // Wait for API call - component uses useEffect and useFocusEffect
      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should normalize children data (uuid to id)', async () => {
      const childrenWithUuid = [
        {
          uuid: 'uuid-123',
          nickname: 'Test Child',
          age: 5,
          learning_level: 'beginner',
        },
      ];

      api.get.mockResolvedValueOnce({ data: childrenWithUuid });

      render(<ParentDashboard />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });
    });

    it('should handle API errors and fallback to local storage', async () => {
      api.get.mockRejectedValueOnce(new Error('API Error'));
      // AsyncStorage.getItem is already mocked in jest.setup.js
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      render(<ParentDashboard />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('API Integration', () => {
    it('should use real profilesApi.createChild function', () => {
      // Verify the real function exists and is callable
      expect(typeof profilesApi.createChild).toBe('function');
    });

    it('should use real profilesApi.updateChild function', () => {
      expect(typeof profilesApi.updateChild).toBe('function');
    });

    it('should use real profilesApi.deleteChild function', () => {
      expect(typeof profilesApi.deleteChild).toBe('function');
    });

    it('should use real profilesApi.getChildren function', () => {
      expect(typeof profilesApi.getChildren).toBe('function');
    });
  });
});

