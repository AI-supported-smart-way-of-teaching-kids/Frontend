import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "../contexts/UserContext";
import { LinearGradient } from "expo-linear-gradient";
import * as profilesApi from "../src/services/profilesApi";
import { useTranslation } from "react-i18next";

const STORAGE = {
  TEACHER_PROFILES: "@app_teacher_profiles_v1",
};

export default function TeacherProfileSetup() {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation();
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateProfile = async () => {
    if (!bio.trim()) {
      Alert.alert(t('bioRequired'), t('enterBioToComplete'));
      return;
    }

    if (!user || user.role !== "teacher") {
      Alert.alert(t('error'), "You must be logged in as a teacher to create a profile.");
      router.replace("/(drawer)/login");
      return;
    }

    setLoading(true);

    try {
      // Create profile payload for backend
      const profilePayload = {
        bio: bio.trim(),
      };

      let backendProfile = null;

      // Try to create profile on backend first
      try {
        const response = await profilesApi.createTeacher(profilePayload);
        // If we reach here, it's a success
        backendProfile = response;
        console.log("Teacher profile created on backend:", backendProfile);
      } catch (backendError) {
        // Handle 200/201 in catch block just in case
        if (backendError.response?.status === 200 || backendError.response?.status === 201) {
          backendProfile = backendError.response.data;
        } else {
          console.warn("Failed to create teacher profile on backend:", backendError);
        }
      }

      // Create local profile object (merge backend data if available)
      const teacherProfile = backendProfile || {
        id: user.id,
        user: user.id,
        userId: user.id,
        email: user.email,
        name: user.name,
        bio: bio.trim(),
        uploaded_count: 0,
        created_at: new Date().toISOString(),
      };

      // If backend profile exists, merge its data
      if (backendProfile) {
        teacherProfile.id = backendProfile.id;
        teacherProfile.userId = user.id;
        teacherProfile.email = user.email || backendProfile.email;
        teacherProfile.name = user.name || backendProfile.name;
        teacherProfile.created_at = backendProfile.created_at || new Date().toISOString();
        teacherProfile.uploaded_count = backendProfile.uploaded_count || 0;
      }

      // Save to local storage for offline access
      const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
      let profiles = {};

      if (storedProfiles) {
        try {
          profiles = JSON.parse(storedProfiles);
        } catch (e) {
          console.warn("Error parsing stored profiles:", e);
          profiles = {};
        }
      }

      // Save profile with userId as key
      profiles[user.id] = teacherProfile;
      await AsyncStorage.setItem(STORAGE.TEACHER_PROFILES, JSON.stringify(profiles));

      // Also save current profile reference for easy access
      await AsyncStorage.setItem("@current_teacher_profile", JSON.stringify(teacherProfile));

      setLoading(false);

      console.log("Profile created successfully, attempting navigation...");

      // Navigate immediately without Alert to avoid UI blocking issues
      try {
        // Force a small delay to ensure state updates settle
        setTimeout(() => {
          console.log("Executing navigation replace...");
          router.replace("/dashboard/teacher");
        }, 100);
      } catch (e) {
        console.error("Navigation error:", e);
        // Fallback attempt
        router.push("/dashboard/teacher");
      }
    } catch (error) {
      console.error("Error creating teacher profile:", error);
      setLoading(false);

      // Extract error message
      let errorMessage = t('failedToSaveProfile');
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.bio) {
        errorMessage = Array.isArray(error.response.data.bio)
          ? error.response.data.bio[0]
          : error.response.data.bio;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(t('error'), errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFC", "#F1F5F9"]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="school" size={48} color="#2563EB" />
              </View>
              <Text style={styles.title}>{t('completeTeacherProfile')}</Text>
              <Text style={styles.subtitle}>
                {t('tellUsAboutYourself')}
              </Text>
            </View>

            {/* Bio Input */}
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="document-text" size={18} color="#2563EB" /> {t('bio')}
                </Text>
                <TextInput
                  style={styles.bioInput}
                  placeholder={t('bioPlaceholder')}
                  placeholderTextColor="#999"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                />
                <Text style={styles.hint}>
                  {bio.length} / 500 characters
                </Text>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#2563EB" />
                <Text style={styles.infoText}>
                  Your bio will be visible to students and parents. You can update it later in your profile settings.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleCreateProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.submitButtonText}>{t('createProfile')}</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              {/* Skip for now (optional) */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  Alert.alert(
                    t('skipProfileConfirm'),
                    t('skipProfileMessage'),
                    [
                      { text: t('cancel'), style: "cancel" },
                      {
                        text: t('skip'),
                        onPress: async () => {
                          // Create minimal profile
                          try {
                            setLoading(true);

                            let backendProfile = null;

                            // Try to create minimal profile on backend
                            try {
                              backendProfile = await profilesApi.createTeacher({ bio: "" });
                              console.log("Minimal teacher profile created on backend:", backendProfile);
                            } catch (backendError) {
                              console.warn("Failed to create minimal teacher profile on backend:", backendError);
                              // Continue with local storage fallback
                            }

                            // Create local profile object
                            const teacherProfile = backendProfile || {
                              id: user?.id,
                              user: user?.id,
                              userId: user?.id,
                              email: user?.email,
                              name: user?.name,
                              bio: "",
                              uploaded_count: 0,
                              created_at: new Date().toISOString(),
                            };

                            // If backend profile exists, merge its data
                            if (backendProfile) {
                              teacherProfile.id = backendProfile.id;
                              teacherProfile.userId = user?.id;
                              teacherProfile.email = user?.email || backendProfile.email;
                              teacherProfile.name = user?.name || backendProfile.name;
                              teacherProfile.created_at = backendProfile.created_at || new Date().toISOString();
                              teacherProfile.uploaded_count = backendProfile.uploaded_count || 0;
                            }

                            const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
                            let profiles = storedProfiles ? JSON.parse(storedProfiles) : {};
                            profiles[user?.id || ""] = teacherProfile;
                            await AsyncStorage.setItem(STORAGE.TEACHER_PROFILES, JSON.stringify(profiles));
                            await AsyncStorage.setItem("@current_teacher_profile", JSON.stringify(teacherProfile));

                            setLoading(false);
                            router.replace("/dashboard/teacher");
                          } catch (e) {
                            console.error("Error creating minimal profile:", e);
                            setLoading(false);
                            Alert.alert(t('error'), t('failedToSaveProfile'));
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.skipButtonText}>{t('skipForNow')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  bioInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#0F172A",
    minHeight: 150,
    textAlignVertical: "top",
  },
  hint: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    textAlign: "right",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#475569",
    marginLeft: 12,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: "#2563EB",
    padding: 18,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 8,
  },
  skipButton: {
    padding: 12,
    alignItems: "center",
  },
  skipButtonText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
});







