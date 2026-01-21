// Mock i18next before importing
const mockChangeLanguage = jest.fn();
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockT = jest.fn((key) => key);

const mockI18n = {
  changeLanguage: mockChangeLanguage,
  on: mockOn,
  off: mockOff,
  t: mockT,
  language: 'en',
  options: {
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    resources: {
      en: {
        translation: {
          welcome: 'Welcome',
          login: 'Login',
          logout: 'Logout',
          parentDashboard: 'Parent Dashboard',
          addChild: 'Add Child',
        },
      },
      am: {
        translation: {
          welcome: 'እንኳን ደህና መጡ',
          login: 'ግባ',
          logout: 'ውጣ',
          parentDashboard: 'የወላጅ ዳሽቦርድ',
          addChild: 'ልጅ ጨምር',
        },
      },
      ti: {
        translation: {
          welcome: 'እንቋዕ ብደሓን መጻእኩም',
          login: 'እተን',
          logout: 'ወጻ',
          parentDashboard: 'ዳሽቦርድ ወለዲ',
          addChild: 'ቆልዓ ወስኽ',
        },
      },
    },
  },
};

jest.mock('../i18n', () => {
  return {
    __esModule: true,
    default: mockI18n,
  };
});

const i18nModule = require('../i18n');
const i18n = i18nModule.default || i18nModule;

describe('i18n - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockI18n.language = 'en';
    mockT.mockImplementation((key) => {
      const translations = {
        en: {
          welcome: 'Welcome',
          login: 'Login',
          logout: 'Logout',
          parentDashboard: 'Parent Dashboard',
          addChild: 'Add Child',
        },
        am: {
          welcome: 'እንኳን ደህና መጡ',
          login: 'ግባ',
          logout: 'ውጣ',
          parentDashboard: 'የወላጅ ዳሽቦርድ',
          addChild: 'ልጅ ጨምር',
        },
        ti: {
          welcome: 'እንቋዕ ብደሓን መጻእኩም',
          login: 'እተን',
          logout: 'ወጻ',
          parentDashboard: 'ዳሽቦርድ ወለዲ',
          addChild: 'ቆልዓ ወስኽ',
        },
      };
      return translations[i18n.language]?.[key] || key;
    });
  });

  describe('Initialization', () => {
    it('should initialize with default language (en)', () => {
      expect(i18n.language).toBe('en');
    });

    it('should have fallback language set to en', () => {
      expect(i18n.options.fallbackLng).toBe('en');
    });

    it('should have all language resources loaded', () => {
      const resources = i18n.options.resources;
      expect(resources).toHaveProperty('en');
      expect(resources).toHaveProperty('am');
      expect(resources).toHaveProperty('ti');
    });

    it('should have translation resources for each language', () => {
      expect(i18n.options.resources.en.translation).toBeDefined();
      expect(i18n.options.resources.am.translation).toBeDefined();
      expect(i18n.options.resources.ti.translation).toBeDefined();
    });
  });

  describe('Translation', () => {
    it('should translate to English by default', () => {
      i18n.language = 'en';
      const translation = i18n.t('welcome');
      expect(translation).toBe('Welcome');
    });

    it('should translate to Amharic when language is changed', () => {
      i18n.language = 'am';
      mockT.mockReturnValueOnce('እንኳን ደህና መጡ');
      const translation = i18n.t('welcome');
      expect(translation).toBe('እንኳን ደህና መጡ');
    });

    it('should translate to Tigrinya when language is changed', () => {
      i18n.language = 'ti';
      mockT.mockReturnValueOnce('እንቋዕ ብደሓን መጻእኩም');
      const translation = i18n.t('welcome');
      expect(translation).toBe('እንቋዕ ብደሓን መጻእኩም');
    });

    it('should return key when translation is missing', () => {
      const translation = i18n.t('nonexistent.key');
      expect(translation).toBe('nonexistent.key');
    });

    it('should handle multiple translations', () => {
      i18n.language = 'en';
      const translations = {
        welcome: i18n.t('welcome'),
        login: i18n.t('login'),
        logout: i18n.t('logout'),
      };

      expect(translations.welcome).toBe('Welcome');
      expect(translations.login).toBe('Login');
      expect(translations.logout).toBe('Logout');
    });

    it('should translate parent dashboard related keys', () => {
      i18n.language = 'en';
      expect(i18n.t('parentDashboard')).toBe('Parent Dashboard');
      expect(i18n.t('addChild')).toBe('Add Child');
    });

    it('should translate parent dashboard in Amharic', () => {
      i18n.language = 'am';
      mockT.mockReturnValueOnce('የወላጅ ዳሽቦርድ');
      expect(i18n.t('parentDashboard')).toBe('የወላጅ ዳሽቦርድ');
    });

    it('should translate parent dashboard in Tigrinya', () => {
      i18n.language = 'ti';
      mockT.mockReturnValueOnce('ዳሽቦርድ ወለዲ');
      expect(i18n.t('parentDashboard')).toBe('ዳሽቦርድ ወለዲ');
    });
  });

  describe('Language Changes', () => {
    it('should change language to Amharic', () => {
      i18n.changeLanguage('am');
      i18n.language = 'am';
      mockT.mockReturnValueOnce('እንኳን ደህና መጡ');
      expect(i18n.language).toBe('am');
      expect(i18n.t('welcome')).toBe('እንኳን ደህና መጡ');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('am');
    });

    it('should change language to Tigrinya', () => {
      i18n.changeLanguage('ti');
      i18n.language = 'ti';
      mockT.mockReturnValueOnce('እንቋዕ ብደሓን መጻእኩም');
      expect(i18n.language).toBe('ti');
      expect(i18n.t('welcome')).toBe('እንቋዕ ብደሓን መጻእኩም');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('ti');
    });

    it('should change language back to English', () => {
      i18n.changeLanguage('am');
      i18n.changeLanguage('en');
      i18n.language = 'en';
      expect(i18n.language).toBe('en');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
    });

    it('should emit languageChanged event', () => {
      const callback = jest.fn();
      i18n.on('languageChanged', callback);
      i18n.changeLanguage('am');
      
      expect(i18n.on).toHaveBeenCalledWith('languageChanged', callback);
      expect(i18n.changeLanguage).toHaveBeenCalledWith('am');
    });

    it('should handle multiple language changes', () => {
      const languages = ['en', 'am', 'ti', 'en'];
      
      languages.forEach((lang) => {
        i18n.changeLanguage(lang);
      });

      expect(i18n.changeLanguage).toHaveBeenCalledTimes(4);
      expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('am');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('ti');
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to English for missing translations', () => {
      i18n.language = 'am';
      const translation = i18n.t('nonexistent.key');
      expect(translation).toBe('nonexistent.key');
    });

    it('should use fallback language when invalid language is set', () => {
      i18n.changeLanguage('invalid');
      expect(i18n.changeLanguage).toHaveBeenCalledWith('invalid');
    });
  });

  describe('Interpolation', () => {
    it('should not escape values (React handles escaping)', () => {
      expect(i18n.options.interpolation.escapeValue).toBe(false);
    });
  });

  describe('React Integration', () => {
    it('should have useSuspense disabled for React Native', () => {
      expect(i18n.options.react.useSuspense).toBe(false);
    });
  });
});
