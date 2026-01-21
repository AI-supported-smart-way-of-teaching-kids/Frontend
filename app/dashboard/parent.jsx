// Parent Dashboard
import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import i18n from "../../i18n";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUser } from "../../contexts/UserContext";
import * as profilesApi from "../../src/services/profilesApi";
const STORAGE = {
  CHILDREN: "@app_children_v1", // { parentId: [child1, child2, ...] }
  STUDENT_PROGRESS: "@app_student_progress_v1", // { childId: { videosCompleted, videoWatchingDetails, quizResults } }
  VIDEOS: "@app_videos_v1",
  QUIZZES: "@app_quizzes_v1",
};

// Learning levels enum
const LearningLevel = {
  BEGINNER: "BEGINNER",
  INTERMEDIATE: "INTERMEDIATE",
  ADVANCED: "ADVANCED",
};

export default function ParentDashboard() {
  const router = useRouter();
  const { language, changeLanguage } = useLanguage();
  const { user, logout } = useUser();

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [childProgress, setChildProgress] = useState({});
  const [selectedSection, setSelectedSection] = useState("dashboard"); // dashboard | addChild | editChild | progress

  // Child form state
  const [childNickname, setChildNickname] = useState("");
  const [childAvatarUri, setChildAvatarUri] = useState(null);
  const [childAge, setChildAge] = useState("");
  const [childParentPhone, setChildParentPhone] = useState("");
  const [childLearningLevel, setChildLearningLevel] = useState(LearningLevel.BEGINNER);
  const [editingChildId, setEditingChildId] = useState(null);
  const [showLearningLevelModal, setShowLearningLevelModal] = useState(false);

  // Load selected child from AsyncStorage
  const loadChildren = useCallback(async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return [];
      }

      // Load children from backend API
      try {
        const response = await profilesApi.getChildren({ parent: user.id });

        // Handle different response formats
        let childrenList = [];
        if (Array.isArray(response)) {
          childrenList = response;
        } else if (response.results && Array.isArray(response.results)) {
          childrenList = response.results;
        } else if (response.data && Array.isArray(response.data)) {
          childrenList = response.data;
        }

        // Normalize children: map uuid to id if uuid exists, and ensure id field exists
        const normalizedChildren = childrenList.map((child) => {
          if (!child) return null;
          // Backend uses 'uuid' instead of 'id', so map it
          if (child.uuid && !child.id) {
            child.id = child.uuid;
          }
          // Also normalize field names for consistency
          if (child.learning_level && !child.learningLevel) {
            child.learningLevel = child.learning_level.toUpperCase();
          }
          if (child.parent_phone && !child.parentPhone) {
            child.parentPhone = child.parent_phone;
          }
          if (child.avatar_url && !child.avatarUrl) {
            child.avatarUrl = child.avatar_url;
          }
          return child;
        }).filter((child) => {
          // Filter out any children without valid IDs
          if (!child || !child.id) {
            console.warn("Child without ID/UUID found in response:", child);
            return false;
          }
          return true;
        });

        setChildren(normalizedChildren);

        // Load progress for all children from backend (using normalized children)
        const progressPromises = normalizedChildren.map(async (child) => {
          try {
            const progressData = await profilesApi.getChildProgress(child.id);
            return { [child.id]: progressData };
          } catch (e) {
            console.warn(`Failed to load progress for child ${child.id}:`, e);
            return { [child.id]: {} };
          }
        });

        const progressResults = await Promise.all(progressPromises);
        const allProgress = progressResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setChildProgress(allProgress);

        return normalizedChildren; // Return the loaded children
      } catch (apiError) {
        console.warn("Failed to load children from backend, falling back to local storage:", apiError);
        // Fallback to local storage
        const [storedChildren, storedProgress] = await Promise.all([
          AsyncStorage.getItem(STORAGE.CHILDREN),
          AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),
        ]);

        if (storedChildren) {
          const allChildren = JSON.parse(storedChildren);
          const parentChildren = allChildren[user.id] || [];
          setChildren(parentChildren);
          return parentChildren; // Return the loaded children
        } else {
          setChildren([]);
          return [];
        }

        const progressData = storedProgress ? JSON.parse(storedProgress) : {};
        setChildProgress(progressData);
      }
    } catch (e) {
      console.warn("Failed to load children", e);
      setChildren([]);
      setChildProgress({});
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Load children from storage
  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  useFocusEffect(
    React.useCallback(() => {
      loadChildren();
    }, [loadChildren])
  );

  // Note: This function is kept for backward compatibility
  // Individual child operations now use backend API directly

  const pickAvatarPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(i18n.t("permissionRequired"), i18n.t("allowGalleryAccess"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        setChildAvatarUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("Error picking avatar photo:", e);
      Alert.alert(i18n.t("error"), i18n.t("failedToPickPhoto"));
    }
  };

  const handleAddChild = async () => {
    // Clear focus before modal state changes to prevent accessibility warnings
    clearWebFocus();

    try {
      if (!user?.id) {
        Alert.alert(i18n.t("error"), "Please log in again. User session expired.");
        return;
      }

      if (!childNickname.trim()) {
        Alert.alert(i18n.t("validationError"), i18n.t("pleaseEnterChildNickname"));
        return;
      }

      if (!childParentPhone.trim()) {
        Alert.alert(i18n.t("validationError"), i18n.t("pleaseEnterParentPhone"));
        return;
      }

      const age = parseInt(childAge);
      if (!age || age < 4 || age > 6) {
        Alert.alert(i18n.t("invalidAge"), i18n.t("pleaseEnterValidAge"));
        return;
      }

      // Create child via backend API
      // Backend requires parent ID to associate child with parent
      // Convert learning level to lowercase as backend expects lowercase values
      const childPayload = {
        nickname: childNickname.trim(),
        age: age,
        parent_phone: childParentPhone.trim(),
        learning_level: childLearningLevel.toLowerCase(), // Backend expects lowercase: "beginner", "intermediate", "advanced"
        parent: user.id, // Required: Associate child with logged-in parent
        // Note: avatarUrl will need to be handled separately if backend supports file uploads
      };

      const response = await profilesApi.createChild(childPayload);

      // Handle different response formats from backend
      // profilesApi.createChild returns response.data, so response should be the child object
      // But backend might wrap it: { id, nickname, ... } or { data: { id, ... } } or { child: { id, ... } }
      let createdChild = response;

      // If response has a 'data' property that's an object, use that
      if (response && response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
        createdChild = response.data;
      }
      // If response has a 'child' property, use that
      else if (response && response.child && typeof response.child === 'object') {
        createdChild = response.child;
      }
      // If response itself is the child object, use it directly
      // (This is the most common case - response.data from axios is already extracted)

      // Log the response for debugging
      console.log("Create child response:", response);
      console.log("Response type:", typeof response);
      console.log("Response keys:", response ? Object.keys(response) : 'null');
      console.log("Extracted child:", createdChild);
      console.log("Child has ID?", createdChild?.id);

      // Reset form first (regardless of response structure)
      setChildNickname("");
      setChildAvatarUri(null);
      setChildAge("");
      setChildParentPhone("");
      setChildLearningLevel(LearningLevel.BEGINNER);
      setSelectedSection("dashboard");

      // Clear any previously selected child to prevent accidental redirect
      // This ensures we stay on parent dashboard after creating a child
      await AsyncStorage.removeItem("@selected_child");

      // Check for ID in various possible field names (backend uses 'uuid')
      const childId = createdChild?.id || createdChild?.uuid || createdChild?.pk || createdChild?.child_id || createdChild?.childId;

      // Normalize: if uuid exists but id doesn't, map uuid to id
      if (createdChild?.uuid && !createdChild.id) {
        createdChild.id = createdChild.uuid;
      }

      // Store the child data we sent for matching after reload

      if (!createdChild || !childId) {
        // Backend returned child data but without ID, or no child data at all
        // This can happen if backend needs time to save or returns data before assigning ID
        console.warn("Child created but response missing ID or data. Reloading children from backend...");
        if (createdChild) {
          console.log("Child data received (without ID):", JSON.stringify(createdChild, null, 2));
        } else {
          console.log("No child data in response:", JSON.stringify(response, null, 2));
        }

        // Wait a brief moment for backend to finish saving (if needed)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Reload children from backend - this will get the child with its ID
        await loadChildren();

        // Child created successfully - just show success message
        // User can tap on the child card to go to kids dashboard
        // Ensure we stay on parent dashboard (not redirect to kids dashboard)
        Alert.alert(i18n.t("success"), i18n.t("childAddedSuccessfully"), [
          {
            text: i18n.t("ok"), onPress: () => {
              // Explicitly ensure we're on dashboard section
              setSelectedSection("dashboard");
            }
          }
        ]);
        return;
      }

      // If ID was found in a different field, normalize it to 'id'
      if (!createdChild.id && childId) {
        createdChild.id = childId;
      }

      // Update local state with the created child (backend returns full child object)
      const updated = [...children, createdChild];
      setChildren(updated);

      // Reload children to refresh the list and ensure we have the latest data
      // This ensures we have the complete child object with all fields from backend
      const reloadedChildren = await loadChildren();

      // Child created successfully - just show success message
      // User can tap on the child card to go to kids dashboard
      // Ensure we stay on parent dashboard (not redirect to kids dashboard)
      Alert.alert(i18n.t("success"), i18n.t("childAddedSuccessfully"), [
        {
          text: i18n.t("ok"), onPress: () => {
            // Explicitly ensure we're on dashboard section
            setSelectedSection("dashboard");
          }
        }
      ]);
    } catch (error) {
      console.error("Error adding child:", error);
      console.error("Error response data:", error.response?.data);

      // Extract detailed error message
      let errorMessage = "Failed to add child. Please try again.";
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.nickname) {
          errorMessage = Array.isArray(errorData.nickname) ? errorData.nickname[0] : errorData.nickname;
        } else if (errorData.age) {
          errorMessage = Array.isArray(errorData.age) ? errorData.age[0] : errorData.age;
        } else if (errorData.parent_phone) {
          errorMessage = Array.isArray(errorData.parent_phone) ? errorData.parent_phone[0] : errorData.parent_phone;
        } else if (errorData.learning_level) {
          const learningLevelError = Array.isArray(errorData.learning_level) ? errorData.learning_level[0] : errorData.learning_level;
          errorMessage = `Learning Level Error: ${learningLevelError}`;
        } else if (errorData.parent) {
          errorMessage = Array.isArray(errorData.parent) ? errorData.parent[0] : errorData.parent;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
        } else {
          // Try to get the first error from any field
          const firstErrorKey = Object.keys(errorData)[0];
          if (firstErrorKey) {
            const firstError = errorData[firstErrorKey];
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        }
      }

      Alert.alert(i18n.t("error"), errorMessage);
    }
  };

  const handleEditChild = async () => {
    try {
      if (!editingChildId) {
        Alert.alert(i18n.t("error"), "No child selected for editing");
        return;
      }

      if (!childNickname.trim()) {
        Alert.alert(i18n.t("validationError"), i18n.t("pleaseEnterChildNickname"));
        return;
      }

      if (!childParentPhone.trim()) {
        Alert.alert(i18n.t("validationError"), i18n.t("pleaseEnterParentPhone"));
        return;
      }

      const age = parseInt(childAge);
      if (!age || age < 4 || age > 6) {
        Alert.alert(i18n.t("invalidAge"), i18n.t("pleaseEnterValidAge"));
        return;
      }

      if (!user?.id) {
        Alert.alert(i18n.t("error"), "Please log in again. User session expired.");
        return;
      }

      // Update child via backend API
      // Convert learning level to lowercase as backend expects lowercase values
      const updatePayload = {
        nickname: childNickname.trim(),
        age: age,
        parent_phone: childParentPhone.trim(),
        learning_level: childLearningLevel.toLowerCase(), // Backend expects lowercase: "beginner", "intermediate", "advanced"
        parent: user.id, // Required: Associate child with logged-in parent
      };

      const response = await profilesApi.patchChild(editingChildId, updatePayload);

      // Handle different response formats from backend
      let updatedChild = response;
      if (response && response.data && typeof response.data === 'object') {
        updatedChild = response.data;
      } else if (response && response.child && typeof response.child === 'object') {
        updatedChild = response.child;
      }

      // Log the response for debugging
      console.log("Update child response:", response);
      console.log("Extracted child:", updatedChild);

      // Validate that the updated child has an ID
      if (!updatedChild || !updatedChild.id) {
        console.error("Child response structure:", JSON.stringify(response, null, 2));
        throw new Error(`Child updated but missing ID in response. Response: ${JSON.stringify(response)}`);
      }

      // Update local state
      const updated = children.map((child) =>
        child.id === editingChildId ? updatedChild : child
      );
      setChildren(updated);

      Alert.alert(i18n.t("success"), i18n.t("childUpdatedSuccessfully"));

      // Reset form
      setChildNickname("");
      setChildAvatarUri(null);
      setChildAge("");
      setChildParentPhone("");
      setChildLearningLevel(LearningLevel.BEGINNER);
      setEditingChildId(null);
      setSelectedSection("dashboard");

      // Reload children to refresh the list
      await loadChildren();
    } catch (error) {
      console.error("Error editing child:", error);
      console.error("Error response data:", error.response?.data);

      // Extract detailed error message
      let errorMessage = "Failed to update child. Please try again.";
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.nickname) {
          errorMessage = Array.isArray(errorData.nickname) ? errorData.nickname[0] : errorData.nickname;
        } else if (errorData.age) {
          errorMessage = Array.isArray(errorData.age) ? errorData.age[0] : errorData.age;
        } else if (errorData.parent_phone) {
          errorMessage = Array.isArray(errorData.parent_phone) ? errorData.parent_phone[0] : errorData.parent_phone;
        } else if (errorData.learning_level) {
          const learningLevelError = Array.isArray(errorData.learning_level) ? errorData.learning_level[0] : errorData.learning_level;
          errorMessage = `Learning Level Error: ${learningLevelError}`;
        } else if (errorData.parent) {
          errorMessage = Array.isArray(errorData.parent) ? errorData.parent[0] : errorData.parent;
        } else if (errorData.non_field_errors) {
          errorMessage = Array.isArray(errorData.non_field_errors) ? errorData.non_field_errors[0] : errorData.non_field_errors;
        } else {
          // Try to get the first error from any field
          const firstErrorKey = Object.keys(errorData)[0];
          if (firstErrorKey) {
            const firstError = errorData[firstErrorKey];
            errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
          }
        }
      }

      Alert.alert(i18n.t("error"), errorMessage);
    }
  };

  const handleDeleteChild = (childId) => {
    Alert.alert(
      i18n.t("deleteChild"),
      i18n.t("deleteChildConfirm"),
      [
        { text: i18n.t("cancel"), style: "cancel" },
        {
          text: i18n.t("delete"),
          style: "destructive",
          onPress: async () => {
            try {
              // Delete child via backend API
              await profilesApi.deleteChild(childId);

              // Update local state
              const updated = children.filter((child) => child.id !== childId);
              setChildren(updated);

              Alert.alert(i18n.t("success"), i18n.t("childDeletedSuccessfully"));
            } catch (error) {
              console.error("Failed to delete child:", error);
              Alert.alert(i18n.t("error"), i18n.t("failedToDeleteChild") || "Failed to delete child. Please try again.");
            }
          },
        },
      ]
    );
  };

  const startEditChild = (child) => {
    setEditingChildId(child.id);
    setChildNickname(child.nickname || "");
    setChildAvatarUri(child.avatarUrl || null);
    setChildAge(child.age.toString());
    setChildParentPhone(child.parentPhone || "");
    // Convert learning level from backend (lowercase) to uppercase for UI
    const backendLearningLevel = child.learningLevel || child.learning_level || "";
    const uiLearningLevel = backendLearningLevel ? backendLearningLevel.toUpperCase() : LearningLevel.BEGINNER;
    setChildLearningLevel(uiLearningLevel);
    setSelectedSection("editChild");
  };

  // Helper function to clear web focus and prevent aria-hidden warnings
  const clearWebFocus = () => {
    if (typeof document !== 'undefined' && document.activeElement) {
      document.activeElement?.blur();
    }
  };

  const handleSelectChild = async (child) => {
    // Clear focus before navigation to prevent accessibility warnings
    clearWebFocus();

    // Store selected child in AsyncStorage for kids dashboard
    try {
      // Ensure child has all required fields
      if (!child || !child.id) {
        Alert.alert(i18n.t("error"), i18n.t("invalidChildData"));
        return;
      }

      // Store the child first
      await AsyncStorage.setItem("@selected_child", JSON.stringify(child));

      // Verify it was stored (optional but helps with debugging)
      const verify = await AsyncStorage.getItem("@selected_child");
      if (!verify) {
        Alert.alert(i18n.t("error"), i18n.t("failedToStoreChildSelection"));
        return;
      }

      // Navigate to child dashboard (kids.jsx) - App switches to kid mode
      router.replace("/dashboard/kids");

    } catch (e) {
      console.warn("Failed to store selected child:", e);
      Alert.alert(i18n.t("error"), i18n.t("failedToSelectChild"));
    }
  };

  const viewChildProgress = async (childId) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
      const allProgress = stored ? JSON.parse(stored) : {};
      const progress = allProgress[childId] || {
        videosCompleted: [],
        quizResults: [],
      };

      // Load videos and quizzes count for display
      const [rawVideos, rawQuizzes] = await Promise.all([
        AsyncStorage.getItem(STORAGE.VIDEOS),
        AsyncStorage.getItem(STORAGE.QUIZZES),
      ]);
      const videos = rawVideos ? JSON.parse(rawVideos) : [];
      const quizzes = rawQuizzes ? JSON.parse(rawQuizzes) : {};

      const videosWatched = progress.videosCompleted?.length || 0;
      const totalVideos = videos.length;
      const quizzesCompleted = progress.quizResults?.length || 0;
      const totalQuizzes = Object.keys(quizzes).length;

      Alert.alert(
        i18n.t("childProgress"),
        `🎬 ${i18n.t("videosWatched")}: ${videosWatched} / ${totalVideos}\n` +
        `❓ ${i18n.t("quizzesCompleted")}: ${quizzesCompleted} / ${totalQuizzes}`,
        [{ text: i18n.t("ok") }]
      );
    } catch (e) {
      console.warn("Failed to load child progress", e);
      Alert.alert(i18n.t("error"), i18n.t("failedToLoadChildProgress"));
    }
  };

  // Handle logout - return to login screen
  const handleLogout = async () => {
    // Clear focus before modal/navigation to prevent accessibility warnings
    clearWebFocus();

    Alert.alert(
      i18n.t("logout"),
      i18n.t("logoutConfirm"),
      [
        {
          text: i18n.t("cancel"),
          style: "cancel",
        },
        {
          text: i18n.t("logout"),
          style: "destructive",
          onPress: async () => {
            try {
              // Clear user context
              if (logout) {
                await logout();
              }
              // Clear AsyncStorage
              await AsyncStorage.multiRemove([
                "user",
                "role",
                "@selected_child",
              ]);
              // Navigate to login
              router.replace("/login");
            } catch (e) {
              console.warn("Logout error:", e);
              // Still navigate to login even if there's an error
              router.replace("/login");
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F8FAFC",
    },
    floatingActions: {
      position: "absolute",
      top: Platform.OS === "ios" ? 50 : 20,
      left: 20,
      zIndex: 1000,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      right: 20,
      pointerEvents: "box-none",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    floatingBackButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#10B981",
      justifyContent: "center",
      alignItems: "center",
    },
    floatingLogoutButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: "#EF4444",
      justifyContent: "center",
      alignItems: "center",
    },
    welcomeSection: {
      marginTop: Platform.OS === "ios" ? 20 : 10,
      marginBottom: 24,
      paddingBottom: 20,
    },
    welcomeTitle: {
      fontSize: 32,
      fontWeight: "800",
      color: "#0F172A",
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: "#64748B",
      fontWeight: "500",
      lineHeight: 24,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: "#0F172A",
      marginBottom: 20,
      letterSpacing: 0.2,
    },
    addButton: {
      backgroundColor: "#10B981",
      padding: 18,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      ...Platform.select({
        ios: {
          shadowColor: "#10B981",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    addButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
      marginLeft: 10,
      letterSpacing: 0.3,
    },
    childCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    childCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginBottom: 12,
    },
    childAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 2,
      borderColor: "#E2E8F0",
    },
    childAvatarPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F1F5F9",
    },
    childName: {
      fontSize: 20,
      fontWeight: "700",
      color: "#0F172A",
      marginBottom: 8,
      letterSpacing: 0.2,
    },
    progressIcons: {
      flexDirection: "row",
      gap: 20,
      alignItems: "center",
    },
    progressIconItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#F8FAFC",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    progressIconText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#475569",
    },
    childInfo: {
      fontSize: 14,
      color: "#64748B",
      marginBottom: 4,
    },
    childActions: {
      flexDirection: "row",
      marginTop: 16,
      gap: 10,
    },
    actionButton: {
      flex: 1,
      padding: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    editButton: {
      backgroundColor: "#3B82F6",
    },
    deleteButton: {
      backgroundColor: "#EF4444",
    },
    progressButton: {
      backgroundColor: "#10B981",
    },
    actionButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    formContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: "#E2E8F0",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    input: {
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      marginBottom: 18,
      backgroundColor: "#F8FAFC",
      color: "#0F172A",
    },
    label: {
      fontSize: 15,
      fontWeight: "600",
      color: "#0F172A",
      marginBottom: 10,
      letterSpacing: 0.2,
    },
    avatarPickerContainer: {
      marginBottom: 20,
      alignItems: "center",
    },
    avatarPreview: {
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 3,
      borderColor: "#10B981",
      ...Platform.select({
        ios: {
          shadowColor: "#10B981",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    avatarPlaceholder: {
      width: 130,
      height: 130,
      borderRadius: 65,
      backgroundColor: "#F1F5F9",
      borderWidth: 3,
      borderColor: "#CBD5E1",
      borderStyle: "dashed",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarPlaceholderText: {
      marginTop: 10,
      fontSize: 14,
      color: "#64748B",
      fontWeight: "500",
    },
    removeAvatarButton: {
      marginTop: -10,
      marginBottom: 16,
      alignSelf: "center",
    },
    removeAvatarText: {
      color: "#EF4444",
      fontSize: 14,
      fontWeight: "600",
    },
    dropdownButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      borderRadius: 12,
      padding: 14,
      marginBottom: 18,
      backgroundColor: "#F8FAFC",
    },
    dropdownButtonText: {
      fontSize: 16,
      color: "#0F172A",
      fontWeight: "500",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    dropdownModal: {
      backgroundColor: "#FFFFFF",
      borderRadius: 20,
      width: "80%",
      maxWidth: 300,
      overflow: "hidden",
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
        },
        android: {
          elevation: 12,
        },
      }),
    },
    dropdownOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 18,
      borderBottomWidth: 1,
      borderBottomColor: "#F1F5F9",
    },
    dropdownOptionSelected: {
      backgroundColor: "#F0FDF4",
    },
    dropdownOptionText: {
      fontSize: 16,
      color: "#0F172A",
      fontWeight: "500",
    },
    dropdownOptionTextSelected: {
      color: "#10B981",
      fontWeight: "700",
    },
    formButtons: {
      flexDirection: "row",
      gap: 12,
      marginTop: 20,
      marginBottom: 20,
      zIndex: 10,
    },
    submitButton: {
      backgroundColor: "#10B981",
      padding: 18,
      borderRadius: 14,
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      minHeight: 54,
      ...Platform.select({
        ios: {
          shadowColor: "#10B981",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    saveButton: {
      backgroundColor: "#10B981",
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    cancelButton: {
      padding: 18,
      borderRadius: 14,
      alignItems: "center",
      flex: 1,
    },
    cancelButtonStyled: {
      backgroundColor: "#F1F5F9",
      borderWidth: 1.5,
      borderColor: "#E2E8F0",
      flexDirection: "row",
      justifyContent: "center",
      gap: 10,
      minHeight: 54,
    },
    cancelButtonText: {
      color: "#64748B",
      fontSize: 17,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyStateText: {
      fontSize: 16,
      color: "#64748B",
      textAlign: "center",
      marginTop: 20,
      fontWeight: "500",
      lineHeight: 24,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 24,
      padding: 8,
      alignSelf: "flex-start",
    },
    backButtonText: {
      fontSize: 17,
      color: "#10B981",
      marginLeft: 10,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        {/* testID added to support comprehensive dashboard tests */}
        <ActivityIndicator testID="loading-indicator" size="large" color="#10B981" />
        <Text style={{ marginTop: 10, color: "#64748B" }}>{i18n.t("loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Back Button */}
      <View style={styles.floatingActions}>
        <TouchableOpacity
          onPress={() => {
            // Try to go back, if fails, navigate to login
            try {
              router.back();
            } catch (e) {
              // If back navigation fails, go to login
              router.replace("/login");
            }
          }}
          style={styles.floatingBackButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Language Switcher */}
          <TouchableOpacity
            onPress={() => {
              const languages = ["en", "ti", "am"];
              const currentIndex = languages.indexOf(language);
              const nextIndex = (currentIndex + 1) % languages.length;
              changeLanguage(languages[nextIndex]);
            }}
            style={[styles.floatingBackButton, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" }]}
            accessibilityLabel={i18n.t('selectLanguage')}
          >
            <Ionicons name="language" size={20} color="#2563EB" />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={styles.floatingLogoutButton}
            accessibilityLabel={i18n.t('logout')}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {selectedSection === "dashboard" && (
            <>
              {/* Welcome Section */}
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>{i18n.t("parentDashboard") || "Parent Dashboard"}</Text>
                <Text style={styles.welcomeSubtitle}>{i18n.t("manageChildren") || "Manage your children's learning"}</Text>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                  setChildNickname("");
                  setChildAvatarUri(null);
                  setChildAge("");
                  setChildParentPhone("");
                  setChildLearningLevel(LearningLevel.BEGINNER);
                  setEditingChildId(null);
                  setSelectedSection("addChild");
                }}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.addButtonText}>{i18n.t("addChild")}</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>{i18n.t("myChildren")}</Text>

              {children.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color="#CBD5E1" />
                  <Text style={styles.emptyStateText}>
                    {i18n.t("noChildrenYet")}
                  </Text>
                </View>
              ) : (
                children
                  .filter((child) => child && (child.id || child.uuid)) // Only render children with valid IDs/UUIDs
                  .map((child) => {
                    // Ensure id is set (from uuid if needed) for rendering
                    if (!child.id && child.uuid) {
                      child.id = child.uuid;
                    }
                    return child;
                  })
                  .map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      style={styles.childCard}
                      onPress={() => handleSelectChild(child)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.childCardHeader}>
                        {child.avatarUrl ? (
                          <Image source={{ uri: child.avatarUrl }} style={styles.childAvatar} />
                        ) : (
                          <View style={[styles.childAvatar, styles.childAvatarPlaceholder]}>
                            <Ionicons name="person" size={24} color="#CBD5E1" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.childName}>{child.nickname}</Text>
                          {/* Progress Icons */}
                          <View style={styles.progressIcons}>
                            {(() => {
                              const progress = childProgress[child.id] || {};
                              const videosWatched = progress.videosCompleted?.length || 0;
                              const quizzesCompleted = progress.quizResults?.length || 0;
                              return (
                                <React.Fragment key={`progress-${child.id}`}>
                                  <View style={styles.progressIconItem}>
                                    <Ionicons name="videocam" size={16} color="#10B981" />
                                    <Text style={styles.progressIconText}>{videosWatched}</Text>
                                  </View>
                                  <View style={styles.progressIconItem}>
                                    <Ionicons name="help-circle" size={16} color="#2563EB" />
                                    <Text style={styles.progressIconText}>{quizzesCompleted}</Text>
                                  </View>
                                </React.Fragment>
                              );
                            })()}
                          </View>
                        </View>
                      </View>
                      <View style={styles.childActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.progressButton]}
                          onPress={(e) => {
                            e.stopPropagation();
                            viewChildProgress(child.id);
                          }}
                        >
                          <Text style={styles.actionButtonText}>{i18n.t("progress")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.editButton]}
                          onPress={(e) => {
                            e.stopPropagation();
                            startEditChild(child);
                          }}
                        >
                          <Text style={styles.actionButtonText}>{i18n.t("edit")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.deleteButton]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteChild(child.id);
                          }}
                        >
                          <Text style={styles.actionButtonText}>{i18n.t("delete")}</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))
              )}
            </>
          )}

          {(selectedSection === "addChild" || selectedSection === "editChild") && (
            <View style={styles.formContainer}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setSelectedSection("dashboard");
                  setEditingChildId(null);
                  setChildNickname("");
                  setChildAvatarUri(null);
                  setChildAge("");
                  setChildParentPhone("");
                  setChildLearningLevel(LearningLevel.BEGINNER);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#10B981" />
                <Text style={styles.backButtonText}>{i18n.t("back")}</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>
                {selectedSection === "addChild" ? i18n.t("addNewChild") : i18n.t("editChild")}
              </Text>

              {/* Nickname - Required */}
              <Text style={styles.label}>{i18n.t("nickname")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("enterChildNickname")}
                value={childNickname}
                onChangeText={setChildNickname}
              />

              {/* Avatar - Optional */}
              <Text style={styles.label}>{i18n.t("avatar")} ({i18n.t("optional")})</Text>
              <TouchableOpacity
                style={styles.avatarPickerContainer}
                onPress={pickAvatarPhoto}
              >
                {childAvatarUri ? (
                  <Image source={{ uri: childAvatarUri }} style={styles.avatarPreview} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="camera" size={32} color="#CBD5E1" />
                    <Text style={styles.avatarPlaceholderText}>{i18n.t("tapToPickPhoto")}</Text>
                  </View>
                )}
              </TouchableOpacity>
              {childAvatarUri && (
                <TouchableOpacity
                  style={styles.removeAvatarButton}
                  onPress={() => setChildAvatarUri(null)}
                >
                  <Text style={styles.removeAvatarText}>{i18n.t("removePhoto")}</Text>
                </TouchableOpacity>
              )}

              {/* Age - Required, 4-6 only */}
              <Text style={styles.label}>{i18n.t("age")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("enterAge")}
                value={childAge}
                onChangeText={setChildAge}
                keyboardType="numeric"
                maxLength={1}
              />

              {/* Parent Phone - Required */}
              <Text style={styles.label}>{i18n.t("parentPhone")} *</Text>
              <TextInput
                style={styles.input}
                placeholder={i18n.t("enterParentPhone")}
                value={childParentPhone}
                onChangeText={setChildParentPhone}
                keyboardType="phone-pad"
              />

              {/* Learning Level - Required - Dropdown */}
              <Text style={styles.label}>{i18n.t("learningLevel")} *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowLearningLevelModal(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {i18n.t(childLearningLevel.toLowerCase())}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Learning Level Modal Dropdown */}
              <Modal
                visible={showLearningLevelModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLearningLevelModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowLearningLevelModal(false)}
                >
                  <View style={styles.dropdownModal}>
                    {[
                      { value: LearningLevel.BEGINNER, label: i18n.t("beginner") },
                      { value: LearningLevel.INTERMEDIATE, label: i18n.t("intermediate") },
                      { value: LearningLevel.ADVANCED, label: i18n.t("advanced") },
                    ].map(({ value, label }) => (
                      <TouchableOpacity
                        key={value}
                        style={[
                          styles.dropdownOption,
                          childLearningLevel === value && styles.dropdownOptionSelected,
                        ]}
                        onPress={() => {
                          setChildLearningLevel(value);
                          setShowLearningLevelModal(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionText,
                            childLearningLevel === value && styles.dropdownOptionTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                        {childLearningLevel === value && (
                          <Ionicons name="checkmark" size={20} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              <View style={styles.formButtons}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.saveButton]}
                  onPress={() => {
                    if (selectedSection === "addChild") {
                      handleAddChild();
                    } else if (selectedSection === "editChild") {
                      handleEditChild();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>
                    {selectedSection === "addChild" ? i18n.t("saveChild") : i18n.t("saveChanges")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelButton, styles.cancelButtonStyled]}
                  onPress={() => {
                    setSelectedSection("dashboard");
                    setEditingChildId(null);
                    setChildNickname("");
                    setChildAvatarUri(null);
                    setChildAge("");
                    setChildParentPhone("");
                    setChildLearningLevel(LearningLevel.BEGINNER);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle" size={20} color="#64748B" />
                  <Text style={styles.cancelButtonText}>{i18n.t("cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

