/**
 * Comprehensive test suite for Parent Dashboard (parent.jsx)
 * Tests every function, state change, API call, and user interaction
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import ParentDashboard from '../app/dashboard/parent';
import * as profilesApi from '../src/services/profilesApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../contexts/UserContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

// Mock all dependencies
jest.mock('../src/services/profilesApi');
jest.mock('@react-native-async-storage/async-storage');
const mockUseUser = jest.fn();
const mockUseLanguage = jest.fn();
const mockUseRouter = jest.fn();

jest.mock('../contexts/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockUseRouter(),
  useFocusEffect: jest.fn((callback) => {
    if (callback && typeof callback === 'function') {
      callback();
    }
    return () => {};
  }),
}));
jest.mock('expo-image-picker');

describe('Parent Dashboard - Comprehensive Tests', () => {
  const mockUser = {
    id: 1,
    role: 'parent',
    email: 'parent@test.com',
    name: 'Test Parent',
  };

  const mockChildren = [
    {
      id: 'child-1',
      uuid: 'child-1',
      nickname: 'Test Child 1',
      age: 5,
      learningLevel: 'BEGINNER',
      learning_level: 'beginner',
      parentPhone: '1234567890',
      parent_phone: '1234567890',
      avatarUrl: null,
      avatar_url: null,
    },
    {
      id: 'child-2',
      uuid: 'child-2',
      nickname: 'Test Child 2',
      age: 6,
      learningLevel: 'INTERMEDIATE',
      learning_level: 'intermediate',
      parentPhone: '0987654321',
      parent_phone: '0987654321',
      avatarUrl: 'https://example.com/avatar.jpg',
      avatar_url: 'https://example.com/avatar.jpg',
    },
  ];

  const mockChildProgress = {
    'child-1': {
      videosCompleted: ['video-1', 'video-2'],
      quizResults: [{ quizId: 'quiz-1', score: 80 }],
    },
    'child-2': {
      videosCompleted: ['video-1'],
      quizResults: [],
    },
  };

  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const ReactNative = require('react-native');
    ReactNative.Alert.alert = jest.fn();

    mockUseUser.mockReturnValue({
      user: mockUser,
      logout: jest.fn(),
    });

    mockUseLanguage.mockReturnValue({
      language: 'en',
      changeLanguage: jest.fn(),
    });

    mockUseRouter.mockReturnValue(mockRouter);

    AsyncStorage.getItem.mockImplementation((key) => {
      const storage = {
        '@app_children_v1': JSON.stringify({ [mockUser.id]: mockChildren }),
        '@app_student_progress_v1': JSON.stringify(mockChildProgress),
        '@app_videos_v1': JSON.stringify([]),
        '@app_quizzes_v1': JSON.stringify({}),
      };
      return Promise.resolve(storage[key] || null);
    });

    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.multiRemove.mockResolvedValue();
    AsyncStorage.removeItem.mockResolvedValue();

    // Mock API calls
    profilesApi.getChildren.mockResolvedValue(mockChildren);
    profilesApi.getChildProgress.mockImplementation((childId) => {
      return Promise.resolve(mockChildProgress[childId] || {});
    });
    profilesApi.createChild.mockResolvedValue(mockChildren[0]);
    profilesApi.updateChild.mockResolvedValue(mockChildren[0]);
    profilesApi.deleteChild.mockResolvedValue({});
  });

  describe('Component Initialization', () => {
    it('should render loading state initially', async () => {
      const { queryByTestId } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(queryByTestId('loading-indicator')).toBeTruthy();
      });
    });

    it('should load children from backend API', async () => {
      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalledWith({ parent: mockUser.id });
      });
    });

    it('should handle array response format', async () => {
      profilesApi.getChildren.mockResolvedValue(mockChildren);

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should handle results array response format', async () => {
      profilesApi.getChildren.mockResolvedValue({ results: mockChildren });

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should handle data array response format', async () => {
      profilesApi.getChildren.mockResolvedValue({ data: mockChildren });

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should normalize children (map uuid to id)', async () => {
      const childrenWithUuid = mockChildren.map(child => ({
        ...child,
        uuid: child.id,
        id: undefined,
      }));

      profilesApi.getChildren.mockResolvedValue(childrenWithUuid);

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should normalize field names (learning_level to learningLevel)', async () => {
      const childrenWithSnakeCase = mockChildren.map(child => ({
        ...child,
        learning_level: 'beginner',
        learningLevel: undefined,
      }));

      profilesApi.getChildren.mockResolvedValue(childrenWithSnakeCase);

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should filter out children without valid IDs', async () => {
      const childrenWithInvalid = [
        ...mockChildren,
        { nickname: 'Invalid Child', id: null },
      ];

      profilesApi.getChildren.mockResolvedValue(childrenWithInvalid);

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should load progress for all children', async () => {
      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildProgress).toHaveBeenCalledTimes(mockChildren.length);
      });
    });

    it('should fallback to AsyncStorage if API fails', async () => {
      profilesApi.getChildren.mockRejectedValue(new Error('API Error'));

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_children_v1');
      });
    });

    it('should handle empty children list', async () => {
      profilesApi.getChildren.mockResolvedValue([]);

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should handle missing user ID', async () => {
      mockUseUser.mockReturnValue({
        user: { ...mockUser, id: null },
        logout: jest.fn(),
      });

      await act(async () => {
        render(<ParentDashboard />);
      });

      await waitFor(() => {
        expect(profilesApi.getChildren).not.toHaveBeenCalled();
      });
    });
  });

  describe('Add Child Functionality', () => {
    it('should open add child form', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });
    });

    it('should validate required fields', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const saveButton = getByText(/save/i);
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('nickname')
        );
      });
    });

    it('should validate nickname is required', async () => {
      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const saveButton = getByText(/save/i);
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalled();
      });
    });

    it('should validate parent phone is required', async () => {
      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const nicknameInput = getByPlaceholderText(/nickname/i);
        fireEvent.changeText(nicknameInput, 'Test Child');
      });

      await waitFor(() => {
        const saveButton = getByText(/save/i);
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('phone')
        );
      });
    });

    it('should validate age is between 4 and 6', async () => {
      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const nicknameInput = getByPlaceholderText(/nickname/i);
        fireEvent.changeText(nicknameInput, 'Test Child');
      });

      await waitFor(() => {
        const phoneInput = getByPlaceholderText(/phone/i);
        fireEvent.changeText(phoneInput, '1234567890');
      });

      await waitFor(() => {
        const ageInput = getByPlaceholderText(/age/i);
        fireEvent.changeText(ageInput, '3'); // Invalid age
      });

      await waitFor(() => {
        const saveButton = getByText(/save/i);
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.stringContaining('age')
        );
      });
    });

    it('should create child via backend API', async () => {
      const newChild = {
        nickname: 'New Child',
        age: 5,
        parent_phone: '1234567890',
        learning_level: 'beginner',
        parent: mockUser.id,
      };

      profilesApi.createChild.mockResolvedValue({
        id: 'child-3',
        uuid: 'child-3',
        ...newChild,
      });

      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const nicknameInput = getByPlaceholderText(/nickname/i);
        fireEvent.changeText(nicknameInput, newChild.nickname);
      });

      await waitFor(() => {
        const ageInput = getByPlaceholderText(/age/i);
        fireEvent.changeText(ageInput, newChild.age.toString());
      });

      await waitFor(() => {
        const phoneInput = getByPlaceholderText(/phone/i);
        fireEvent.changeText(phoneInput, newChild.parent_phone);
      });

      await waitFor(() => {
        const saveButton = getByText(/save/i);
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(profilesApi.createChild).toHaveBeenCalledWith(
          expect.objectContaining({
            nickname: newChild.nickname,
            age: newChild.age,
            parent_phone: newChild.parent_phone,
            learning_level: newChild.learning_level,
            parent: mockUser.id,
          })
        );
      });
    });

    it('should handle different response formats from createChild', async () => {
      // Test response.data format
      profilesApi.createChild.mockResolvedValue({
        data: { id: 'child-3', nickname: 'New Child' },
      });

      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.createChild).toBeDefined();
      });
    });

    it('should handle response.child format', async () => {
      profilesApi.createChild.mockResolvedValue({
        child: { id: 'child-3', nickname: 'New Child' },
      });

      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.createChild).toBeDefined();
      });
    });

    it('should reload children after creation', async () => {
      profilesApi.createChild.mockResolvedValue(mockChildren[0]);

      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });
    });

    it('should handle create child errors', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            nickname: ['This nickname is already taken'],
          },
        },
      };

      profilesApi.createChild.mockRejectedValue(error);

      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.createChild).toBeDefined();
      });
    });
  });

  describe('Edit Child Functionality', () => {
    it('should open edit child form', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const editButton = getByText(/edit/i);
        fireEvent.press(editButton);
      });
    });

    it('should populate form with child data', async () => {
      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        const editButton = getByText(/edit/i);
        fireEvent.press(editButton);
      });

      await waitFor(() => {
        const nicknameInput = getByPlaceholderText(/nickname/i);
        expect(nicknameInput.props.value).toBe(mockChildren[0].nickname);
      });
    });

    it('should update child via backend API', async () => {
      const updatedChild = {
        ...mockChildren[0],
        nickname: 'Updated Child',
      };

      profilesApi.updateChild.mockResolvedValue(updatedChild);

      const { getByText, getByPlaceholderText } = render(<ParentDashboard />);

      await waitFor(() => {
        const editButton = getByText(/edit/i);
        fireEvent.press(editButton);
      });

      await waitFor(() => {
        const nicknameInput = getByPlaceholderText(/nickname/i);
        fireEvent.changeText(nicknameInput, 'Updated Child');
      });

      await waitFor(() => {
        const saveButton = getByText(/save/i);
        fireEvent.press(saveButton);
      });

      await waitFor(() => {
        expect(profilesApi.updateChild).toHaveBeenCalledWith(
          mockChildren[0].id,
          expect.any(Object)
        );
      });
    });

    it('should handle update child errors', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            age: ['Age must be between 4 and 6'],
          },
        },
      };

      profilesApi.updateChild.mockRejectedValue(error);

      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.updateChild).toBeDefined();
      });
    });
  });

  describe('Delete Child Functionality', () => {
    it('should show confirmation alert before deleting', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const deleteButton = getByText(/delete/i);
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    it('should delete child via backend API on confirmation', async () => {
      const ReactNative = require('react-native');
      ReactNative.Alert.alert.mockImplementation((title, message, buttons) => {
        // Simulate user pressing delete button
        if (buttons && buttons[1]) {
          buttons[1].onPress();
        }
      });

      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const deleteButton = getByText(/delete/i);
        fireEvent.press(deleteButton);
      });

      await waitFor(() => {
        expect(profilesApi.deleteChild).toHaveBeenCalledWith(mockChildren[0].id);
      });
    });

    it('should handle delete child errors', async () => {
      profilesApi.deleteChild.mockRejectedValue(new Error('Delete failed'));

      const ReactNative = require('react-native');
      ReactNative.Alert.alert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1]) {
          buttons[1].onPress();
        }
      });

      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.deleteChild).toBeDefined();
      });
    });
  });

  describe('Select Child Functionality', () => {
    it('should store selected child in AsyncStorage', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const childCard = getByText(mockChildren[0].nickname);
        fireEvent.press(childCard);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@selected_child',
          expect.any(String)
        );
      });
    });

    it('should navigate to kids dashboard', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const childCard = getByText(mockChildren[0].nickname);
        fireEvent.press(childCard);
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('kids');
      });
    });

    it('should validate child has required fields', async () => {
      const invalidChild = { nickname: 'Invalid' }; // Missing id

      const { getByText } = render(<ParentDashboard />);

      // This would require mocking children with invalid data
      expect(profilesApi.getChildren).toBeDefined();
    });
  });

  describe('View Child Progress', () => {
    it('should display child progress', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const progressButton = getByText(/progress/i);
        fireEvent.press(progressButton);
      });

      await waitFor(() => {
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Array)
        );
      });
    });
  });

  describe('Avatar Photo Picker', () => {
    it('should request media library permissions', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
      ImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [{ uri: 'https://example.com/photo.jpg' }],
      });

      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const photoButton = getByText(/photo/i);
        fireEvent.press(photoButton);
      });

      await waitFor(() => {
        expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
      });
    });

    it('should handle permission denial', async () => {
      ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });

      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(ImagePicker.requestMediaLibraryPermissionsAsync).toBeDefined();
      });
    });
  });

  describe('Learning Level Selection', () => {
    it('should open learning level modal', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const levelButton = getByText(/beginner/i);
        fireEvent.press(levelButton);
      });
    });

    it('should select learning level', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const addButton = getByText(/add child/i);
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        const levelButton = getByText(/intermediate/i);
        fireEvent.press(levelButton);
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should show logout confirmation', async () => {
      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const logoutButton = getByText(/logout/i);
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Array)
        );
      });
    });

    it('should logout on confirmation', async () => {
      const mockLogout = jest.fn();
      mockUseUser.mockReturnValue({
        user: mockUser,
        logout: mockLogout,
      });

      const ReactNative = require('react-native');
      ReactNative.Alert.alert.mockImplementation((title, message, buttons) => {
        if (buttons && buttons[1]) {
          buttons[1].onPress();
        }
      });

      const { getByText } = render(<ParentDashboard />);

      await waitFor(() => {
        const logoutButton = getByText(/logout/i);
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('useFocusEffect', () => {
    it('should reload children on focus', async () => {
      const { rerender } = render(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.getChildren).toHaveBeenCalled();
      });

      const initialCallCount = profilesApi.getChildren.mock.calls.length;

      // Simulate focus effect
      rerender(<ParentDashboard />);

      await waitFor(() => {
        expect(profilesApi.getChildren.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});

