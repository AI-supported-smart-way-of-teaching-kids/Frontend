import React, { useState, useRef, useEffect } from "react";
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet, Dimensions,Image,Animated, KeyboardAvoidingView, Platform, Alert, Easing,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../../src/api";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
const { width, height } = Dimensions.get("window");
// Mock users for demo (in production, this would be from a backend)
const mockUsers = {
  parent: [
    { id: "p1", name: "John Doe", email: "parent@test.com", password: "123456", role: "parent" },
  ],
  teacher: [
    { id: "t1", name: "Ms. Johnson", email: "teacher@test.com", password: "123456", role: "teacher" },
  ],
};
// Animated floating emoji component
const FloatingEmoji = ({ emoji, delay = 0 }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -20,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
              delay,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 2000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.8,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
              delay,
            }),
            Animated.timing(opacity, {
              toValue: 0.3,
              duration: 1500,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };
    animate();
  }, []);
  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [{ translateY }],
        opacity,
      }}
    >
      <Text style={{ fontSize: 30 }}>{emoji}</Text>
    </Animated.View>
  );
};

// Enhanced Button with role-specific styling
function CartoonButton({ title, onPress, loading, colors, textColor = "#fff", role = "parent" }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };
  const isTeacher = role === "teacher";
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={loading}
        activeOpacity={0.9}
      >
        {isTeacher ? (
          <View
            style={{
              paddingVertical: height * 0.018,
              borderRadius: 12,
              marginTop: height * 0.015,
              alignItems: "center",
              backgroundColor: colors[0],
              shadowColor: colors[0],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ color: textColor, fontWeight: "600", fontSize: width * 0.042, letterSpacing: 0.3 }}>
              {loading ? `${title}...` : title}
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={colors}
            style={{
              paddingVertical: height * 0.02,
              borderRadius: 25,
              marginTop: height * 0.015,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 5,
              elevation: 5,
            }}
          >
            <Text style={{ color: textColor, fontWeight: "800", fontSize: width * 0.045 }}>
              {loading ? `${title}...` : title}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// Main Login Page
export default function LoginPage() {
  const router = useRouter();
  const { role: initialRole } = useLocalSearchParams();
  const { login } = useUser();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [role, setRole] = useState(Array.isArray(initialRole) ? initialRole[0] : initialRole || "parent");
  const [authMode, setAuthMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Logo bounce animation
  const logoAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    // Logo bounce
    Animated.spring(logoAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
    // Continuous pulse for parent mode (optional - can be removed)
    if (role === "parent") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [role, logoAnim, pulseAnim]);
  const roleIcons = { parent: "people", teacher: "school" };
  // Professional colors for teacher and parent
  const roleColors = {
    parent: ["#10B981", "#34D399", "#6EE7B7", "#D1FAE5"], // Green gradient for parent
    teacher: ["#2563EB", "#3B82F6", "#60A5FA", "#EFF6FF"], // Professional blue gradient
  };
  // Professional themes for both roles
  const roleTheme = {
    parent: {
      background: ["#FFFFFF", "#F0FDF4", "#DCFCE7"], // Light green background
      text: "#0F172A",
      inputBg: "#FFFFFF",
      inputBorder: "#A7F3D0",
      buttonShadow: "rgba(16, 185, 129, 0.15)",
    },
    teacher: {
      background: ["#FFFFFF", "#F8FAFC", "#F1F5F9"], // Clean white to light gray - professional
      text: "#0F172A", // Deep professional dark
      inputBg: "#FFFFFF",
      inputBorder: "#E2E8F0",
      buttonShadow: "rgba(37, 99, 235, 0.15)",
    },
  };
  const roleRouteMap = {
    parent: "/dashboard/parent",
    teacher: "/dashboard/teacher",
  };

  const STORAGE = {
    TEACHER_PROFILES: "@app_teacher_profiles_v1",
  };

  // Helper function to check if teacher has profile
  const checkTeacherProfile = async (userId) => {
    try {
      const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
      if (!storedProfiles) return false;
      const profiles = JSON.parse(storedProfiles);
      return profiles[userId] ? true : false;
    } catch (e) {
      console.warn("Error checking teacher profile:", e);
      return false;
    }
  };

  // Reset fields when switching roles
  useEffect(() => {
    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
  }, [role, authMode]);
  const handleSignIn = async () => {
    setError("");
  
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
  
    if (!cleanEmail || !cleanPassword) {
      setError(t("fillAllFields"));
      return;
    }
    setLoading(true);
  
    try {
      await new Promise((r) => setTimeout(r, 800));
      const storedUsers = await AsyncStorage.getItem("@app_users");
      let allUsers = mockUsers;
      if (storedUsers) {
        try {
          const parsed = JSON.parse(storedUsers);
          allUsers = {
            parent: [...mockUsers.parent, ...(parsed.parent || [])],
            teacher: [...mockUsers.teacher, ...(parsed.teacher || [])],
          };
        } catch (e) {
          console.warn("Error parsing stored users:", e);
        }
      }
      const user = (allUsers[role] || []).find(
        (u) =>
          u.email.trim().toLowerCase() === cleanEmail &&
          u.password === cleanPassword
      );
      if (user) {
        const { password: _, ...safeUser } = user;
        login(safeUser);
        await AsyncStorage.setItem("role", role);
        await AsyncStorage.setItem("user", JSON.stringify(safeUser));
        setLoading(false);
        setTimeout(async () => {
          // Check if teacher has profile, redirect to setup if not
          if (role === "teacher") {
            const hasProfile = await checkTeacherProfile(safeUser.id);
            if (!hasProfile) {
              router.replace("/teacher-profile-setup");
            } else {
              router.replace(roleRouteMap[role]);
            }
          } else {
            router.replace(roleRouteMap[role]);
          }
        }, 100);
      } else {
        setError(t("invalidCredentials"));
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };
  const handleSignUp = async () => {
    setError("");
    // Both parent and teacher need name, email, and password
    if (!name || !email || !password) {
      setError(t("fillAllFields"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordsNotMatch"));
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    try {
      const newUser = {
        id: String(Date.now()),
        name,
        email,
        role,
      };
      // Save to storage
      const storedUsers = await AsyncStorage.getItem("@app_users");
      let allUsers = { parent: [], teacher: [] };
      
      if (storedUsers) {
        try {
          allUsers = JSON.parse(storedUsers);
        } catch (e) {
          console.warn("Error parsing stored users:", e);
        }
      }
      if (!allUsers[role]) allUsers[role] = [];
      // Check if email already exists
      const emailExists = allUsers[role].some((u) => u.email === email);
      if (emailExists) {
        setError("Email already registered. Please sign in instead.");
        setLoading(false);
        return;
      }
      allUsers[role].push({ ...newUser, password });
      await AsyncStorage.setItem("@app_users", JSON.stringify(allUsers));
      // Remove password before storing in context
      const { password: _, ...userWithoutPassword } = { ...newUser, password };
      login(userWithoutPassword);
      await AsyncStorage.setItem("role", role);
      await AsyncStorage.setItem("user", JSON.stringify(userWithoutPassword));
      setLoading(false);
      // Use setTimeout to ensure state updates before navigation
      setTimeout(async () => {
        try {
          // Check if teacher has profile, redirect to setup if not
          if (role === "teacher") {
            const hasProfile = await checkTeacherProfile(userWithoutPassword.id);
            if (!hasProfile) {
              router.replace("/teacher-profile-setup");
            } else {
              router.replace(roleRouteMap[role]);
            }
          } else {
            router.replace(roleRouteMap[role]);
          }
        } catch (navError) {
          console.error("Navigation error:", navError);
          // Fallback: try push instead
          if (role === "teacher") {
            const hasProfile = await checkTeacherProfile(userWithoutPassword.id);
            if (!hasProfile) {
              router.push("/teacher-profile-setup");
            } else {
              router.push(roleRouteMap[role]);
            }
          } else {
            router.push(roleRouteMap[role]);
          }
        }
      }, 100);
    } catch (error) {
      console.error("Signup error:", error);
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };
  const handleForgotPassword = () => {
    if (!email) {
      setError("Please enter your email");
      return;
    }
    setError("");
    Alert.alert("Reset Password", `Password reset link sent to ${email}!`);
  };

  const theme = roleTheme[role];
  const dynamicStyles = StyleSheet.create({
    page: { flex: 1 },
    container: {
      alignItems: "center",
      paddingVertical: height * 0.04,
      paddingHorizontal: width * 0.05,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: height * 0.05,
      position: "relative",
    },
    logo: {
      width: width * 0.22,
      height: width * 0.22,
      borderRadius: (width * 0.22) / 2,
      borderWidth: 2,
      borderColor: "#E2E8F0",
    },
    logoTitle: {
      marginTop: height * 0.02,
      fontSize: width * 0.052,
      fontWeight: "600",
      color: theme.text,
      textShadowColor: "transparent",
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 0,
      letterSpacing: 0.8,
    },
    roleRow: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      marginVertical: height * 0.025,
      gap: 12,
      backgroundColor: "#FFFFFF",
      padding: 8,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    roleTab: {
      flex: 1,
      paddingVertical: height * 0.015,
      borderRadius: 12,
      backgroundColor: "transparent",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
    },
    roleTabActive: {
      backgroundColor: roleColors[role][0],
      borderColor: roleColors[role][0],
    },
    roleTabText: {
      marginTop: height * 0.005,
      color: "#64748B",
      fontWeight: "600",
      fontSize: width * 0.035,
    },
    inputBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.inputBg,
      paddingHorizontal: width * 0.05,
      paddingVertical: height * 0.018,
      borderRadius: 10,
      marginBottom: height * 0.02,
      borderWidth: 1,
      borderColor: "#E2E8F0",
    },
    inputBoxFocused: {
      borderColor: roleColors[role][1],
      borderWidth: 2,
      shadowColor: roleColors[role][0],
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    input: {
      marginLeft: 12,
      flex: 1,
      fontSize: width * 0.04,
      color: theme.text,
      fontWeight: "400",
    },
    switchText: {
      marginTop: height * 0.02,
      textAlign: "center",
      color: "#64748B",
      fontSize: width * 0.034,
      textDecorationLine: "underline",
      fontWeight: "500",
    },
    error: {
      color: "#DC2626",
      textAlign: "center",
      marginBottom: height * 0.01,
      fontSize: width * 0.034,
      fontWeight: "500",
      backgroundColor: "#FEF2F2",
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#FECACA",
    },
    footer: {
      marginTop: height * 0.04,
      fontSize: width * 0.032,
      color: "#666",
      textAlign: "center",
    },
    floatingEmojis: {
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0,
    },
  });
  return (
    <LinearGradient colors={roleTheme[role].background} style={dynamicStyles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={dynamicStyles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Animated Logo */}
          <Animated.View
            style={[
              dynamicStyles.logoContainer,
                {
                  transform: [
                    { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                    { scale: role === "parent" ? pulseAnim : 1 },
                  ],
                },
            ]}
          >
            <View
              style={{
                width: width * 0.3,
                height: width * 0.3,
                borderRadius: (width * 0.3) / 2,
                backgroundColor: "#fff",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 4,
                borderColor: roleColors[role][1],
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Image
                source={require("../../assets/images/logo.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  resizeMode: "cover",
                }}
              />
            </View>
            <Text style={dynamicStyles.logoTitle}>{t("appTitle")}</Text>
            {role === "parent" && (
              <Text style={{ marginTop: 10, fontSize: width * 0.033, color: "#64748B", fontWeight: "400", letterSpacing: 0.3 }}>
                {t("parentDescription")}
              </Text>
            )}
            {role === "teacher" && (
              <Text style={{ marginTop: 10, fontSize: width * 0.033, color: "#64748B", fontWeight: "400", letterSpacing: 0.3 }}>
                {t("teacherDescription")}
              </Text>
            )}
          </Animated.View>
          {/* Role Tabs */}
          {authMode !== "forgot" && (
            <View style={dynamicStyles.roleRow}>
              {["parent", "teacher"].map((r) => {
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[dynamicStyles.roleTab, active && dynamicStyles.roleTabActive]}
                    onPress={() => {
                      setRole(r);
                      setError("");
                    }}
                  >
                    <Ionicons name={roleIcons[r]} size={26} color={active ? "#fff" : "#64748B"} />
                    <Text style={[dynamicStyles.roleTabText, active && { color: "#fff" }]}>
                      {r === "parent" ? `👨‍👩‍👧 ${t("parent")}` : `👨‍🏫 ${t("teacher")}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Inputs and Buttons */}
          <View style={{ width: "100%" }}>
            {authMode === "signin" && (
              <>
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name="mail" size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={t("email")}
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={dynamicStyles.input}
                  />
                </View>
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name="lock-closed" size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={t("password")}
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    style={dynamicStyles.input}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={{ alignSelf: "flex-end", marginBottom: height * 0.015 }}
                  onPress={() => setAuthMode("forgot")}
                >
                  <Text style={{ color: roleColors[role][1], fontSize: width * 0.036, fontWeight: "600" }}>{t("forgotPassword")}</Text>
                </TouchableOpacity>
                {error ? <Text style={dynamicStyles.error}>{error}</Text> : null}
                <CartoonButton
                  title={t("signIn")}
                  loading={loading}
                  colors={roleColors[role]}
                  onPress={handleSignIn}
                  role={role}
                />
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode("signup");
                    setError("");
                  }}
                >
                  <Text style={dynamicStyles.switchText}>{t("dontHaveAccount")} ✨</Text>
                </TouchableOpacity>
              </>
            )}
            {authMode === "signup" && (
              <>
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name="person" size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={t("fullName")}
                    placeholderTextColor="#999"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    style={dynamicStyles.input}
                  />
                </View>
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name="mail" size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={t("email")}
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={dynamicStyles.input}
                  />
                </View>
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name="lock-closed" size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={t("password")}
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    style={dynamicStyles.input}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name="lock-closed" size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={t("confirmPassword")}
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    style={dynamicStyles.input}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                {error ? <Text style={dynamicStyles.error}>{error}</Text> : null}
                <CartoonButton
                  title={t("createAccount")}
                  loading={loading}
                  colors={roleColors[role]}
                  textColor="#fff"
                  onPress={handleSignUp}
                  role={role}
                />
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode("signin");
                    setError("");
                  }}
                >
                  <Text style={dynamicStyles.switchText}>{t("alreadyHaveAccount")} ✨</Text>
                </TouchableOpacity>
              </>
            )}
            {authMode === "forgot" && (
              <>
                <Text style={{ fontSize: width * 0.055, fontWeight: "800", marginBottom: height * 0.025, color: colors.text, textAlign: "center" }}>
                  {t("forgotPassword")} 🔑
                </Text>
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name="mail" size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={t("email")}
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={dynamicStyles.input}
                  />
                </View>
                {error ? <Text style={dynamicStyles.error}>{error}</Text> : null}
                <CartoonButton
                  title={t("sendResetLink")}
                  loading={loading}
                  colors={roleColors[role]}
                  textColor="#fff"
                  onPress={handleForgotPassword}
                  role={role}
                />
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode("signin");
                    setError("");
                  }}
                >
                  <Text style={dynamicStyles.switchText}>{t("backToSignIn")} ↩️</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Text style={dynamicStyles.footer}>{t("university")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
