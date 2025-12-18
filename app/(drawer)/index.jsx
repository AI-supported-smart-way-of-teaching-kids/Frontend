import React, { useEffect, useRef } from "react";
import {View,Text,StyleSheet,ImageBackground,Animated,Pressable,} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";
import kidimage from "@/assets/images/kidimage.png";
export default function Index() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const fadeAnim = useRef(new Animated.Value(0)).current; // opacity animation
  const slideAnim = useRef(new Animated.Value(30)).current; // slide from bottom

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const dynamicStyles = StyleSheet.create({
    container: { flex: 1 },
    image: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%", height: "100%" },
    content: { alignItems: "center" },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 30,
      textAlign: "center",
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 10,
      elevation: 2,
    },
    buttonText: { color: colors.text, fontWeight: "bold", fontSize: 30 },
  });

  return (
    <View style={dynamicStyles.container}>
      <ImageBackground source={kidimage} style={dynamicStyles.image}>
        <View style={dynamicStyles.content}>
          <Animated.Text
            style={[
              dynamicStyles.title,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {t('welcome')}
          </Animated.Text>

          <Pressable
            style={dynamicStyles.button}
            onPress={() => router.push("/login")}
          >
            <Text style={dynamicStyles.buttonText}>{t('startLearning')}</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </View>
  );
}


