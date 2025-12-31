import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { useUser } from "../contexts/UserContext";
import i18n from "../i18n";

const STORAGE_PROFILE = "@app_profile_v1";

export default function Profile({ navigation }) {
  const router = useRouter();
  const { user, updateProfile } = useUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState(null);
  const [storedPassword, setStoredPassword] = useState(""); // Store actual password (not displayed)
  const [currentPassword, setCurrentPassword] = useState(""); // User input for current password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_PROFILE);
      if (stored) {
        const data = JSON.parse(stored);
        setName(data.name || "");
        setEmail(data.email || "");
        // Only set photo if it exists and is valid (not empty string)
        setPhoto(data.photo && data.photo.trim() !== "" ? data.photo : null);
        setStoredPassword(data.password || ""); // Store password but don't display it
        setCurrentPassword(""); // Always start with empty current password field
      } else {
        // First-time user - initialize with empty values
        setName(user?.name || "");
        setEmail(user?.email || "");
        setPhoto(null);
        setStoredPassword("");
        setCurrentPassword("");
      }
    } catch (e) {
      console.warn("Error loading profile:", e);
      // On error, initialize with user context data
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPhoto(null);
      setStoredPassword("");
      setCurrentPassword("");
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  useEffect(() => {
    // Request permission for gallery
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        // Don't show alert on initial load, only when user tries to pick photo
      }
    })();
  }, []);

  const saveProfile = async () => {
    // Validate name
    if (!name.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('pleaseEnterName'));
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      Alert.alert(i18n.t('error'), i18n.t('pleaseEnterValidEmail'));
      return;
    }

    // Validate password if changing
    if (newPassword) {
      // If changing password, require current password
      if (!currentPassword) {
        Alert.alert(i18n.t('error'), i18n.t('pleaseEnterCurrentPassword'));
        return;
      }
      
      // Verify current password matches stored password
      if (currentPassword !== storedPassword) {
        Alert.alert(i18n.t('error'), i18n.t('currentPasswordIncorrect'));
        return;
      }
      
      // Validate new password
      if (newPassword.length < 6) {
        Alert.alert(i18n.t('error'), i18n.t('passwordTooShort'));
        return;
      }
      
      if (newPassword !== confirmPassword) {
        Alert.alert(i18n.t('error'), i18n.t('passwordsNotMatch'));
        return;
      }
      
      // Prevent using the same password
      if (newPassword === storedPassword) {
        Alert.alert(i18n.t('error'), i18n.t('newPasswordMustBeDifferent'));
        return;
      }
    }

    try {
      const data = {
        name: name.trim(),
        email: email.trim(),
        photo,
        password: newPassword ? newPassword : storedPassword, // Use new password if provided, otherwise keep stored
      };

      await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(data));
      
      // Update stored password
      setStoredPassword(data.password);
      
      // Update UserContext to reflect changes in dashboards
      if (updateProfile) {
        updateProfile({
          name: data.name,
          email: data.email,
          photo: data.photo,
        });
      }
      
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      Alert.alert(i18n.t('success'), i18n.t('profileUpdatedSuccessfully'));
    } catch (e) {
      Alert.alert(i18n.t('error'), i18n.t('failedToSaveProfile'));
      console.warn("Error saving profile:", e);
    }
  };

  // Update profile photo (saves immediately for instant feedback)
  const pickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(i18n.t('permissionRequired'), i18n.t('allowGalleryAccess'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const newPhoto = result.assets[0].uri;
        setPhoto(newPhoto);

        // Get existing profile to preserve all other data
        const stored = await AsyncStorage.getItem(STORAGE_PROFILE);
        let data = stored ? JSON.parse(stored) : {};

        // Update only photo, preserve name, email, password
        const updatedProfile = {
          ...data,
          photo: newPhoto,
        };

        await AsyncStorage.setItem(
          STORAGE_PROFILE,
          JSON.stringify(updatedProfile)
        );

        // Update stored password reference if it exists
        if (data.password) {
          setStoredPassword(data.password);
        }

        Alert.alert(i18n.t('success'), i18n.t('profilePictureUpdated'));
        
        // Update UserContext to reflect photo change
        if (updateProfile) {
          updateProfile({ photo: newPhoto });
        }
      }
    } catch (e) {
      Alert.alert(i18n.t('error'), i18n.t('failedToUpdateProfilePicture'));
      console.warn("Error picking photo:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{i18n.t('editProfile')}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Profile Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickPhoto} style={styles.photoWrapper}>
              {photo && photo.trim() !== "" ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={[styles.photo, styles.noPhoto]}>
                  <Ionicons name="person" size={50} color="#fff" />
                </View>
              )}
              <View style={styles.editPhotoBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              {photo && photo.trim() !== "" ? i18n.t('tapToChangeProfilePicture') : i18n.t('tapToUploadProfilePicture')}
            </Text>
          </View>

          {/* Personal Information Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('personalInformation')}</Text>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <Ionicons name="person-outline" size={20} color="#4c1d95" />
                <Text style={styles.labelText}>{i18n.t('fullName')}</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enterFullName')}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <Ionicons name="mail-outline" size={20} color="#4c1d95" />
                <Text style={styles.labelText}>{i18n.t('emailAddress')}</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder={i18n.t('enterEmail')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{i18n.t('changePassword')}</Text>
            <Text style={styles.sectionSubtitle}>
              {i18n.t('leavePasswordFieldsBlank')}
            </Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <Ionicons name="lock-closed-outline" size={20} color="#4c1d95" />
                <Text style={styles.labelText}>{i18n.t('currentPassword')}</Text>
                {newPassword && (
                  <Text style={styles.requiredLabel}> *</Text>
                )}
              </View>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={newPassword ? i18n.t('enterCurrentPasswordRequired') : i18n.t('enterCurrentPasswordToChange')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  autoCapitalize="none"
                  editable={true}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showCurrentPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <Ionicons name="lock-closed-outline" size={20} color="#4c1d95" />
                <Text style={styles.labelText}>{i18n.t('newPassword')}</Text>
              </View>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={i18n.t('enterNewPassword')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={true}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputLabel}>
                <Ionicons name="lock-closed-outline" size={20} color="#4c1d95" />
                <Text style={styles.labelText}>{i18n.t('confirmNewPassword')}</Text>
              </View>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={i18n.t('confirmNewPasswordPlaceholder')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={true}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.btn} onPress={saveProfile}>
            <Text style={styles.btnText}>{i18n.t('saveChanges')}</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f8fb",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f7f8fb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111",
  },
  photoSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 8,
  },
  photoWrapper: {
    position: "relative",
    marginBottom: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#4c1d95",
  },
  noPhoto: {
    backgroundColor: "#4c1d95",
    justifyContent: "center",
    alignItems: "center",
  },
  editPhotoBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4c1d95",
    borderRadius: 18,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  photoHint: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    lineHeight: 18,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginLeft: 8,
  },
  requiredLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ef4444",
  },
  input: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#fff",
    fontSize: 15,
    color: "#111",
  },
  passwordInputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    paddingRight: 45,
  },
  eyeIcon: {
    position: "absolute",
    right: 14,
    padding: 4,
  },
  btn: {
    backgroundColor: "#4c1d95",
    padding: 16,
    borderRadius: 12,
    width: "100%",
    marginTop: 8,
    shadowColor: "#4c1d95",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "800",
    fontSize: 16,
  },
});
