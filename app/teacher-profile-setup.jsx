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

const STORAGE = {
  TEACHER_PROFILES: "@app_teacher_profiles_v1",
};

export default function TeacherProfileSetup() {
  const router = useRouter();
  const { user } = useUser();
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateProfile = async () => {
    if (!bio.trim()) {
      Alert.alert("Bio Required", "Please enter your bio to complete your profile.");
      return;
    }

    if (!user || user.role !== "teacher") {
      Alert.alert("Error", "You must be logged in as a teacher to create a profile.");
      router.replace("/(drawer)/(tabs)/login");
      return;
    }

    setLoading(true);

    try {
      const teacherProfile = {
        userId: user.id,
        email: user.email,
        name: user.name,
        bio: bio.trim(),
        uploaded_count: 0,
        created_at: new Date().toISOString(),
      };

      // Load existing teacher profiles
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
      
      Alert.alert(
        "Profile Created!",
        "Your teacher profile has been created successfully.",
        [
          {
            text: "Continue",
            onPress: () => router.replace("/dashboard/teacher"),
          },
        ]
      );
    } catch (error) {
      console.error("Error creating teacher profile:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to create profile. Please try again.");
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
              <Text style={styles.title}>Complete Your Teacher Profile</Text>
              <Text style={styles.subtitle}>
                Tell us about yourself to get started
              </Text>
            </View>

            {/* Bio Input */}
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  <Ionicons name="document-text" size={18} color="#2563EB" /> Bio
                </Text>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Tell us about your teaching experience, qualifications, and interests..."
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
                    <Text style={styles.submitButtonText}>Create Profile</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              {/* Skip for now (optional) */}
              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => {
                  Alert.alert(
                    "Skip Profile?",
                    "You can create your profile later, but some features may be limited.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Skip",
                        onPress: async () => {
                          // Create minimal profile
                          try {
                            const teacherProfile = {
                              userId: user?.id,
                              email: user?.email,
                              name: user?.name,
                              bio: "",
                              uploaded_count: 0,
                              created_at: new Date().toISOString(),
                            };
                            const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
                            let profiles = storedProfiles ? JSON.parse(storedProfiles) : {};
                            profiles[user?.id || ""] = teacherProfile;
                            await AsyncStorage.setItem(STORAGE.TEACHER_PROFILES, JSON.stringify(profiles));
                            await AsyncStorage.setItem("@current_teacher_profile", JSON.stringify(teacherProfile));
                            router.replace("/dashboard/teacher");
                          } catch (e) {
                            console.error("Error creating minimal profile:", e);
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
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







