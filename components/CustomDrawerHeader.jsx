import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";

export default function CustomDrawerHeader() {
  const { colors } = useTheme();

  const logoSize = 80; // Logo width & height

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary || "#fff"]}
      style={styles.container}
    >
      {/* Circular Logo */}
      <Image
        source={require("../assets/images/logo.png")}
        style={[styles.logo, { width: logoSize, height: logoSize, borderRadius: logoSize / 2 }]}
        resizeMode="cover"
      />

      {/* App Title */}
      <Text style={[styles.title, { color: colors.text }]}>
        Smart Kids Learning
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 140, // compact height
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  logo: {
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
});
