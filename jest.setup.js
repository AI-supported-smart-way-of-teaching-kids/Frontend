// Setup react-native-gesture-handler
try {
  require('react-native-gesture-handler/jestSetup');
} catch (e) {
  // Ignore if not installed
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = {};
  return {
    setItem: jest.fn((key, value) => {
      return new Promise((resolve) => {
        storage[key] = value;
        resolve();
      });
    }),
    getItem: jest.fn((key) => {
      return new Promise((resolve) => {
        resolve(storage[key] || null);
      });
    }),
    removeItem: jest.fn((key) => {
      return new Promise((resolve) => {
        delete storage[key];
        resolve();
      });
    }),
    multiRemove: jest.fn((keys) => {
      return new Promise((resolve) => {
        keys.forEach((key) => delete storage[key]);
        resolve();
      });
    }),
    clear: jest.fn(() => {
      return new Promise((resolve) => {
        Object.keys(storage).forEach((key) => delete storage[key]);
        resolve();
      });
    }),
  };
});

// Mock expo-router
const mockUseFocusEffect = jest.fn((callback) => {
  // Execute callback immediately for tests
  if (callback && typeof callback === 'function') {
    callback();
  }
  // Return cleanup function
  return () => {};
});

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: mockUseFocusEffect,
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock React Native components - avoid loading actual mock file with Flow syntax
jest.mock('react-native', () => {
  const React = require('react');
  
  // Define animation functions inside the mock factory
  const createAnimatedValue = jest.fn((value) => {
    const mockValue = {
      setValue: jest.fn(),
      setOffset: jest.fn(),
      flattenOffset: jest.fn(),
      extractOffset: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      _value: value !== undefined ? value : 1,
      _offset: 0,
    };
    
    // Mock interpolate to return a value that can be used in transforms
    mockValue.interpolate = jest.fn((config) => {
      if (config && config.outputRange && config.outputRange.length > 0) {
        return config.outputRange[0];
      }
      return mockValue._value;
    });
    
    return mockValue;
  });

  const createAnimatedTiming = jest.fn(() => ({
    start: jest.fn((callback) => {
      callback && callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  }));

  const createAnimatedSpring = jest.fn(() => ({
    start: jest.fn((callback) => {
      callback && callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  }));

  const createAnimatedSequence = jest.fn(() => ({
    start: jest.fn((callback) => {
      callback && callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  }));

  const createAnimatedParallel = jest.fn(() => ({
    start: jest.fn((callback) => {
      callback && callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  }));

  const createAnimatedLoop = jest.fn(() => ({
    start: jest.fn((callback) => {
      callback && callback({ finished: true });
    }),
    stop: jest.fn(),
    reset: jest.fn(),
  }));
  
  return {
    Platform: {
      OS: 'ios',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    },
    Alert: {
      alert: jest.fn(),
    },
    StyleSheet: {
      create: (styles) => styles,
      flatten: jest.fn((style) => {
        if (!style) return {};
        if (Array.isArray(style)) {
          return Object.assign({}, ...style.filter(Boolean));
        }
        return style || {};
      }),
    },
    Animated: {
      Value: createAnimatedValue,
      ValueXY: jest.fn((value) => ({
        x: createAnimatedValue(value?.x || 0),
        y: createAnimatedValue(value?.y || 0),
        setValue: jest.fn(),
        setOffset: jest.fn(),
        flattenOffset: jest.fn(),
        extractOffset: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
      })),
      timing: createAnimatedTiming,
      spring: createAnimatedSpring,
      sequence: createAnimatedSequence,
      parallel: createAnimatedParallel,
      loop: createAnimatedLoop,
      View: ({ children, style, ...props }) => {
        return React.createElement('View', { ...props, style }, children);
      },
      Text: ({ children, style, ...props }) => {
        return React.createElement('Text', { ...props, style }, children);
      },
      Image: ({ style, ...props }) => {
        return React.createElement('Image', { ...props, style });
      },
      ScrollView: ({ children, style, ...props }) => {
        return React.createElement('ScrollView', { ...props, style }, children);
      },
    },
    Easing: {
      in: jest.fn((easing) => easing),
      out: jest.fn((easing) => easing),
      inOut: jest.fn((easing) => easing),
      quad: jest.fn(),
      cubic: jest.fn(),
      poly: jest.fn(),
      sin: jest.fn(),
      circle: jest.fn(),
      exp: jest.fn(),
      elastic: jest.fn(),
      back: jest.fn(),
      bounce: jest.fn(),
      bezier: jest.fn(),
      ease: jest.fn(),
      linear: jest.fn(),
    },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    Image: 'Image',
    TextInput: 'TextInput',
    ActivityIndicator: 'ActivityIndicator',
  };
});

// Mock expo modules
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ granted: true })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: 'file://test.jpg' }] })
  ),
}));

jest.mock('expo-av', () => ({
  Video: {
    RESIZE_MODE_CONTAIN: 'contain',
  },
  Audio: {
    setAudioModeAsync: jest.fn(),
  },
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  AntDesign: 'AntDesign',
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// Mock i18n
jest.mock('./i18n', () => ({
  __esModule: true,
  default: {
    t: (key) => key,
  },
}));

// Mock contexts
jest.mock('./contexts/UserContext', () => ({
  useUser: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
  UserProvider: ({ children }) => children,
}));

jest.mock('./contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    changeLanguage: jest.fn(),
  }),
  LanguageProvider: ({ children }) => children,
}));

jest.mock('./contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#10B981',
      card: '#FFFFFF',
      border: '#E2E8F0',
    },
  }),
  ThemeProvider: ({ children }) => children,
}));

// Define __DEV__ for React Native modules
global.__DEV__ = true;

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }) => React.createElement('View', {}, children),
    SafeAreaProvider: ({ children }) => React.createElement('View', {}, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

