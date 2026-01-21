import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { UserProvider } from '../contexts/UserContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../contexts/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import '../i18n'; // Import i18n configuration

SplashScreen.preventAutoHideAsync();

// Add error logging (web only - React Native doesn't have window object)
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

// React Native error handling
if (typeof global !== 'undefined' && global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('React Native Global Error:', error, 'isFatal:', isFatal);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}
function AppContent() {
  try {
    const { colors } = useTheme();
    console.log('AppContent: Theme colors loaded', colors);

    const customTheme = {
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        text: colors.text,
        primary: colors.primary,
        card: colors.card,
        border: colors.border,
      },
    };

    console.log('AppContent: Rendering Stack navigator');
    return (
      <ThemeProvider value={customTheme}>
        <UserProvider>
          <Stack>
            <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
          </Stack>
        </UserProvider>
      </ThemeProvider>
    );
  } catch (error) {
    console.error('AppContent error:', error);
    throw error;
  }
}
export default function RootLayout() {
  console.log('RootLayout: Component mounted');

  const [loaded] = useFonts({});
  console.log('RootLayout: Fonts loaded:', loaded);

  useEffect(() => {
    if (loaded) {
      console.log('RootLayout: Hiding splash screen');
      SplashScreen.hideAsync().catch((error) => {
        console.error('Error hiding splash screen:', error);
      });
    }
  }, [loaded]);

  if (!loaded) {
    console.log('RootLayout: Waiting for fonts, returning null');
    return null;
  }

  console.log('RootLayout: Rendering app with providers');
  return (
    <ErrorBoundary>
      <CustomThemeProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </CustomThemeProvider>
    </ErrorBoundary>
  );
}
