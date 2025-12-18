import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from '../i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem("@app_language");
        if (savedLang && ["en", "ti", "am"].includes(savedLang)) {
          i18n.changeLanguage(savedLang);
        }
      } catch (e) {
        console.warn("Error loading language:", e);
      }
    };
    loadLanguage();
  }, []);

  // 🔥 Auto update React state when i18next changes
  useEffect(() => {
    const handleLanguageChange = (lng) => {
      setLanguage(lng);
    };

    i18n.on("languageChanged", handleLanguageChange);

    return () => {
      i18n.off("languageChanged", handleLanguageChange);
    };
  }, []);

  const changeLanguage = async (lang) => {
    if (["en", "ti", "am"].includes(lang)) {
      i18n.changeLanguage(lang);
      try {
        await AsyncStorage.setItem("@app_language", lang);
      } catch (e) {
        console.warn("Error saving language:", e);
      }
    }
  };

  const toggleLanguage = async () => {
    const languages = ["en", "ti", "am"];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex]);
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
