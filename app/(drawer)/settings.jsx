import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

// Import your contexts
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Settings() {
  const { t } = useTranslation();

  // Theme context
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Language context
  const { language, changeLanguage } = useLanguage();
  
  // Language selection buttons
  const languages = [
    { code: "en", name: t("english"), flag: "🇬🇧" },
    { code: "ti", name: t("tigrigna"), flag: "🇪🇷" },
    { code: "am", name: t("amharic"), flag: "🇪🇹" },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: isDark ? "#111" : "#fff" }]}
    >
      {/* Page Icon */}
      <View style={styles.iconBox}>
        <Ionicons name="settings-outline" size={60} color="#4A90E2" />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
        {t("settings")}
      </Text>

      {/* Dark Mode Toggle */}
      <View style={styles.row}>
        <View style={styles.rowInner}>
          <Ionicons
            name="moon-outline"
            size={26}
            color={isDark ? "#fff" : "#000"}
          />
          <Text style={[styles.label, { color: isDark ? "#fff" : "#000" }]}>
            {t("settings dark_mode")}
          </Text>
        </View>
        <Switch value={isDark} onValueChange={toggleTheme} />
      </View>

      {/* Language Selection */}
      <View style={styles.section}>
        <View style={styles.rowInner}>
          <Ionicons
            name="language-outline"
            size={26}
            color={isDark ? "#fff" : "#000"}
          />
          <Text style={[styles.label, { color: isDark ? "#fff" : "#000" }]}>
            {t("selectLanguage")}
          </Text>
        </View>
        <View style={styles.languageButtons}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              onPress={() => changeLanguage(lang.code)}
              style={[
                styles.languageButton,
                {
                  backgroundColor: language === lang.code 
                    ? (isDark ? "#4A90E2" : "#4c1d95")
                    : (isDark ? "#333" : "#f0f0f0"),
                },
              ]}
            >
              <Text style={{ fontSize: 20, marginRight: 8 }}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageButtonText,
                  {
                    color: language === lang.code ? "#fff" : (isDark ? "#fff" : "#000"),
                    fontWeight: language === lang.code ? "700" : "500",
                  },
                ]}
              >
                {lang.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Info */}
      <Text style={[styles.info, { color: isDark ? "#ccc" : "#444" }]}>
        {t("settings info")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  iconBox: {
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 25,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 0.4,
    borderColor: "#999",
  },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  label: {
    fontSize: 18,
    fontWeight: "600",
  },
  info: {
    marginTop: 25,
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginTop: 20,
  },
  languageButtons: {
    marginTop: 12,
    gap: 10,
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  languageButtonText: {
    fontSize: 16,
  },
});
