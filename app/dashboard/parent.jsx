// Parent Dashboard
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import i18n from "../../i18n";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUser } from "../../contexts/UserContext";

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

  // Load children from storage
  useEffect(() => {
    loadChildren();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadChildren();
    }, [])
  );

  const loadChildren = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      const [storedChildren, storedProgress] = await Promise.all([
        AsyncStorage.getItem(STORAGE.CHILDREN),
        AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),
      ]);

      if (storedChildren) {
        const allChildren = JSON.parse(storedChildren);
        // Filter children for current parent
        const parentChildren = allChildren[user.id] || [];
        setChildren(parentChildren);
      } else {
        setChildren([]);
      }

      // Load progress for all children
      if (storedProgress) {
        const allProgress = JSON.parse(storedProgress);
        setChildProgress(allProgress);
      } else {
        setChildProgress({});
      }
    } catch (e) {
      console.warn("Failed to load children", e);
      setChildren([]);
      setChildProgress({});
    } finally {
      setLoading(false);
    }
  };

  const saveChildren = async (childrenList) => {
    try {
      if (!user?.id) {
        throw new Error("User ID is missing. Please log in again.");
      }

      const stored = await AsyncStorage.getItem(STORAGE.CHILDREN);
      let allChildren = stored ? JSON.parse(stored) : {};
      allChildren[user.id] = childrenList;
      await AsyncStorage.setItem(STORAGE.CHILDREN, JSON.stringify(allChildren));
      setChildren(childrenList);
    } catch (e) {
      console.warn("Failed to save children", e);
      throw e; // Re-throw so the calling function can handle it
    }
  };

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
    try {
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

      const newChild = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // UUID-like (backend will generate actual UUID)
        nickname: childNickname.trim(),
        avatarUrl: childAvatarUri || null, // Optional field - stores URI locally
        age: age,
        parentPhone: childParentPhone.trim(),
        learningLevel: childLearningLevel,
      };

      const updated = [...children, newChild];
      await saveChildren(updated);
      
      Alert.alert(i18n.t("success"), i18n.t("childAddedSuccessfully"));
      
      // Reset form
      setChildNickname("");
      setChildAvatarUri(null);
      setChildAge("");
      setChildParentPhone("");
      setChildLearningLevel(LearningLevel.BEGINNER);
      setSelectedSection("dashboard");
      
      // Reload children to refresh the list
      await loadChildren();
    } catch (error) {
      console.error("Error adding child:", error);
      Alert.alert(i18n.t("error"), "Failed to add child. Please try again.");
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

      const updated = children.map((child) =>
        child.id === editingChildId
          ? {
              ...child,
              nickname: childNickname.trim(),
              avatarUrl: childAvatarUri || null,
              age: age,
              parentPhone: childParentPhone.trim(),
              learningLevel: childLearningLevel,
            }
          : child
      );

      await saveChildren(updated);
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
      Alert.alert(i18n.t("error"), "Failed to update child. Please try again.");
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
            const updated = children.filter((child) => child.id !== childId);
            await saveChildren(updated);
            Alert.alert(i18n.t("success"), i18n.t("childDeletedSuccessfully"));
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
    setChildLearningLevel(child.learningLevel || LearningLevel.BEGINNER);
    setSelectedSection("editChild");
  };

  const handleSelectChild = async (child) => {
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
      router.push("/dashboard/kids");
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
      backgroundColor: "#F0FDF4",
    },
    header: {
      backgroundColor: "#10B981",
      paddingVertical: 20,
      paddingHorizontal: 20,
      paddingTop: Platform.OS === "android" ? 20 : 60,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    logoutButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    headerSubtitle: {
      fontSize: 14,
      color: "#D1FAE5",
      marginTop: 4,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "#0F172A",
      marginBottom: 16,
    },
    addButton: {
      backgroundColor: "#10B981",
      padding: 16,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    addButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    childCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
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
    childCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 8,
    },
    childAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    childAvatarPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F1F5F9",
    },
    childName: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#0F172A",
      marginBottom: 6,
    },
    progressIcons: {
      flexDirection: "row",
      gap: 16,
      alignItems: "center",
    },
    progressIconItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    progressIconText: {
      fontSize: 14,
      fontWeight: "600",
      color: "#64748B",
    },
    childInfo: {
      fontSize: 14,
      color: "#64748B",
      marginBottom: 4,
    },
    childActions: {
      flexDirection: "row",
      marginTop: 12,
      gap: 8,
    },
    actionButton: {
      flex: 1,
      padding: 10,
      borderRadius: 8,
      alignItems: "center",
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
      fontSize: 14,
      fontWeight: "600",
    },
    formContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      padding: 20,
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
    input: {
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 16,
      backgroundColor: "#FFFFFF",
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: "#0F172A",
      marginBottom: 8,
    },
    avatarPickerContainer: {
      marginBottom: 16,
      alignItems: "center",
    },
    avatarPreview: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 2,
      borderColor: "#E2E8F0",
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: "#F1F5F9",
      borderWidth: 2,
      borderColor: "#E2E8F0",
      borderStyle: "dashed",
      justifyContent: "center",
      alignItems: "center",
    },
    avatarPlaceholderText: {
      marginTop: 8,
      fontSize: 14,
      color: "#64748B",
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
      borderWidth: 1,
      borderColor: "#E2E8F0",
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
      backgroundColor: "#FFFFFF",
    },
    dropdownButtonText: {
      fontSize: 16,
      color: "#0F172A",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    dropdownModal: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      width: "80%",
      maxWidth: 300,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    dropdownOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#E2E8F0",
    },
    dropdownOptionSelected: {
      backgroundColor: "#F0FDF4",
    },
    dropdownOptionText: {
      fontSize: 16,
      color: "#0F172A",
    },
    dropdownOptionTextSelected: {
      color: "#10B981",
      fontWeight: "600",
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
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      minHeight: 50,
      ...Platform.select({
        ios: {
          shadowColor: "#10B981",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    saveButton: {
      backgroundColor: "#10B981",
    },
    submitButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    cancelButton: {
      padding: 16,
      borderRadius: 8,
      alignItems: "center",
      flex: 1,
    },
    cancelButtonStyled: {
      backgroundColor: "#F1F5F9",
      borderWidth: 1,
      borderColor: "#E2E8F0",
      flexDirection: "row",
      justifyContent: "center",
      gap: 8,
      minHeight: 50,
    },
    cancelButtonText: {
      color: "#64748B",
      fontSize: 16,
      fontWeight: "600",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      color: "#64748B",
      textAlign: "center",
      marginTop: 16,
    },
    backButton: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    backButtonText: {
      fontSize: 16,
      color: "#10B981",
      marginLeft: 8,
      fontWeight: "600",
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={{ marginTop: 10, color: "#64748B" }}>{i18n.t("loading")}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
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
                children.map((child) => (
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
                              <>
                                <View style={styles.progressIconItem}>
                                  <Ionicons name="videocam" size={16} color="#10B981" />
                                  <Text style={styles.progressIconText}>{videosWatched}</Text>
                                </View>
                                <View style={styles.progressIconItem}>
                                  <Ionicons name="help-circle" size={16} color="#2563EB" />
                                  <Text style={styles.progressIconText}>{quizzesCompleted}</Text>
                                </View>
                              </>
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

