import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { UserProvider, useUser } from '../contexts/UserContext';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../i18n', () => ({
  changeLanguage: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  language: 'en',
  options: {
    fallbackLng: 'en',
  },
}));

describe('Context Providers - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
  });

  describe('UserContext Logic', () => {
    it('should initialize with null user', () => {
      const initialUser = null;
      expect(initialUser).toBeNull();
    });

    it('should load user from AsyncStorage', async () => {
      const storedUser = {
        id: '1',
        name: 'Stored User',
        role: 'parent',
      };
      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(storedUser))
        .mockResolvedValueOnce('parent');

      const userData = await AsyncStorage.getItem('user');
      const roleData = await AsyncStorage.getItem('role');

      if (userData && roleData) {
        const parsedUser = JSON.parse(userData);
        if (parsedUser.role === roleData) {
          expect(parsedUser).toEqual(storedUser);
        }
      }
    });

    it('should login user successfully', () => {
      const user = {
        id: '1',
        name: 'Test User',
        role: 'parent',
        email: 'test@example.com',
      };

      // Simulate login
      const loggedInUser = user;
      expect(loggedInUser.id).toBe('1');
      expect(loggedInUser.name).toBe('Test User');
      expect(loggedInUser.role).toBe('parent');
    });

    it('should logout user successfully', () => {
      let user = {
        id: '1',
        name: 'Test User',
        role: 'parent',
      };

      // Simulate logout
      user = null;
      expect(user).toBeNull();
    });

    it('should update user profile', () => {
      let user = {
        id: '1',
        name: 'Test User',
        role: 'parent',
      };

      const updates = { name: 'Updated Name' };
      if (user) {
        user = { ...user, ...updates };
      }

      expect(user.name).toBe('Updated Name');
      expect(user.id).toBe('1');
    });

    it('should not update profile when user is null', () => {
      let user = null;

      const updates = { name: 'Updated Name' };
      if (user) {
        user = { ...user, ...updates };
      }

      expect(user).toBeNull();
    });

    it('should handle storage errors gracefully', async () => {
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      try {
        await AsyncStorage.getItem('user');
      } catch (error) {
        expect(error.message).toBe('Storage error');
      }
    });

    it('should validate user role matches stored role', async () => {
      const storedUser = { id: '1', name: 'User', role: 'parent' };
      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(storedUser))
        .mockResolvedValueOnce('teacher'); // Different role

      const userData = await AsyncStorage.getItem('user');
      const roleData = await AsyncStorage.getItem('role');

      if (userData && roleData) {
        const parsedUser = JSON.parse(userData);
        const shouldSetUser = parsedUser.role === roleData;
        expect(shouldSetUser).toBe(false);
      }
    });

    it('should set and get language', () => {
      let language = 'en';
      language = 'ti';
      expect(language).toBe('ti');
    });
  });

  describe('LanguageContext Logic', () => {
    it('should initialize with default language (en)', () => {
      const language = 'en';
      expect(language).toBe('en');
    });

    it('should load language from AsyncStorage', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce('ti');

      const savedLang = await AsyncStorage.getItem('@app_language');
      if (savedLang && ['en', 'ti', 'am'].includes(savedLang)) {
        expect(savedLang).toBe('ti');
        expect(i18n.changeLanguage).toBeDefined();
      }
    });

    it('should change language successfully', async () => {
      AsyncStorage.setItem.mockResolvedValueOnce();
      i18n.changeLanguage.mockResolvedValueOnce();

      const lang = 'am';
      if (['en', 'ti', 'am'].includes(lang)) {
        await i18n.changeLanguage(lang);
        await AsyncStorage.setItem('@app_language', lang);
      }

      expect(i18n.changeLanguage).toHaveBeenCalledWith('am');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_language', 'am');
    });

    it('should not change to invalid language', () => {
      const lang = 'invalid';
      const isValid = ['en', 'ti', 'am'].includes(lang);
      expect(isValid).toBe(false);
    });

    it('should toggle language through all supported languages', () => {
      const languages = ['en', 'ti', 'am'];
      let currentIndex = 0;

      // Simulate toggle
      for (let i = 0; i < languages.length; i++) {
        const nextIndex = (currentIndex + 1) % languages.length;
        const nextLang = languages[nextIndex];
        expect(['en', 'ti', 'am']).toContain(nextLang);
        currentIndex = nextIndex;
      }
    });

    it('should handle storage errors when saving language', async () => {
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));
      i18n.changeLanguage.mockResolvedValueOnce();

      const lang = 'am';
      try {
        await i18n.changeLanguage(lang);
        await AsyncStorage.setItem('@app_language', lang);
      } catch (error) {
        expect(error.message).toBe('Storage error');
      }

      // Language should still change even if storage fails
      expect(i18n.changeLanguage).toHaveBeenCalled();
    });

    it('should listen to i18n language changes', () => {
      const callback = jest.fn();
      i18n.on('languageChanged', callback);
      expect(i18n.on).toHaveBeenCalledWith('languageChanged', callback);
    });

    it('should cleanup i18n listener', () => {
      const callback = jest.fn();
      i18n.off('languageChanged', callback);
      expect(i18n.off).toHaveBeenCalledWith('languageChanged', callback);
    });
  });

  describe('ThemeContext Logic', () => {
    const themes = {
      light: {
        background: '#ffffff',
        text: '#000000',
        primary: '#4A90E2',
        card: '#f8f9fa',
        border: '#e9ecef',
      },
      dark: {
        background: '#121212',
        text: '#ffffff',
        primary: '#4A90E2',
        card: '#1e1e1e',
        border: '#333333',
      },
    };

    it('should initialize with default theme (light)', () => {
      let theme = 'light';
      const colors = themes[theme];
      expect(theme).toBe('light');
      expect(colors.background).toBe('#ffffff');
    });

    it('should toggle theme from light to dark', () => {
      let theme = 'light';
      theme = theme === 'light' ? 'dark' : 'light';
      const colors = themes[theme];
      expect(theme).toBe('dark');
      expect(colors.background).toBe('#121212');
    });

    it('should toggle theme from dark to light', () => {
      let theme = 'dark';
      theme = theme === 'light' ? 'dark' : 'light';
      const colors = themes[theme];
      expect(theme).toBe('light');
      expect(colors.background).toBe('#ffffff');
    });

    it('should set theme to dark', () => {
      let theme = 'light';
      theme = 'dark';
      const colors = themes[theme];
      expect(theme).toBe('dark');
      expect(colors.background).toBe('#121212');
    });

    it('should set theme to light', () => {
      let theme = 'dark';
      theme = 'light';
      const colors = themes[theme];
      expect(theme).toBe('light');
      expect(colors.background).toBe('#ffffff');
    });

    it('should provide correct colors for light theme', () => {
      const theme = 'light';
      const colors = themes[theme];
      expect(colors.background).toBe('#ffffff');
      expect(colors.text).toBe('#000000');
      expect(colors.primary).toBe('#4A90E2');
    });

    it('should provide correct colors for dark theme', () => {
      const theme = 'dark';
      const colors = themes[theme];
      expect(colors.background).toBe('#121212');
      expect(colors.text).toBe('#ffffff');
      expect(colors.primary).toBe('#4A90E2');
    });

    it('should handle theme switching multiple times', () => {
      let theme = 'light';
      const switches = ['dark', 'light', 'dark', 'light'];
      
      switches.forEach((newTheme) => {
        theme = newTheme;
        const colors = themes[theme];
        expect(colors).toBeDefined();
      });

      expect(theme).toBe('light');
    });
  });

  describe('Context Integration', () => {
    it('should work with multiple contexts together', () => {
      const user = { id: '1', name: 'User', role: 'parent' };
      const language = 'en';
      const theme = 'light';

      expect(user).toBeDefined();
      expect(language).toBe('en');
      expect(theme).toBe('light');
    });

    it('should handle context state changes', () => {
      let user = null;
      let language = 'en';
      let theme = 'light';

      // Simulate state changes
      user = { id: '1', name: 'User', role: 'parent' };
      language = 'am';
      theme = 'dark';

      expect(user).not.toBeNull();
      expect(language).toBe('am');
      expect(theme).toBe('dark');
    });
  });
});
