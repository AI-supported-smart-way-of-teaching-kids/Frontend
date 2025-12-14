import { Text, StyleSheet, Animated, ScrollView } from "react-native";
import React, { useRef, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
export default function About() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const dynamicStyles = StyleSheet.create({
    scroll: {
      paddingBottom: 40,
      backgroundColor: colors.background,
      flexGrow: 1,
    },
    header: {
      paddingVertical: 50,
      justifyContent: "center",
      alignItems: "center",
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      marginBottom: 20,
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: "800",
      color: "#fff",
      marginTop: 10,
      letterSpacing: 1.2,
    },
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 20,
      padding: 20,
      borderRadius: 20,
      elevation: 4,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },
    title: {
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 10,
      color: colors.text,
    },
    text: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
      marginBottom: 12,
    },
    highlight: {
      fontWeight: "700",
      color: colors.primary,
    },
  });

  return (
    <ScrollView contentContainerStyle={dynamicStyles.scroll}>
      <LinearGradient colors={["#4A90E2", "#6EC6FF"]} style={dynamicStyles.header}>
        <Ionicons name="information-circle-outline" size={80} color="#fff" />
        <Text style={dynamicStyles.headerTitle}>{t('aboutThisApp')}</Text>
      </LinearGradient>

      <Animated.View style={[dynamicStyles.card, { opacity: fadeAnim }]}>
        <Text style={dynamicStyles.title}>{t('appTitle')}</Text>
        <Text style={dynamicStyles.text}>
          {t('aboutDescription')}
        </Text>

        <Text style={dynamicStyles.text}>
          {t('aboutFeatures')}
        </Text>

        <Text style={dynamicStyles.text}>
          {t('aboutDeveloped')} <Text style={dynamicStyles.highlight}>Expo</Text>,{" "}
          <Text style={dynamicStyles.highlight}>React Native</Text>, and{" "}
          <Text style={dynamicStyles.highlight}>Expo Router</Text> {t('aboutNavigation')}.
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
    backgroundColor: "#F5F7FA",
    flexGrow: 1,
  },
  header: {
    paddingVertical: 50,
    justifyContent: "center",
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    marginTop: 10,
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    color: "#333",
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555",
    marginBottom: 12,
  },
  highlight: {
    fontWeight: "700",
    color: "#4A90E2",
  },
});
