import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "../../contexts/UserContext";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useTranslation } from "react-i18next";

export default function Profile() {
  const { user: contextUser, logout } = useUser();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [checkingRole, setCheckingRole] = useState(true);
  const [photo, setPhoto] = useState(null);

  // Load saved profile photo
  useEffect(() => {
    const loadPhoto = async () => {
      // First try to get from UserContext
      if (contextUser?.profilePicture) {
        setPhoto(contextUser.profilePicture);
      } else {
        // Fallback to AsyncStorage
        const saved = await AsyncStorage.getItem("profilePhoto");
        if (saved) setPhoto(saved);
      }
    };
    loadPhoto();
  }, [contextUser]);

  // Role access check
  useEffect(() => {
    const checkAccess = async () => {
      const savedRole = await AsyncStorage.getItem("role");
      if (!savedRole) router.replace("/login");
      else setCheckingRole(false);
    };
    checkAccess();
  }, []);

  if (checkingRole) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 18, color: colors.text }}>Loading...</Text>
      </View>
    );
  }

  // Logout
  const handleLogout = async () => {
    if (logout) await logout();
    await AsyncStorage.removeItem("role");
    router.replace("/login");
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("profile")}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Profile Card */}
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        <View style={styles.avatar}>
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} />
          ) : (
            <Text style={styles.avatarEmoji}>👤</Text>
          )}
        </View>
        <Text style={[styles.userName, { color: colors.text }]}>{contextUser?.name || "User"}</Text>
        <Text style={[styles.userRole, { color: colors.text }]}>{contextUser?.role ? contextUser.role.charAt(0).toUpperCase() + contextUser.role.slice(1) : "Role"}</Text>
        {contextUser?.email && (
          <Text style={[styles.userEmail, { color: colors.text }]}>{contextUser.email}</Text>
        )}
        {contextUser?.username && (
          <Text style={[styles.userUsername, { color: colors.text }]}>@{contextUser.username}</Text>
        )}
      </View>

      {/* Options */}
      <View style={styles.options}>
        <TouchableOpacity
          style={[styles.option, { backgroundColor: colors.card }]}
          onPress={() => router.push("/profile/editprofile")}
        >
          <Ionicons name="person-outline" size={24} color={colors.primary} />
          <Text style={[styles.optionText, { color: colors.text }]}>{t("editProfile")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.option, { backgroundColor: colors.card }]}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
          <Text style={[styles.optionText, { color: colors.text }]}>{t("settings")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.option, { backgroundColor: colors.card }]}>
          <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
          <Text style={[styles.optionText, { color: colors.text }]}>{t("helpSupport")}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: "600" },
  profileSection: { alignItems: "center", borderRadius: 20, padding: 20, marginBottom: 20, elevation: 3 },
  avatar: { width: 90, height: 90, borderRadius: 45, justifyContent: "center", alignItems: "center", marginBottom: 10, overflow: "hidden" },
  avatarEmoji: { fontSize: 45 },
  userName: { fontSize: 24, fontWeight: "600", marginBottom: 5 },
  userRole: { fontSize: 16, marginBottom: 4 },
  userEmail: { fontSize: 14, color: "#666", marginTop: 4 },
  userUsername: { fontSize: 14, color: "#666", marginTop: 2 },
  options: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, elevation: 3 },
  optionText: { fontSize: 16, marginLeft: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
