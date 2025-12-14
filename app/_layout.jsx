import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { UserProvider } from '../contexts/UserContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../contexts/ThemeContext';
import '../i18n'; // Import i18n configuration

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { colors } = useTheme();

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

  return (
    <ThemeProvider value={customTheme}>
      <UserProvider>
        <Stack>
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        </Stack>
      </UserProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({});

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <CustomThemeProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </CustomThemeProvider>
  );
}
