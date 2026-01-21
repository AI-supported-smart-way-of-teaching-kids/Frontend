/**
 * Comprehensive test suite for Login/Signup (login.jsx)
 * Tests every function, state change, API call, and user interaction
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LoginPage from '../app/(drawer)/login';
import * as profilesApi from '../src/services/profilesApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

// Mock all dependencies
jest.mock('../src/services/profilesApi');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../contexts/UserContext', () => ({
  useUser: () => mockUseUser(),
}));

jest.mock('react-i18next');
const mockUseUser = jest.fn();
const mockUseRouter = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockUseTheme = jest.fn();

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => mockUseTheme(),
  ThemeProvider: ({ children }) => children,
}));

jest.mock('expo-router', () => ({
  useRouter: () => mockUseRouter(),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useFocusEffect: jest.fn((callback) => {
    if (callback && typeof callback === 'function') {
      callback();
    }
    return () => {};
  }),
}));

describe('Login/Signup - Comprehensive Tests', () => {
  const mockLogin = jest.fn();
  const mockRouter = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockLoginResponse = {
    access: 'access-token',
    refresh: 'refresh-token',
    user: {
      id: 1,
      email: 'test@example.com',
      role: 'parent',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseUser.mockReturnValue({
      login: mockLogin,
    });

    useTranslation.mockReturnValue({
      t: (key) => key,
    });

    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      toggleTheme: jest.fn(),
      colors: {
        text: '#000',
        background: '#fff',
        primary: '#4A90E2',
        card: '#f8f9fa',
        border: '#e9ecef',
      },
    });

    mockUseRouter.mockReturnValue(mockRouter);
    mockUseLocalSearchParams.mockReturnValue({});

    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.getItem.mockResolvedValue(null);
  });

  describe('Component Initialization', () => {
    it('should render login form by default', () => {
      const { getByPlaceholderText } = render(<LoginPage />);
      
      expect(getByPlaceholderText('email')).toBeTruthy();
      expect(getByPlaceholderText('password')).toBeTruthy();
    });

    it('should default to parent role', () => {
      const { getByText } = render(<LoginPage />);
      
      expect(getByText(/parent/i)).toBeTruthy();
    });

    it('should use role from URL params', () => {
      mockUseLocalSearchParams.mockReturnValue({ role: 'teacher' });

      const { getByText } = render(<LoginPage />);
      
      expect(getByText(/teacher/i)).toBeTruthy();
    });

    it('should handle array role param', () => {
      mockUseLocalSearchParams.mockReturnValue({ role: ['teacher'] });

      const { getByText } = render(<LoginPage />);
      
      expect(getByText(/teacher/i)).toBeTruthy();
    });
  });

  describe('Role Selection', () => {
    it('should switch between parent and teacher roles', () => {
      const { getByText } = render(<LoginPage />);

      const teacherTab = getByText(/teacher/i);
      fireEvent.press(teacherTab);

      expect(getByText(/teacher/i)).toBeTruthy();
    });

    it('should reset form fields when switching roles', () => {
      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const teacherTab = getByText(/teacher/i);
      fireEvent.press(teacherTab);

      expect(emailInput.props.value).toBe('');
    });
  });

  describe('Login Functionality', () => {
    it('should validate email and password are required', async () => {
      const { getByText } = render(<LoginPage />);

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(getByText('fillAllFields')).toBeTruthy();
      });
    });

    it('should trim email and password', async () => {
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, '  test@example.com  ');
      fireEvent.changeText(passwordInput, '  password123  ');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(profilesApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          role: 'parent',
        });
      });
    });

    it('should call login API with correct credentials', async () => {
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(profilesApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          role: 'parent',
        });
      });
    });

    it('should include role in login credentials', async () => {
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to teacher role
      const teacherTab = getByText(/teacher/i);
      fireEvent.press(teacherTab);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'teacher@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(profilesApi.login).toHaveBeenCalledWith({
          email: 'teacher@example.com',
          password: 'password123',
          role: 'teacher',
        });
      });
    });

    it('should update user context on successful login', async () => {
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(mockLoginResponse.user);
      });
    });

    it('should store role in AsyncStorage on login', async () => {
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('role', 'parent');
      });
    });

    it('should navigate to correct dashboard based on role', async () => {
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/parent');
      });
    });

    it('should handle 401 unauthorized error', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };

      profilesApi.login.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'wrong@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(getByText('invalidCredentials')).toBeTruthy();
      });
    });

    it('should handle 400 bad request error', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Invalid request' },
        },
      };

      profilesApi.login.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(getByText('Invalid request')).toBeTruthy();
      });
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');

      profilesApi.login.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(getByText('Network error')).toBeTruthy();
      });
    });

    it('should handle invalid response from server', async () => {
      profilesApi.login.mockResolvedValue({}); // Missing user field

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(getByText('Invalid response from server')).toBeTruthy();
      });
    });
  });

  describe('Signup Functionality', () => {
    it('should switch to signup mode', () => {
      const { getByText } = render(<LoginPage />);

      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      expect(getByPlaceholderText('fullName')).toBeTruthy();
    });

    it('should validate required fields', async () => {
      const { getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('fillAllFields')).toBeTruthy();
      });
    });

    it('should validate password length', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, '12345'); // Too short

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('passwordTooShort')).toBeTruthy();
      });
    });

    it('should validate password confirmation matches', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password456'); // Mismatch

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('passwordsNotMatch')).toBeTruthy();
      });
    });

    it('should split name into first_name and last_name', async () => {
      const mockRegisterResponse = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent',
      };

      profilesApi.register.mockResolvedValue(mockRegisterResponse);
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'John Doe');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(profilesApi.register).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'John Doe',
            first_name: 'John',
            last_name: 'Doe',
            email: 'test@example.com',
            password: 'password123',
            role: 'parent',
            username: 'test@example.com',
          })
        );
      });
    });

    it('should use full name as first_name if no space', async () => {
      const mockRegisterResponse = {
        id: 1,
        email: 'test@example.com',
        name: 'John',
        role: 'parent',
      };

      profilesApi.register.mockResolvedValue(mockRegisterResponse);
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'John');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(profilesApi.register).toHaveBeenCalledWith(
          expect.objectContaining({
            first_name: 'John',
            last_name: '',
          })
        );
      });
    });

    it('should automatically login after successful registration', async () => {
      const mockRegisterResponse = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent',
      };

      profilesApi.register.mockResolvedValue(mockRegisterResponse);
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(profilesApi.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          role: 'parent',
        });
      });
    });

    it('should handle registration with response.user', async () => {
      const mockRegisterResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'parent',
        },
      };

      profilesApi.register.mockResolvedValue(mockRegisterResponse);
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(profilesApi.register).toHaveBeenCalled();
      });
    });

    it('should handle registration with response.id', async () => {
      const mockRegisterResponse = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent',
      };

      profilesApi.register.mockResolvedValue(mockRegisterResponse);
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(profilesApi.register).toHaveBeenCalled();
      });
    });

    it('should handle registration errors - 400 status', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            email: ['This email is already registered'],
          },
        },
      };

      profilesApi.register.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('This email is already registered')).toBeTruthy();
      });
    });

    it('should handle registration errors - 409 status', async () => {
      const error = {
        response: {
          status: 409,
        },
      };

      profilesApi.register.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'existing@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('emailAlreadyExists')).toBeTruthy();
      });
    });

    it('should handle registration failure', async () => {
      const mockRegisterResponse = {}; // No user or id

      profilesApi.register.mockResolvedValue(mockRegisterResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('Registration failed')).toBeTruthy();
      });
    });

    it('should handle login failure after registration', async () => {
      const mockRegisterResponse = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'parent',
      };

      profilesApi.register.mockResolvedValue(mockRegisterResponse);
      profilesApi.login.mockResolvedValue({}); // No user field

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText('Registration successful but login failed')).toBeTruthy();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', () => {
      const { getByPlaceholderText, getByTestId } = render(<LoginPage />);

      const passwordInput = getByPlaceholderText('password');
      const toggleButton = getByTestId('password-toggle');

      expect(passwordInput.props.secureTextEntry).toBe(true);

      fireEvent.press(toggleButton);

      expect(passwordInput.props.secureTextEntry).toBe(false);
    });
  });

  describe('Forgot Password', () => {
    it('should switch to forgot password mode', () => {
      const { getByText } = render(<LoginPage />);

      const forgotLink = getByText('forgotPassword');
      fireEvent.press(forgotLink);

      expect(getByText(/forgotPassword/i)).toBeTruthy();
    });

    it('should validate email is required for password reset', async () => {
      const { getByText } = render(<LoginPage />);

      const forgotLink = getByText('forgotPassword');
      fireEvent.press(forgotLink);

      const sendButton = getByText('sendResetLink');
      fireEvent.press(sendButton);

      await waitFor(() => {
        expect(getByText('Please enter your email')).toBeTruthy();
      });
    });

    it('should show alert on password reset', async () => {
      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const forgotLink = getByText('forgotPassword');
      fireEvent.press(forgotLink);

      const emailInput = getByPlaceholderText('email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const sendButton = getByText('sendResetLink');
      fireEvent.press(sendButton);

      await waitFor(() => {
        // Alert should be shown
        const ReactNative = require('react-native');
        expect(ReactNative.Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('Form Switching', () => {
    it('should switch from signin to signup', () => {
      const { getByText } = render(<LoginPage />);

      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      expect(getByPlaceholderText('fullName')).toBeTruthy();
    });

    it('should switch from signup to signin', () => {
      const { getByText } = render(<LoginPage />);

      // Go to signup first
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      // Then back to signin
      const signinLink = getByText(/alreadyHaveAccount/i);
      fireEvent.press(signinLink);

      expect(getByPlaceholderText('email')).toBeTruthy();
      expect(getByPlaceholderText('password')).toBeTruthy();
    });

    it('should clear error when switching forms', () => {
      const { getByText } = render(<LoginPage />);

      // Trigger an error
      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      // Error should be cleared
      expect(() => getByText('fillAllFields')).toThrow();
    });
  });

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      profilesApi.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(getByText(/signIn.../i)).toBeTruthy();
      });
    });

    it('should show loading state during signup', async () => {
      profilesApi.register.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to signup
      const signupLink = getByText(/dontHaveAccount/i);
      fireEvent.press(signupLink);

      const nameInput = getByPlaceholderText('fullName');
      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');
      const confirmPasswordInput = getByPlaceholderText('confirmPassword');

      fireEvent.changeText(nameInput, 'Test User');
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.changeText(confirmPasswordInput, 'password123');

      const createButton = getByText('createAccount');
      fireEvent.press(createButton);

      await waitFor(() => {
        expect(getByText(/createAccount.../i)).toBeTruthy();
      });
    });
  });

  describe('Role-based Routing', () => {
    it('should route parent to /dashboard/parent', async () => {
      profilesApi.login.mockResolvedValue(mockLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/parent');
      });
    });

    it('should route teacher to /dashboard/teacher', async () => {
      const teacherLoginResponse = {
        ...mockLoginResponse,
        user: { ...mockLoginResponse.user, role: 'teacher' },
      };

      profilesApi.login.mockResolvedValue(teacherLoginResponse);

      const { getByPlaceholderText, getByText } = render(<LoginPage />);

      // Switch to teacher
      const teacherTab = getByText(/teacher/i);
      fireEvent.press(teacherTab);

      const emailInput = getByPlaceholderText('email');
      const passwordInput = getByPlaceholderText('password');

      fireEvent.changeText(emailInput, 'teacher@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      const signInButton = getByText('signIn');
      fireEvent.press(signInButton);

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard/teacher');
      });
    });
  });
});

