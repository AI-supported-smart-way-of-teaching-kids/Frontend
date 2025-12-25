import React, { useState, useRef, useEffect } from "react";
import {View,Text,TextInput,TouchableOpacity,ScrollView,StyleSheet, Dimensions,Image,Animated, KeyboardAvoidingView, Platform, Alert, Easing,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "../../contexts/UserContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
const { width, height } = Dimensions.get("window");
// Mock users for demo (in production, this would be from a backend)
const mockUsers = {
  kid: [
    { id: "1", name: "Alex", email: "kid@test.com", password: "123456", role: "kid", parentPhone: "+1234567890" },
    { id: "2", name: "Emma", email: "kid2@test.com", password: "123456", role: "kid", parentPhone: "+1234567891" },
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

// Enhanced Cartoon Button with animations
function CartoonButton({ title, onPress, loading, colors, textColor = "#fff" }) {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={loading}
        activeOpacity={0.9}
      >
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

  const [role, setRole] = useState(Array.isArray(initialRole) ? initialRole[0] : initialRole || "kid");
  const [authMode, setAuthMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [childName, setChildName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
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
    // Continuous pulse for kid mode
    if (role === "kid") {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [role, logoAnim, pulseAnim]);
  const roleIcons = { kid: "happy-outline", teacher: "school" };
  const roleColors = {
    kid: ["#FFB6C1", "#FF87A0", "#FF69B4"],
    teacher: ["#9EEAFF", "#5CD6FF", "#00BFFF"],
  };
  const roleRouteMap = {
    kid: "/dashboard/kids",
    teacher: "/dashboard/teacher",
  };

  // Pre-fill fields for kids role
  useEffect(() => {
    if (role === "kid") {
      if (authMode === "signin") {
        setEmail("");
        setPassword("");
      } else if (authMode === "signup") {
        setChildName("");
        setParentPhone("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } else {
      // Reset fields when switching to teacher
      setEmail("");
      setPassword("");
      setChildName("");
      setParentPhone("");
      setConfirmPassword("");
    }
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
            kid: [...mockUsers.kid, ...(parsed.kid || [])],
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
        setTimeout(() => {
          router.replace(roleRouteMap[role]);
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
    if (role === "kid") {
      if (!childName || !email || !password || !parentPhone) {
        setError(t("fillAllFields"));
        return;
      }
    } else {
      if (!name || !email || !password) {
        setError(t("fillAllFields"));
        return;
      }
    }
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordsNotMatch"));
      return;
    }
    if (role === "parent" && !childName) {
      setError("Enter child's name");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    try {
      const newUser = {
        id: String(Date.now()),
        name: role === "kid" ? childName || name : name,
        email,
        role,
        parentPhone: role === "kid" ? parentPhone : undefined,
      };
      // Save to storage
      const storedUsers = await AsyncStorage.getItem("@app_users");
      let allUsers = { kid: [], teacher: [] };
      
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
      setTimeout(() => {
        try {
          router.replace(roleRouteMap[role]);
        } catch (navError) {
          console.error("Navigation error:", navError);
          // Fallback: try push instead
          router.push(roleRouteMap[role]);
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

  const dynamicStyles = StyleSheet.create({
    page: { flex: 1 },
    container: {
      alignItems: "center",
      paddingVertical: height * 0.04,
      paddingHorizontal: width * 0.05,
    },
    logoContainer: {
      alignItems: "center",
      marginBottom: height * 0.03,
      position: "relative",
    },
    logo: {
      width: width * 0.3,
      height: width * 0.3,
      borderRadius: (width * 0.3) / 2,
      borderWidth: 4,
      borderColor: "#ffffffff",
    },
    logoTitle: {
      marginTop: height * 0.015,
      fontSize: width * 0.065,
      fontWeight: "900",
      color: colors.text,
      textShadowColor: "rgba(0,0,0,0.1)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    roleRow: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      marginVertical: height * 0.025,
      gap: 12,
    },
    roleTab: {
      flex: 1,
      paddingVertical: height * 0.018,
      borderRadius: 25,
      backgroundColor: "#fff",
      alignItems: "center",
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    roleTabActive: {
      backgroundColor: roleColors[role][0],
      transform: [{ scale: 1.05 }],
    },
    roleTabText: {
      marginTop: height * 0.005,
      color: colors.text,
      fontWeight: "700",
      fontSize: width * 0.038,
    },
    inputBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      paddingHorizontal: width * 0.045,
      paddingVertical: height * 0.018,
      borderRadius: 20,
      marginBottom: height * 0.018,
      borderWidth: 2,
      borderColor: "#e2e8f0",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    inputBoxFocused: {
      borderColor: roleColors[role][1],
      borderWidth: 2,
    },
    input: {
      marginLeft: 12,
      flex: 1,
      fontSize: width * 0.042,
      color: "#333",
    },
    switchText: {
      marginTop: height * 0.02,
      textAlign: "center",
      color: "#555",
      fontSize: width * 0.036,
      textDecorationLine: "underline",
      fontWeight: "600",
    },
    error: {
      color: "#ff4d4d",
      textAlign: "center",
      marginBottom: height * 0.01,
      fontSize: width * 0.036,
      fontWeight: "600",
      backgroundColor: "#ffe6e6",
      padding: 10,
      borderRadius: 10,
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
    <LinearGradient colors={role === "kid" ? ["#FFE5F1", "#FFB6C1", "#FF87A0"] : ["#B3E5FF", "#E0F7FF", "#9EEAFF"]} style={dynamicStyles.page}>
      {/* Floating emojis for kids */}
      {role === "kid" && (
        <View style={dynamicStyles.floatingEmojis} pointerEvents="none">
          <FloatingEmoji emoji="🌟" delay={0} />
          <FloatingEmoji emoji="🎈" delay={500} />
          <FloatingEmoji emoji="🎨" delay={1000} />
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={dynamicStyles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Animated Logo */}
          <Animated.View
            style={[
              dynamicStyles.logoContainer,
              {
                transform: [
                  { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  { scale: role === "kid" ? pulseAnim : 1 },
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
            {role === "kid" && <Text style={{ marginTop: 5, fontSize: width * 0.035, color: "#666" }}>🎉 {t("kidDescription")} 🎉</Text>}
          </Animated.View>
          {/* Role Tabs */}
          {authMode !== "forgot" && (
            <View style={dynamicStyles.roleRow}>
              {["kid", "teacher"].map((r) => {
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
                    <Ionicons name={roleIcons[r]} size={26} color={active ? "#fff" : "#333"} />
                    <Text style={[dynamicStyles.roleTabText, active && { color: "#fff" }]}>
                      {r === "kid" ? `👶 ${t("kid")}` : `👨‍🏫 ${t("teacher")}`}
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
                  title={`${t("signIn")} ${role === "kid" ? t("kid") : t("teacher")} ${role === "kid" ? "👶" : "👨‍🏫"}`}
                  loading={loading}
                  colors={roleColors[role]}
                  onPress={handleSignIn}
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
                {role === "kid" && (
                  <>
                    <View style={dynamicStyles.inputBox}>
                      <Ionicons name="person" size={20} color={roleColors[role][1]} />
                      <TextInput
                        placeholder={t("childName")}
                        placeholderTextColor="#999"
                        value={childName}
                        onChangeText={setChildName}
                        style={dynamicStyles.input}
                      />
                    </View>
                    <View style={dynamicStyles.inputBox}>
                      <Ionicons name="call" size={20} color={roleColors[role][1]} />
                      <TextInput
                        placeholder={t("parentPhone") || "Parent's Phone Number"}
                        placeholderTextColor="#999"
                        value={parentPhone}
                        onChangeText={setParentPhone}
                        keyboardType="phone-pad"
                        style={dynamicStyles.input}
                      />
                    </View>
                  </>
                )}
                <View style={dynamicStyles.inputBox}>
                  <Ionicons name={role === "kid" ? "mail" : "person"} size={20} color={roleColors[role][1]} />
                  <TextInput
                    placeholder={role === "kid" ? t("email") : t("fullName")}
                    placeholderTextColor="#999"
                    value={role === "kid" ? email : name}
                    onChangeText={role === "kid" ? setEmail : setName}
                    autoCapitalize="none"
                    keyboardType={role === "kid" ? "email-address" : "default"}
                    style={dynamicStyles.input}
                  />
                </View>
                {role === "teacher" && (
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
                )}
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
                  title={`${t("createAccount")} ${role === "kid" ? t("kid") : t("teacher")} 🎉`}
                  loading={loading}
                  colors={roleColors[role]}
                  textColor="#fff"
                  onPress={handleSignUp}
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
                  title={`${t("sendResetLink")} 📧`}
                  loading={loading}
                  colors={roleColors[role]}
                  textColor="#fff"
                  onPress={handleForgotPassword}
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
