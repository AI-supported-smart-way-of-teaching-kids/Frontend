// Teacher.jsx
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
  Easing,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Modal,
} from "react-native";
import api from "../../src/api";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import i18n from "../../i18n";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUser } from "../../contexts/UserContext";

const { width, height } = Dimensions.get("window");
const isTablet = width >= 768;
const isSmallScreen = width < 375;

const STORAGE = {
  VIDEOS: "@app_videos_v1",
  QUIZZES: "@app_quizzes_v1",
  COLLECTIONS: "@app_collections_v1",
  // progress for teachers - tracks per student
  PROGRESS: "@app_progress_v1",
  STUDENT_PROGRESS: "@app_student_progress_v1", // { studentId: { videosCompleted: [], videoWatchingDetails: [], quizResults: [] } }
  TEACHER_PROFILES: "@app_teacher_profiles_v1",
};

// Helper function to format duration in days, hours, minutes, seconds
const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds < 0) {
    return "0 seconds";
  }
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`);
  
  return parts.join(", ");
};

// small AnimatedPressable (copy of Kids style)
const AnimatedPressable = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function TeacherDashboard() {
  const router = useRouter();
  const { language, changeLanguage } = useLanguage();
  const { user } = useUser();
  const [teacherProfile, setTeacherProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // Data
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState({}); // object keyed by id
  const [collections, setCollections] = useState({}); // object keyed by id

  // Local UI state
  const [selectedSection, setSelectedSection] = useState("dashboard"); // dashboard | videos | quizzes | progress
  const [detail, setDetail] = useState(null); // optional inline detail like Kids

  // Video form / edit
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [videoDifficulty, setVideoDifficulty] = useState("easy"); // easy, medium, hard
  const [videoTags, setVideoTags] = useState("");
  const [videoIsPublished, setVideoIsPublished] = useState(true);
  const [editingVideoId, setEditingVideoId] = useState(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [videoCollection, setVideoCollection] = useState(""); // selected collection ID for video

  // Collection form
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Quiz builder
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState([]); // array of { question, options:[], answerIndex, type, imageUri?, audioUri? }
  // current question inputs
  const [qText, setQText] = useState("");
  const [qType, setQType] = useState("text"); // "text" | "image" | "audio"
  const [qImageUri, setQImageUri] = useState(null);
  const [qAudioUri, setQAudioUri] = useState(null);
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qOptionTypes, setQOptionTypes] = useState(["text", "text", "text", "text"]); // track option types
  const [qOptionImages, setQOptionImages] = useState([null, null, null, null]);
  const [qOptionAudios, setQOptionAudios] = useState([null, null, null, null]);
  const [qAnswerIndex, setQAnswerIndex] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingQuizTitle, setEditingQuizTitle] = useState("");
  const [editingQuizQuestions, setEditingQuizQuestions] = useState([]);

  // progress (teacher view)
  const [progress, setProgress] = useState([]);
  const [studentProgress, setStudentProgress] = useState({}); // { studentId: { name, videosCompleted, quizResults } }

  // Pick profile photo directly from dashboard
  const pickProfilePhoto = async () => {
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
        quality: 0.7,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        // Load existing profile
        const stored = await AsyncStorage.getItem("@app_profile_v1");
        let data = stored ? JSON.parse(stored) : {};
        // Update only photo
        data.photo = uri;
        // Save back
        await AsyncStorage.setItem("@app_profile_v1", JSON.stringify(data));
        // Update state
        setProfile(data);
      }
    } catch (e) {
      console.log(e);
    }
  };

  // Check teacher profile on mount
  useEffect(() => {
    const checkTeacherProfile = async () => {
      if (!user || user.role !== "teacher") {
        router.replace("/(drawer)/login");
        return;
      }

      try {
        const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
        if (!storedProfiles) {
          // No profile found, redirect to setup
          router.replace("/teacher-profile-setup");
          return;
        }

        const profiles = JSON.parse(storedProfiles);
        const profile = profiles[user.id];

        if (!profile) {
          // Profile not found for this user, redirect to setup
          router.replace("/teacher-profile-setup");
          return;
        }

        setTeacherProfile(profile);
      } catch (e) {
        console.warn("Error checking teacher profile:", e);
        router.replace("/teacher-profile-setup");
      }
    };

    checkTeacherProfile();
  }, [user, router]);

  // load stored data
  useEffect(() => {
    (async () => {
      try {
        const [rawVideos, rawQuizzes, rawCollections, rawProgress, rawStudentProgress] = await Promise.all([
          AsyncStorage.getItem(STORAGE.VIDEOS),
          AsyncStorage.getItem(STORAGE.QUIZZES),
          AsyncStorage.getItem(STORAGE.COLLECTIONS),
          AsyncStorage.getItem(STORAGE.PROGRESS),
          AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),

        ]);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
        setQuizzes(rawQuizzes ? JSON.parse(rawQuizzes) : {});
        setCollections(rawCollections ? JSON.parse(rawCollections) : {});
        setProgress(rawProgress ? JSON.parse(rawProgress) : []);
        setStudentProgress(rawStudentProgress ? JSON.parse(rawStudentProgress) : {});
      } catch (e) {
        console.warn("Teacher: failed to load data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
useFocusEffect(
  React.useCallback(() => {
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem("@app_profile_v1");
        if (stored) {
          const profileData = JSON.parse(stored);
          // Ensure photo is only set if it exists and is valid
          if (profileData.photo && profileData.photo.trim() !== "") {
            setProfile(profileData);
          } else {
            // Clear photo if it's empty or invalid
            setProfile({ ...profileData, photo: null });
          }
        } else {
          // First-time user - initialize with empty profile
          setProfile(null);
        }
      } catch (e) {
        console.warn("Failed to load profile", e);
        setProfile(null);
      }
    };
    loadProfile();
  }, [])
);

  // generic save helpers
  const persist = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Persist error", key, e);
    }
  };

  // ---------- COLLECTIONS ----------
  const addCollection = async () => {
    if (!collectionTitle.trim()) {
      Alert.alert(i18n.t('error'), "Collection title is required");
      return;
    }
    const id = Date.now().toString();
    const item = {
      id,
      title: collectionTitle.trim(),
      description: collectionDescription.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = { ...collections, [id]: item };
    setCollections(updated);
    await persist(STORAGE.COLLECTIONS, updated);
    Alert.alert(i18n.t('success'), "Collection created successfully");
    setCollectionTitle("");
    setCollectionDescription("");
    setShowCollectionModal(false);
  };

  const deleteCollection = (id) => {
    Alert.alert("Delete Collection", i18n.t('areYouSure'), [
      { text: i18n.t('cancel') },
      {
        text: i18n.t('delete'),
        style: "destructive",
        onPress: async () => {
          const updated = { ...collections };
          delete updated[id];
          setCollections(updated);
          await persist(STORAGE.COLLECTIONS, updated);
        },
      },
    ]);
  };

  // ---------- VIDEOS ----------
  const pickVideo = async () => {
    try {
      // DocumentPicker for videos (works for multiple file types)
      const result = await DocumentPicker.getDocumentAsync({ 
        type: "video/*",
        copyToCacheDirectory: true,
      });
      
      // expo-document-picker v14+ returns { canceled: boolean, assets: [...] }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setVideoUrl(file.uri);
        Alert.alert(i18n.t('success'), `${i18n.t('video')} "${file.name || i18n.t('file')}" ${i18n.t('selectedSuccessfully')}`);
      } else if (result.type === "success") {
        // Fallback for older API format
        setVideoUrl(result.uri);
        Alert.alert(i18n.t('success'), `${i18n.t('video')} "${result.name || i18n.t('file')}" ${i18n.t('selectedSuccessfully')}`);
      }
    } catch (e) {
      console.warn("pickVideo error", e);
      Alert.alert(i18n.t('error'), i18n.t('failedToPickVideo'));
    }
  };

  const pickThumbnail = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(i18n.t('permissionRequired'), i18n.t('allowGalleryAccess'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled) {
        setThumbnailUrl(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("pickThumbnail error", e);
      Alert.alert(i18n.t('error'), "Failed to pick thumbnail image");
    }
  };

  const addVideo = async () => {
    if (!videoTitle.trim()) {
      Alert.alert(i18n.t('error'), "Title is required");
      return;
    }
    if (!videoDescription.trim()) {
      Alert.alert(i18n.t('error'), "Description is required");
      return;
    }
    if (!videoDifficulty) {
      Alert.alert(i18n.t('error'), "Difficulty is required");
      return;
    }
    
    const videoId = Date.now().toString();
    const item = {
      id: videoId,
      title: videoTitle.trim(),
      description: videoDescription.trim(),
      video_url: videoUrl.trim() || null,
      thumbnail_url: thumbnailUrl.trim() || null,
      duration_seconds: durationSeconds ? parseInt(durationSeconds) : null,
      difficulty: videoDifficulty,
      collection: videoCollection ? videoCollection : null,
      tags: videoTags.trim() ? videoTags.trim().split(',').map(t => t.trim()) : [],
      is_published: videoIsPublished,
      createdAt: new Date().toISOString(),
    };
    const updated = [item, ...videos];
    setVideos(updated);
    await persist(STORAGE.VIDEOS, updated);
    
    Alert.alert(i18n.t('success'), i18n.t('videoUploadedSuccessfully'));
    // Reset form
    setVideoTitle("");
    setVideoDescription("");
    setVideoUrl("");
    setThumbnailUrl("");
    setDurationSeconds("");
    setVideoDifficulty("easy");
    setVideoTags("");
    setVideoIsPublished(true);
  };

  const startEditVideo = (id) => {
    const v = videos.find((x) => x.id === id);
    if (!v) return;
    setEditingVideoId(id);
    setVideoTitle(v.title || "");
    setVideoDescription(v.description || "");
    setVideoUrl(v.video_url || v.uri || ""); // Support both video_url and uri for backward compatibility
    setThumbnailUrl(v.thumbnail_url || "");
    setDurationSeconds(v.duration_seconds ? String(v.duration_seconds) : "");
    setVideoDifficulty(v.difficulty || "easy");
    setVideoCollection(v.collection ? String(v.collection) : "");
    setVideoTags(Array.isArray(v.tags) ? v.tags.join(', ') : (v.tags || ""));
    setVideoIsPublished(v.is_published !== undefined ? v.is_published : true);
  };

  const saveEditVideo = async () => {
    if (!editingVideoId) return;
    if (!videoTitle.trim()) {
      Alert.alert(i18n.t('error'), "Title is required");
      return;
    }
    if (!videoDescription.trim()) {
      Alert.alert(i18n.t('error'), "Description is required");
      return;
    }
    if (!videoDifficulty) {
      Alert.alert(i18n.t('error'), "Difficulty is required");
      return;
    }
    
    const updated = videos.map((v) => 
      v.id === editingVideoId ? {
        ...v,
        title: videoTitle.trim(),
        description: videoDescription.trim(),
        video_url: videoUrl.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        duration_seconds: durationSeconds ? parseInt(durationSeconds) : null,
        difficulty: videoDifficulty,
        collection: videoCollection ? videoCollection : null,
        tags: videoTags.trim() ? videoTags.trim().split(',').map(t => t.trim()) : [],
        is_published: videoIsPublished,
      } : v
    );
    setVideos(updated);
    await persist(STORAGE.VIDEOS, updated);
    
    setEditingVideoId(null);
    // Reset form
    setVideoTitle("");
    setVideoDescription("");
    setVideoUrl("");
    setThumbnailUrl("");
    setDurationSeconds("");
    setVideoDifficulty("easy");
    setVideoCollection("");
    setVideoTags("");
    setVideoIsPublished(true);
  };

  const deleteVideo = (id) => {
    Alert.alert(i18n.t('deleteVideoConfirm'), i18n.t('areYouSure'), [
      { text: i18n.t('cancel') },
      {
        text: i18n.t('delete'),
        style: "destructive",
        onPress: async () => {
          const updated = videos.filter((v) => v.id !== id);
          setVideos(updated);
          await persist(STORAGE.VIDEOS, updated);
        },
      },
    ]);
  };

  // ---------- QUIZZES ----------
  // Pick image for question
  const pickQuestionImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(i18n.t('permissionRequired'), i18n.t('allowGalleryAccess'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        setQImageUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn("pickQuestionImage error", e);
    }
  };

  // Pick audio for question
  const pickQuestionAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setQAudioUri(result.assets[0].uri);
        Alert.alert(i18n.t('success'), "Audio selected successfully!");
      }
    } catch (e) {
      console.warn("pickQuestionAudio error", e);
      Alert.alert(i18n.t('error'), i18n.t('failedToPickAudioFile'));
    }
  };

  // Pick image for option
  const pickOptionImage = async (optionIndex) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(i18n.t('permissionRequired'), i18n.t('allowGalleryAccess'));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled) {
        const newImages = [...qOptionImages];
        newImages[optionIndex] = result.assets[0].uri;
        setQOptionImages(newImages);
        const newTypes = [...qOptionTypes];
        newTypes[optionIndex] = "image";
        setQOptionTypes(newTypes);
      }
    } catch (e) {
      console.warn("pickOptionImage error", e);
    }
  };

  // Pick audio for option
  const pickOptionAudio = async (optionIndex) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newAudios = [...qOptionAudios];
        newAudios[optionIndex] = result.assets[0].uri;
        setQOptionAudios(newAudios);
        const newTypes = [...qOptionTypes];
        newTypes[optionIndex] = "audio";
        setQOptionTypes(newTypes);
        Alert.alert(i18n.t('success'), "Audio selected successfully!");
      }
    } catch (e) {
      console.warn("pickOptionAudio error", e);
      Alert.alert(i18n.t('error'), i18n.t('failedToPickAudioFile'));
    }
  };

  // add a question to the current quiz being built
  const addQuestionToBuilder = () => {
    if (!qText.trim()) {
      Alert.alert(i18n.t('enterQuestionText'));
      return;
    }
    
    // Validate options based on type
    const hasValidOptions = qOptions.every((opt, idx) => {
      if (qOptionTypes[idx] === "text") {
        return opt.trim() !== "";
      } else if (qOptionTypes[idx] === "image") {
        return qOptionImages[idx] !== null;
      } else if (qOptionTypes[idx] === "audio") {
        return qOptionAudios[idx] !== null;
      }
      return false;
    });
    
    if (!hasValidOptions) {
      Alert.alert(i18n.t('fillAllOptions'));
      return;
    }
    
    if (qAnswerIndex === null || isNaN(qAnswerIndex) || qAnswerIndex < 0 || qAnswerIndex >= qOptions.length) {
      Alert.alert(i18n.t('selectValidCorrectOption'));
      return;
    }

    // Validate question media
    if (qType === "image" && !qImageUri) {
      Alert.alert("Please select an image for the question");
      return;
    }
    if (qType === "audio" && !qAudioUri) {
      Alert.alert("Please select an audio file for the question");
      return;
    }

    // Build options array with proper structure
    const options = qOptions.map((opt, idx) => {
      if (qOptionTypes[idx] === "image") {
        return { type: "image", imageUri: qOptionImages[idx] };
      } else if (qOptionTypes[idx] === "audio") {
        return { type: "audio", audioUri: qOptionAudios[idx] };
      } else {
        return opt.trim();
      }
    });

    const questionObj = {
      id: Date.now().toString(),
      question: qText.trim(),
      type: qType,
      imageUri: qImageUri,
      audioUri: qAudioUri,
      options: options,
      answerIndex: Number(qAnswerIndex),
    };
    setQuizQuestions([questionObj, ...quizQuestions]);
    setQText("");
    setQType("text");
    setQImageUri(null);
    setQAudioUri(null);
    setQOptions(["", "", "", ""]);
    setQOptionTypes(["text", "text", "text", "text"]);
    setQOptionImages([null, null, null, null]);
    setQOptionAudios([null, null, null, null]);
    setQAnswerIndex(null);
  };

  const saveQuiz = async () => {
    if (!quizTitle.trim()) {
      Alert.alert(i18n.t('enterQuizTitle'));
      return;
    }
    if (quizQuestions.length === 0) {
      Alert.alert(i18n.t('addAtLeastOneQuestion'));
      return;
    }

    const id = Date.now().toString();
    const payload = {
      id,
      title: quizTitle.trim(),
      questions: quizQuestions,
      results: [], // teacher can view later
      createdAt: new Date().toISOString(),
    };

    const updated = { ...quizzes, [id]: payload };
    setQuizzes(updated);
    await persist(STORAGE.QUIZZES, updated);

    setQuizTitle("");
    setQuizQuestions([]);
  };

  const startEditQuiz = (id) => {
    const q = quizzes[id];
    if (!q) return;
    setEditingQuizId(id);
    setEditingQuizTitle(q.title || "");
    setEditingQuizQuestions(q.questions ? [...q.questions] : []);
  };

  const saveEditQuiz = async () => {
    if (!editingQuizId) return;
    if (!editingQuizTitle.trim()) {
      Alert.alert(i18n.t('quizTitleRequired'));
      return;
    }
    if (!editingQuizQuestions || editingQuizQuestions.length === 0) {
      Alert.alert(i18n.t('quizMustHaveAtLeastOneQuestion'));
      return;
    }
    const updated = { ...quizzes, [editingQuizId]: { ...(quizzes[editingQuizId] || {}), title: editingQuizTitle.trim(), questions: editingQuizQuestions } };
    setQuizzes(updated);
    await persist(STORAGE.QUIZZES, updated);
    setEditingQuizId(null);
    setEditingQuizTitle("");
    setEditingQuizQuestions([]);
  };

  const deleteQuiz = (id) => {
    Alert.alert(i18n.t('deleteQuizConfirm'), i18n.t('areYouSure'), [
      { text: i18n.t('cancel') },
      {
        text: i18n.t('delete'),
        style: "destructive",
        onPress: async () => {
          const updated = { ...quizzes };
          delete updated[id];
          setQuizzes(updated);
          await persist(STORAGE.QUIZZES, updated);
        },
      },
    ]);
  };

  // ---------- progress (teacher view) ----------
  // progress stored in STORAGE.PROGRESS could be populated by Kids screen usage
  const refreshProgress = async () => {
    try {
      const [rawProgress, rawStudentProgress] = await Promise.all([
        AsyncStorage.getItem(STORAGE.PROGRESS),
        AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),
      ]);
      setProgress(rawProgress ? JSON.parse(rawProgress) : []);
      setStudentProgress(rawStudentProgress ? JSON.parse(rawStudentProgress) : {});
    } catch (e) {
      console.warn("refreshProgress", e);
    }
  };

  // ---------- helper renderers ----------
  const renderCard = (item, type) => {
    // simple card that opens inline edit/preview for teacher
    return (
      <AnimatedPressable
        key={item.id}
        style={{ marginTop: 12 }}
        onPress={() => {
          // show inline detail for preview
          setDetail({ type, item });
          if (type === "quizzes") {
            // nothing else
          }
        }}
      >
        <View style={styles.itemCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {type === "videos" ? "🎬 " : "❓ "}
              {item.title}
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{type}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
        </View>
      </AnimatedPressable>
    );
  };

  // Don't render if profile check is in progress or no profile exists
  if (!teacherProfile) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={{ marginTop: 10, color: "#444" }}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4c1d95" />
        <Text style={{ marginTop: 10, color: "#444" }}>{i18n.t('loading')}</Text>
      </SafeAreaView>
    );
  }

  // Section toggles: dashboard / lessons / videos / quizzes / progress
  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar with avatar and actions */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={pickProfilePhoto}
          accessibilityLabel={i18n.t('goToProfile')}
          style={{ position: "relative" }}
        >
          {profile?.photo && profile.photo.trim() !== "" ? (
            <Image source={{ uri: profile.photo }} style={styles.profileAvatar} />
          ) : (
            <View style={[styles.profileAvatar, { backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" }]}>
              <Ionicons name="person" size={28} color="#fff" />
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Language Switcher */}
          <TouchableOpacity 
            onPress={() => {
              const languages = ["en", "ti", "am"];
              const currentIndex = languages.indexOf(language);
              const nextIndex = (currentIndex + 1) % languages.length;
              changeLanguage(languages[nextIndex]);
            }}
            style={[styles.actionButton, { backgroundColor: "#f0f0f0" }]}
            accessibilityLabel={i18n.t('selectLanguage')}
          >
            <Ionicons name="language" size={20} color="#4c1d95" />
          </TouchableOpacity>
          
          {/* Logout Button */}
          <TouchableOpacity onPress={() => router.replace("/(drawer)/login")} style={styles.actionButton}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fullscreen Modal for detail view */}
      <Modal
        visible={!!detail}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setDetail(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <View style={{ flex: 1 }}>
            {/* Header with close button */}
            <View style={styles.fullscreenHeader}>
              <TouchableOpacity
                style={styles.fullscreenCloseButton}
                onPress={() => setDetail(null)}
              >
                <Ionicons name="close" size={28} color="#000" />
              </TouchableOpacity>
              <Text style={styles.fullscreenHeaderTitle}>
                {detail?.type === "videos" ? i18n.t('video') : i18n.t('quiz')}
              </Text>
              <View style={{ width: 44 }} />
            </View>

            {detail?.type === "videos" && (
              <ScrollView contentContainerStyle={[
                styles.fullscreenContent,
                { paddingHorizontal: isTablet ? 40 : isSmallScreen ? 12 : 18, maxWidth: isTablet ? 900 : "100%", alignSelf: "center", width: "100%" }
              ]}>
                <Text style={[styles.lessonTitle, { fontSize: isTablet ? 32 : 24 }]}>
                  {detail.item.title}
                </Text>
                <Text style={{ marginTop: 12, fontSize: isTablet ? 18 : 16 }}>
                  {detail.item.description || i18n.t('noDescription')}
                </Text>
                <Text style={{ marginTop: 12, color: "#666", fontSize: isTablet ? 16 : 14 }}>
                  {i18n.t('uri')}: {detail.item.uri}
                </Text>

                <View style={{ marginTop: 24 }}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { padding: isTablet ? 16 : 12 }]}
                    onPress={() => {
                      startEditVideo(detail.item.id);
                      setDetail(null);
                      setSelectedSection("videos");
                    }}
                  >
                    <Text style={[styles.smallBtnText, { fontSize: isTablet ? 16 : 14 }]}>
                      {i18n.t('edit')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            {detail?.type === "quizzes" && (
              <ScrollView contentContainerStyle={[
                styles.fullscreenContent,
                { paddingHorizontal: isTablet ? 40 : isSmallScreen ? 12 : 18, maxWidth: isTablet ? 900 : "100%", alignSelf: "center", width: "100%" }
              ]}>
                <Text style={[
                  styles.lessonTitle,
                  { marginBottom: 16, fontSize: isTablet ? 32 : 24 }
                ]}>
                  {detail.item.title}
                </Text>
                {(detail.item.questions || []).map((q, i) => (
                  <View key={q.id || i} style={{
                    marginBottom: isTablet ? 20 : 12,
                    padding: isTablet ? 20 : 12,
                    backgroundColor: "#f5f5f5",
                    borderRadius: 8
                  }}>
                    <Text style={{ fontWeight: "800", fontSize: isTablet ? 18 : 16 }}>
                      {i + 1}. {q.question} {q.type && `[${q.type}]`}
                    </Text>
                    {q.type === "image" && q.imageUri && (
                      <Image
                        source={{ uri: q.imageUri }}
                        style={{
                          width: "100%",
                          height: isTablet ? 250 : 150,
                          marginTop: 8,
                          borderRadius: 8,
                          resizeMode: "contain"
                        }}
                      />
                    )}
                    {q.type === "audio" && q.audioUri && (
                      <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                        <Ionicons name="musical-notes" size={isTablet ? 24 : 20} color="#4c1d95" />
                        <Text style={{ marginLeft: 8, color: "#666", fontSize: isTablet ? 16 : 14 }}>
                          Audio question
                        </Text>
                      </View>
                    )}
                    {q.options.map((o, j) => (
                      <View key={j} style={{ marginLeft: 12, marginTop: 8 }}>
                        {typeof o === "string" ? (
                          <Text style={{
                            color: q.answerIndex === j ? "green" : "#111",
                            fontWeight: q.answerIndex === j ? "700" : "400",
                            fontSize: isTablet ? 16 : 14
                          }}>
                            • {o}
                          </Text>
                        ) : o.type === "image" && o.imageUri ? (
                          <View>
                            <Text style={{
                              color: q.answerIndex === j ? "green" : "#111",
                              fontWeight: q.answerIndex === j ? "700" : "400",
                              fontSize: isTablet ? 16 : 14
                            }}>
                              • Option {j + 1} (Image):
                            </Text>
                            <Image
                              source={{ uri: o.imageUri }}
                              style={{
                                width: "80%",
                                height: isTablet ? 150 : 100,
                                marginTop: 4,
                                borderRadius: 8,
                                resizeMode: "contain"
                              }}
                            />
                          </View>
                        ) : o.type === "audio" && o.audioUri ? (
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <Text style={{
                              color: q.answerIndex === j ? "green" : "#111",
                              fontWeight: q.answerIndex === j ? "700" : "400",
                              fontSize: isTablet ? 16 : 14
                            }}>
                              • {i18n.t('option')} {j + 1} ({i18n.t('audio')})
                            </Text>
                            <Ionicons name="musical-notes" size={16} color={q.answerIndex === j ? "green" : "#666"} style={{ marginLeft: 4 }} />
                          </View>
                        ) : (
                          <Text style={{
                            color: q.answerIndex === j ? "green" : "#111",
                            fontSize: isTablet ? 16 : 14
                          }}>
                            • {i18n.t('option')} {j + 1}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                ))}

                <View style={{ flexDirection: "row", marginTop: 24, gap: 12 }}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { padding: isTablet ? 16 : 12 }]}
                    onPress={() => {
                      startEditQuiz(detail.item.id);
                      setDetail(null);
                      setSelectedSection("quizzes");
                    }}
                  >
                    <Text style={[styles.smallBtnText, { fontSize: isTablet ? 16 : 14 }]}>
                      {i18n.t('edit')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", padding: isTablet ? 16 : 12 }]}
                    onPress={() => {
                      deleteQuiz(detail.item.id);
                      setDetail(null);
                    }}
                  >
                    <Text style={[styles.smallBtnText, { color: "red", fontSize: isTablet ? 16 : 14 }]}>
                      {i18n.t('delete')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Main Content - only show when detail is not active */}
      {!detail && (
        // Main content
        <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
          {/* Dashboard */}
          {selectedSection === "dashboard" && (
            <>
              {/* Active Students Count */}
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <View style={{ 
                    width: 56, 
                    height: 56, 
                    borderRadius: 28, 
                    backgroundColor: "#EFF6FF", 
                    justifyContent: "center", 
                    alignItems: "center",
                    marginRight: 16,
                  }}>
                    <Ionicons name="people" size={28} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statValue}>{Object.keys(studentProgress).length}</Text>
                    <Text style={styles.statLabel}>{i18n.t('activeStudents')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.gridRow}>
                <AnimatedPressable onPress={() => setSelectedSection("videos")} style={{ flex: 1, minWidth: 0 }}>
                  <View style={[styles.dashboardCard, { padding: isTablet ? 24 : isSmallScreen ? 12 : 16 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ 
                        width: isSmallScreen ? 36 : 40, 
                        height: isSmallScreen ? 36 : 40, 
                        borderRadius: isSmallScreen ? 18 : 20, 
                        backgroundColor: "#FEF2F2", 
                        justifyContent: "center", 
                        alignItems: "center",
                        marginRight: 12,
                      }}>
                        <Ionicons name="videocam" size={isSmallScreen ? 18 : 20} color="#DC2626" />
                      </View>
                      <Text style={[styles.dashboardCardTitle, { fontSize: isTablet ? 19 : isSmallScreen ? 15 : 17 }]}>
                        {i18n.t('videos')}
                      </Text>
                    </View>
                    <Text style={[styles.dashboardCardSubtitle, { fontSize: isTablet ? 14 : isSmallScreen ? 11 : 13 }]}>
                      {videos.length} {i18n.t('available')}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>

              <View style={styles.gridRow}>
                <AnimatedPressable onPress={() => setSelectedSection("quizzes")} style={{ flex: 1, minWidth: 0 }}>
                  <View style={[styles.dashboardCard, { padding: isTablet ? 24 : isSmallScreen ? 12 : 16 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ 
                        width: isSmallScreen ? 36 : 40, 
                        height: isSmallScreen ? 36 : 40, 
                        borderRadius: isSmallScreen ? 18 : 20, 
                        backgroundColor: "#F0FDF4", 
                        justifyContent: "center", 
                        alignItems: "center",
                        marginRight: 12,
                      }}>
                        <Ionicons name="help-circle" size={isSmallScreen ? 18 : 20} color="#16A34A" />
                      </View>
                      <Text style={[styles.dashboardCardTitle, { fontSize: isTablet ? 19 : isSmallScreen ? 15 : 17 }]}>
                        {i18n.t('quizzes')}
                      </Text>
                    </View>
                    <Text style={[styles.dashboardCardSubtitle, { fontSize: isTablet ? 14 : isSmallScreen ? 11 : 13 }]}>
                      {Object.keys(quizzes).length} {i18n.t('available')}
                    </Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable onPress={() => { setSelectedSection("progress"); refreshProgress(); }} style={{ flex: 1, minWidth: 0 }}>
                  <View style={[styles.dashboardCard, { padding: isTablet ? 24 : isSmallScreen ? 12 : 16 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                      <View style={{ 
                        width: isSmallScreen ? 36 : 40, 
                        height: isSmallScreen ? 36 : 40, 
                        borderRadius: isSmallScreen ? 18 : 20, 
                        backgroundColor: "#FEF3C7", 
                        justifyContent: "center", 
                        alignItems: "center",
                        marginRight: 12,
                      }}>
                        <Ionicons name="bar-chart" size={isSmallScreen ? 18 : 20} color="#D97706" />
                      </View>
                      <Text style={[styles.dashboardCardTitle, { fontSize: isTablet ? 19 : isSmallScreen ? 15 : 17 }]}>
                        {i18n.t('progress')}
                      </Text>
                    </View>
                    <Text style={[styles.dashboardCardSubtitle, { fontSize: isTablet ? 14 : isSmallScreen ? 11 : 13 }]}>
                      {i18n.t('viewAnalytics')}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </>
          )}

          {/* VIDEOS MANAGEMENT */}
          {selectedSection === "videos" && (
            <View>
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>

              <View style={styles.card}>
                <Text style={styles.title}>{i18n.t('addEditVideo')}</Text>

                {/* Title - Required */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>Title *</Text>
                <TextInput style={styles.input} placeholder="Enter lesson title" value={videoTitle} onChangeText={setVideoTitle} />

                {/* Description - Required */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Description *</Text>
                <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} placeholder="Enter lesson description" value={videoDescription} onChangeText={setVideoDescription} multiline numberOfLines={4} />

                {/* Video URL - Optional */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Video URL (Optional)</Text>
                <TextInput style={styles.input} placeholder="Enter video URL or pick video file" value={videoUrl} onChangeText={setVideoUrl} />
                <TouchableOpacity style={styles.fileBtn} onPress={pickVideo}>
                  <Ionicons name="videocam-outline" size={20} color={videoUrl ? "#4c1d95" : "#333"} />
                  <Text style={{ marginLeft: 8, color: videoUrl ? "#4c1d95" : "#333", fontWeight: videoUrl ? "700" : "400" }}>
                    {videoUrl ? "Video Selected" : "Pick Video File"}
                  </Text>
                </TouchableOpacity>

                {/* Thumbnail URL - Optional */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Thumbnail URL (Optional)</Text>
                <TextInput style={styles.input} placeholder="Enter thumbnail URL or pick image" value={thumbnailUrl} onChangeText={setThumbnailUrl} />
                <TouchableOpacity style={styles.fileBtn} onPress={pickThumbnail}>
                  <Ionicons name="image-outline" size={20} color={thumbnailUrl ? "#4c1d95" : "#333"} />
                  <Text style={{ marginLeft: 8, color: thumbnailUrl ? "#4c1d95" : "#333", fontWeight: thumbnailUrl ? "700" : "400" }}>
                    {thumbnailUrl ? "Thumbnail Selected" : "Pick Thumbnail Image"}
                  </Text>
                </TouchableOpacity>
                {thumbnailUrl ? (
                  <Image source={{ uri: thumbnailUrl }} style={{ width: "100%", height: 150, marginTop: 8, borderRadius: 8, resizeMode: "cover" }} />
                ) : null}

                {/* Duration Seconds - Optional */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Duration (seconds) (Optional)</Text>
                <TextInput style={styles.input} placeholder="Enter duration in seconds" value={durationSeconds} onChangeText={setDurationSeconds} keyboardType="numeric" />

                {/* Difficulty - Required */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Difficulty *</Text>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }]}
                  onPress={() => setShowDifficultyModal(true)}
                >
                  <Text style={{ color: videoDifficulty ? "#000" : "#999", textTransform: "capitalize" }}>
                    {videoDifficulty || "Select difficulty"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>

                {/* Collection - Optional */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Collection (Optional)</Text>
                <TouchableOpacity
                  style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }]}
                  onPress={() => {
                    Alert.alert(
                      "Select Collection",
                      "Choose a collection or create a new one",
                      [
                        { text: "None", onPress: () => setVideoCollection("") },
                        ...Object.values(collections).map((c) => ({
                          text: c.title,
                          onPress: () => setVideoCollection(c.id),
                        })),
                        { text: "Create New Collection", onPress: () => setShowCollectionModal(true), style: "default" },
                        { text: "Cancel", style: "cancel" },
                      ],
                      { cancelable: true }
                    );
                  }}
                >
                  <Text style={{ color: videoCollection ? "#000" : "#999", fontSize: 15 }}>
                    {videoCollection ? collections[videoCollection]?.title || "Select collection" : "Select collection (optional)"}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>

                {/* Create Collection Section */}
                <View style={{ marginTop: 16, padding: 16, backgroundColor: "#F8FAFC", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12, color: "#0F172A" }}>Create Collection</Text>
                  
                  <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>Title *</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter collection title" 
                    value={collectionTitle} 
                    onChangeText={setCollectionTitle} 
                  />
                  
                  <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Description (Optional)</Text>
                  <TextInput 
                    style={[styles.input, { minHeight: 80, textAlignVertical: "top" }]} 
                    placeholder="Enter collection description" 
                    value={collectionDescription} 
                    onChangeText={setCollectionDescription}
                    multiline
                    numberOfLines={3}
                  />
                  
                  <TouchableOpacity style={[styles.btn, { marginTop: 8, backgroundColor: "#2563EB" }]} onPress={addCollection}>
                    <Text style={styles.btnText}>Create Collection</Text>
                  </TouchableOpacity>
                </View>

                {/* Tags - Optional */}
                <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8, marginTop: 4 }}>Tags (Optional)</Text>
                <TextInput style={styles.input} placeholder="Enter tags separated by commas (e.g., alphabet, phonics)" value={videoTags} onChangeText={setVideoTags} />

                {/* Is Published - Required */}
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 8 }}>
                  <TouchableOpacity
                    style={{ flexDirection: "row", alignItems: "center" }}
                    onPress={() => setVideoIsPublished(!videoIsPublished)}
                  >
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: videoIsPublished ? "#4c1d95" : "#ccc",
                      backgroundColor: videoIsPublished ? "#4c1d95" : "#fff",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 8,
                    }}>
                      {videoIsPublished && <Ionicons name="checkmark" size={16} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "600" }}>Published (visible to kids) *</Text>
                  </TouchableOpacity>
                </View>

                {/* Difficulty Modal */}
                <Modal
                  visible={showDifficultyModal}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setShowDifficultyModal(false)}
                >
                  <TouchableOpacity
                    style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" }}
                    activeOpacity={1}
                    onPress={() => setShowDifficultyModal(false)}
                  >
                    <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, width: "80%", maxWidth: 300 }}>
                      {["easy", "medium", "hard"].map((level) => (
                        <TouchableOpacity
                          key={level}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: "#E2E8F0",
                            backgroundColor: videoDifficulty === level ? "#F0FDF4" : "#FFFFFF",
                          }}
                          onPress={() => {
                            setVideoDifficulty(level);
                            setShowDifficultyModal(false);
                          }}
                        >
                          <Text style={{ fontSize: 16, color: videoDifficulty === level ? "#10B981" : "#0F172A", textTransform: "capitalize", fontWeight: videoDifficulty === level ? "600" : "400" }}>
                            {level}
                          </Text>
                          {videoDifficulty === level && (
                            <Ionicons name="checkmark" size={20} color="#10B981" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>

                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  {editingVideoId ? (
                    <>
                      <TouchableOpacity style={styles.btn} onPress={saveEditVideo}><Text style={styles.btnText}>{i18n.t('save')}</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: "#ddd" }]} onPress={() => {
                        setEditingVideoId(null);
                        setVideoTitle("");
                        setVideoDescription("");
                        setVideoUrl("");
                        setThumbnailUrl("");
                        setDurationSeconds("");
                        setVideoDifficulty("easy");
                        setVideoCollection("");
                        setVideoTags("");
                        setVideoIsPublished(true);
                      }}>
                        <Text>{i18n.t('cancel')}</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.btn} onPress={addVideo}><Text style={styles.btnText}>{i18n.t('addVideo')}</Text></TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={{ fontWeight: "900", marginTop: 8 }}>{i18n.t('allVideos')}</Text>
              {videos.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>{i18n.t('noVideosYet')}</Text></View>
              ) : (
                videos.map((v) => (
                  <View key={v.id} style={{ marginTop: 12 }}>
                    {renderCard(v, "videos")}
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                      <TouchableOpacity onPress={() => startEditVideo(v.id)} style={{ padding: 8 }}>
                        <Ionicons name="pencil" size={20} color="#007AFF" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setDetail({ type: "videos", item: v })} style={{ padding: 8 }}>
                        <Ionicons name="eye" size={20} color="#333" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteVideo(v.id)} style={{ padding: 8 }}>
                        <Ionicons name="trash" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* QUIZZES MANAGEMENT */}
          {selectedSection === "quizzes" && (
            <View>
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>

              <View style={styles.card}>
                <Text style={styles.title}>{editingQuizId ? i18n.t('editQuiz') : i18n.t('createQuiz')}</Text>

                <TextInput style={styles.input} placeholder={i18n.t('quizTitle')} value={editingQuizId ? editingQuizTitle : quizTitle} onChangeText={(t) => (editingQuizId ? setEditingQuizTitle(t) : setQuizTitle(t))} />

                {/* Builder area */}
                <Text style={{ fontWeight: "800", marginTop: 8 }}>{editingQuizId ? i18n.t('questions') + " (editing)" : i18n.t('addQuestion')}</Text>

                <TextInput style={styles.input} placeholder={i18n.t('questionText')} value={qText} onChangeText={setQText} />
                
                {/* Question Type Selection */}
                <Text style={{ fontWeight: "700", marginTop: 8, marginBottom: 4 }}>Question Type:</Text>
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity
                    onPress={() => { setQType("text"); setQImageUri(null); setQAudioUri(null); }}
                    style={[styles.typeBtn, qType === "text" && styles.typeBtnSelected]}
                  >
                    <Text style={[styles.typeBtnText, qType === "text" && styles.typeBtnTextSelected]}>Text</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setQType("image"); setQAudioUri(null); }}
                    style={[styles.typeBtn, qType === "image" && styles.typeBtnSelected]}
                  >
                    <Text style={[styles.typeBtnText, qType === "image" && styles.typeBtnTextSelected]}>Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { setQType("audio"); setQImageUri(null); }}
                    style={[styles.typeBtn, qType === "audio" && styles.typeBtnSelected]}
                  >
                    <Text style={[styles.typeBtnText, qType === "audio" && styles.typeBtnTextSelected]}>Audio</Text>
                  </TouchableOpacity>
                </View>

                {/* Question Media */}
                {qType === "image" && (
                  <TouchableOpacity style={styles.fileBtn} onPress={pickQuestionImage}>
                    <Ionicons name="image-outline" size={20} color={qImageUri ? "#4c1d95" : "#333"} />
                    <Text style={{ marginLeft: 8, color: qImageUri ? "#4c1d95" : "#333", fontWeight: qImageUri ? "700" : "400" }}>
                      {qImageUri ? "Image Selected" : "Pick Question Image"}
                    </Text>
                  </TouchableOpacity>
                )}
                {qType === "image" && qImageUri && (
                  <Image source={{ uri: qImageUri }} style={{ width: "100%", height: 150, marginTop: 8, borderRadius: 8, resizeMode: "contain" }} />
                )}

                {qType === "audio" && (
                  <TouchableOpacity style={styles.fileBtn} onPress={pickQuestionAudio}>
                    <Ionicons name="musical-notes-outline" size={20} color={qAudioUri ? "#4c1d95" : "#333"} />
                    <Text style={{ marginLeft: 8, color: qAudioUri ? "#4c1d95" : "#333", fontWeight: qAudioUri ? "700" : "400" }}>
                      {qAudioUri ? "Audio Selected" : "Pick Question Audio"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Options */}
                <Text style={{ fontWeight: "700", marginTop: 12, marginBottom: 4 }}>{i18n.t('options')}:</Text>
                {qOptions.map((opt, idx) => (
                  <View key={idx} style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: "row", gap: 4, marginBottom: 4 }}>
                      <TouchableOpacity
                        onPress={() => {
                          const newTypes = [...qOptionTypes];
                          newTypes[idx] = "text";
                          setQOptionTypes(newTypes);
                          const newImages = [...qOptionImages];
                          newImages[idx] = null;
                          setQOptionImages(newImages);
                          const newAudios = [...qOptionAudios];
                          newAudios[idx] = null;
                          setQOptionAudios(newAudios);
                        }}
                        style={[styles.optionTypeBtn, qOptionTypes[idx] === "text" && styles.optionTypeBtnSelected]}
                      >
                        <Text style={[styles.optionTypeBtnText, qOptionTypes[idx] === "text" && styles.optionTypeBtnTextSelected]}>{i18n.t('text')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const newTypes = [...qOptionTypes];
                          newTypes[idx] = "image";
                          setQOptionTypes(newTypes);
                          const arr = [...qOptions];
                          arr[idx] = "";
                          setQOptions(arr);
                          const newAudios = [...qOptionAudios];
                          newAudios[idx] = null;
                          setQOptionAudios(newAudios);
                        }}
                        style={[styles.optionTypeBtn, qOptionTypes[idx] === "image" && styles.optionTypeBtnSelected]}
                      >
                        <Text style={[styles.optionTypeBtnText, qOptionTypes[idx] === "image" && styles.optionTypeBtnTextSelected]}>{i18n.t('image')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          const newTypes = [...qOptionTypes];
                          newTypes[idx] = "audio";
                          setQOptionTypes(newTypes);
                          const arr = [...qOptions];
                          arr[idx] = "";
                          setQOptions(arr);
                          const newImages = [...qOptionImages];
                          newImages[idx] = null;
                          setQOptionImages(newImages);
                        }}
                        style={[styles.optionTypeBtn, qOptionTypes[idx] === "audio" && styles.optionTypeBtnSelected]}
                      >
                        <Text style={[styles.optionTypeBtnText, qOptionTypes[idx] === "audio" && styles.optionTypeBtnTextSelected]}>Audio</Text>
                      </TouchableOpacity>
                    </View>
                    {qOptionTypes[idx] === "text" ? (
                      <TextInput 
                        style={styles.input} 
                        placeholder={`${i18n.t('option')} ${idx + 1}`} 
                        value={opt} 
                        onChangeText={(t) => { const arr = [...qOptions]; arr[idx] = t; setQOptions(arr); }} 
                      />
                    ) : qOptionTypes[idx] === "image" ? (
                      <View>
                        <TouchableOpacity style={styles.fileBtn} onPress={() => pickOptionImage(idx)}>
                          <Ionicons name="image-outline" size={20} color={qOptionImages[idx] ? "#4c1d95" : "#333"} />
                          <Text style={{ marginLeft: 8, color: qOptionImages[idx] ? "#4c1d95" : "#333", fontWeight: qOptionImages[idx] ? "700" : "400" }}>
                            {qOptionImages[idx] ? i18n.t('imageSelected') : `${i18n.t('pickImageForOption')} ${idx + 1}`}
                          </Text>
                        </TouchableOpacity>
                        {qOptionImages[idx] && (
                          <Image source={{ uri: qOptionImages[idx] }} style={{ width: "100%", height: 100, marginTop: 8, borderRadius: 8, resizeMode: "contain" }} />
                        )}
                      </View>
                    ) : (
                      <View>
                        <TouchableOpacity style={styles.fileBtn} onPress={() => pickOptionAudio(idx)}>
                          <Ionicons name="musical-notes-outline" size={20} color={qOptionAudios[idx] ? "#4c1d95" : "#333"} />
                          <Text style={{ marginLeft: 8, color: qOptionAudios[idx] ? "#4c1d95" : "#333", fontWeight: qOptionAudios[idx] ? "700" : "400" }}>
                            {qOptionAudios[idx] ? i18n.t('audioSelected') : `${i18n.t('pickAudioForOption')} ${idx + 1}`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}

                <TextInput style={styles.input} placeholder={i18n.t('correctOptionIndex')} keyboardType="number-pad" value={qAnswerIndex !== null ? String(qAnswerIndex) : ""} onChangeText={(t) => setQAnswerIndex(t === "" ? null : Number(t))} />

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={styles.btn} onPress={addQuestionToBuilder}><Text style={styles.btnText}>{i18n.t('addQuestionBtn')}</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: "#ddd" }]} onPress={() => { 
                    setQText(""); 
                    setQType("text");
                    setQImageUri(null);
                    setQAudioUri(null);
                    setQOptions(["", "", "", ""]); 
                    setQOptionTypes(["text", "text", "text", "text"]);
                    setQOptionImages([null, null, null, null]);
                    setQOptionAudios([null, null, null, null]);
                    setQAnswerIndex(null); 
                  }}>
                    <Text>{i18n.t('clear')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Preview added questions */}
                {quizQuestions.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontWeight: "800" }}>{i18n.t('previewQuestions')}</Text>
                    {quizQuestions.map((qq, i) => (
                      <View key={qq.id} style={{ marginTop: 8, padding: 12, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
                        <Text style={{ fontWeight: "700" }}>{i + 1}. {qq.question} {qq.type && `[${qq.type}]`}</Text>
                        {qq.type === "image" && qq.imageUri && (
                          <Image source={{ uri: qq.imageUri }} style={{ width: "100%", height: 100, marginTop: 8, borderRadius: 8, resizeMode: "contain" }} />
                        )}
                        {qq.type === "audio" && qq.audioUri && (
                          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="musical-notes" size={20} color="#4c1d95" />
                            <Text style={{ marginLeft: 8, color: "#666" }}>Audio question</Text>
                          </View>
                        )}
                        {qq.options.map((o, j) => (
                          <View key={j} style={{ marginLeft: 12, marginTop: 4 }}>
                            {typeof o === "string" ? (
                              <Text style={{ color: qq.answerIndex === j ? "green" : "#111" }}>• {o}</Text>
                            ) : o.type === "image" && o.imageUri ? (
                              <View>
                                <Text style={{ color: qq.answerIndex === j ? "green" : "#111", fontWeight: qq.answerIndex === j ? "700" : "400" }}>
                                  • Option {j + 1} (Image):
                                </Text>
                                <Image source={{ uri: o.imageUri }} style={{ width: "80%", height: 80, marginTop: 4, borderRadius: 8, resizeMode: "contain" }} />
                              </View>
                            ) : o.type === "audio" && o.audioUri ? (
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Text style={{ color: qq.answerIndex === j ? "green" : "#111", fontWeight: qq.answerIndex === j ? "700" : "400" }}>
                                  • {i18n.t('option')} {j + 1} ({i18n.t('audio')})
                                </Text>
                                <Ionicons name="musical-notes" size={16} color={qq.answerIndex === j ? "green" : "#666"} style={{ marginLeft: 4 }} />
                              </View>
                            ) : (
                              <Text style={{ color: qq.answerIndex === j ? "green" : "#111" }}>• Option {j + 1}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  {!editingQuizId ? (
                    <TouchableOpacity style={styles.btn} onPress={saveQuiz}><Text style={styles.btnText}>{i18n.t('saveQuiz')}</Text></TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.btn} onPress={saveEditQuiz}><Text style={styles.btnText}>{i18n.t('saveChanges')}</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: "#ddd" }]} onPress={() => { setEditingQuizId(null); setEditingQuizTitle(""); setEditingQuizQuestions([]); }}>
                        <Text>{i18n.t('cancel')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>

              <Text style={{ fontWeight: "900", marginTop: 8 }}>All Quizzes</Text>
              {Object.keys(quizzes).length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>No quizzes yet.</Text></View>
              ) : (
                Object.values(quizzes).map((q) => (
                  <View key={q.id} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{q.title}</Text>
                      <Text style={{ color: "#666", marginTop: 4 }}>{(q.questions || []).length} questions</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity onPress={() => startEditQuiz(q.id)}><Ionicons name="pencil" size={20} color="#007AFF" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => setDetail({ type: "quizzes", item: q })}><Ionicons name="eye" size={20} color="#333" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteQuiz(q.id)}><Ionicons name="trash" size={20} color="red" /></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* PROGRESS */}
          {selectedSection === "progress" && (
            <View>
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>

              <Text style={{ fontWeight: "900", marginBottom: 8, fontSize: 20 }}>📊 All Students Progress</Text>
              
              {/* Overall Statistics */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{i18n.t('overallStatistics')}</Text>
                <View style={styles.statRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{videos.length}</Text>
                    <Text style={styles.statLabel}>{i18n.t('videos')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{Object.keys(quizzes).length}</Text>
                    <Text style={styles.statLabel}>Quizzes</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{Object.keys(studentProgress).length}</Text>
                    <Text style={styles.statLabel}>Students</Text>
                  </View>
                </View>
              </View>

              {/* Progress Graph */}
              {Object.keys(studentProgress).length > 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📈 {i18n.t('overallCompletionRate')}</Text>
                  {Object.entries(studentProgress).map(([studentId, data]) => {
                    const videosProgress = videos.length > 0 ? (data.videosCompleted?.length || 0) / videos.length * 100 : 0;
                    const quizzesProgress = Object.keys(quizzes).length > 0 ? (data.quizResults?.length || 0) / Object.keys(quizzes).length * 100 : 0;
                    const overallProgress = (videosProgress + quizzesProgress) / 2;
                    
                    return (
                      <View key={studentId} style={{ marginTop: 16 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                          <Text style={{ fontWeight: "700", fontSize: 14 }}>{data.name || studentId}</Text>
                          <Text style={{ fontWeight: "700", color: "#4c1d95" }}>{Math.round(overallProgress)}%</Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                          <View style={[styles.progressBarFill, { width: `${overallProgress}%` }]} />
                        </View>
                        <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.progressLabel}>Videos: {Math.round(videosProgress)}%</Text>
                            <View style={styles.miniProgressBar}>
                              <View style={[styles.miniProgressFill, { width: `${videosProgress}%`, backgroundColor: "#10b981" }]} />
                            </View>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.progressLabel}>Quizzes: {Math.round(quizzesProgress)}%</Text>
                            <View style={styles.miniProgressBar}>
                              <View style={[styles.miniProgressFill, { width: `${quizzesProgress}%`, backgroundColor: "#f59e0b" }]} />
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Quiz Results by Quiz */}
              <Text style={{ fontWeight: "900", marginTop: 16, marginBottom: 8 }}>Quiz Results by Quiz</Text>
              {Object.entries(quizzes).length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>No quizzes created yet.</Text></View>
              ) : (
                Object.entries(quizzes).map(([id, quiz]) => (
                  <View key={id} style={[styles.card, { paddingVertical: 12 }]}>
                    <Text style={styles.cardTitle}>{quiz.title}</Text>
                    {quiz.results?.length > 0 ? (
                      <View style={{ marginTop: 8 }}>
                        {quiz.results.map((r, idx) => (
                          <View key={idx} style={{ marginTop: 6, padding: 8, backgroundColor: "#f5f5f5", borderRadius: 6 }}>
                            <Text style={{ fontWeight: "700" }}>{i18n.t('student')}: {r.studentName || i18n.t('unknown')}</Text>
                            <Text style={{ marginTop: 4 }}>{i18n.t('date')}: {new Date(r.date).toLocaleDateString()}</Text>
                            <Text style={{ marginTop: 4, color: r.score >= 70 ? "green" : r.score >= 50 ? "orange" : "red", fontWeight: "700" }}>
                              {i18n.t('score')}: {r.score}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ marginTop: 6, fontStyle: "italic", color: "#999" }}>{i18n.t('notAttemptedYet')}</Text>
                    )}
                  </View>
                ))
              )}

              {/* Active Students with Video Watching Details */}
              <Text style={{ fontWeight: "900", marginTop: 16, marginBottom: 8 }}>{i18n.t('activeStudentsVideoWatchingDetails')}</Text>
              {Object.keys(studentProgress).length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No student progress data available yet.</Text>
                </View>
              ) : (
                Object.entries(studentProgress).map(([studentId, data]) => {
                  const videoWatchingDetails = data.videoWatchingDetails || [];
                  
                  return (
                    <View key={studentId} style={[styles.card, { paddingVertical: 12, marginBottom: 16 }]}>
                      <Text style={[styles.cardTitle, { fontSize: 18, marginBottom: 12 }]}>👤 {data.name || studentId}</Text>
                      
                      {videoWatchingDetails.length === 0 ? (
                        <Text style={{ color: "#999", fontStyle: "italic", marginTop: 8 }}>
                          {i18n.t('noVideosWatchedYet')}
                        </Text>
                      ) : (
                        <View style={{ marginTop: 8 }}>
                          {videoWatchingDetails.map((videoDetail, idx) => {
                            const video = videos.find(v => v.id === videoDetail.videoId);
                            const videoTitle = video ? video.title : `Video ID: ${videoDetail.videoId}`;
                            const entryTime = videoDetail.entryTime 
                              ? new Date(videoDetail.entryTime).toLocaleString() 
                              : "Unknown";
                            const totalDuration = formatDuration(videoDetail.totalDurationMs || 0);
                            
                            return (
                              <View 
                                key={idx} 
                                style={{ 
                                  marginTop: idx > 0 ? 12 : 0, 
                                  padding: 12, 
                                  backgroundColor: "#f8f9fa", 
                                  borderRadius: 8,
                                  borderLeftWidth: 3,
                                  borderLeftColor: "#4c1d95"
                                }}
                              >
                                <Text style={{ fontWeight: "700", fontSize: 15, color: "#111", marginBottom: 6 }}>
                                  🎬 {videoTitle}
                                </Text>
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 13, color: "#666" }}>
                                    <Text style={{ fontWeight: "600" }}>{i18n.t('entryTime')}: </Text>
                                    {entryTime}
                                  </Text>
                                </View>
                                <View style={{ marginTop: 4 }}>
                                  <Text style={{ fontSize: 13, color: "#666" }}>
                                    <Text style={{ fontWeight: "600" }}>{i18n.t('totalTimeSpent')}: </Text>
                                    {totalDuration}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })
              )}
              
              {/* Student Progress Summary (Original) */}
              <Text style={{ fontWeight: "900", marginTop: 16, marginBottom: 8 }}>Student Progress Summary</Text>
              {Object.keys(studentProgress).length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No student progress data available yet.</Text>
                </View>
              ) : (
                Object.entries(studentProgress).map(([studentId, data]) => (
                  <View key={studentId} style={[styles.card, { paddingVertical: 12 }]}>
                    <Text style={styles.cardTitle}>👤 {data.name || studentId}</Text>
                    <Text style={{ marginTop: 8 }}>Videos Watched: {data.videosCompleted?.length || 0} / {videos.length}</Text>
                    <Text style={{ marginTop: 4 }}>Quizzes Completed: {data.quizResults?.length || 0} / {Object.keys(quizzes).length}</Text>
                    {data.quizResults && data.quizResults.length > 0 && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={{ fontWeight: "700", marginBottom: 6 }}>Quiz Scores:</Text>
                        {data.quizResults.map((qr, idx) => (
                          <Text key={idx} style={{ marginTop: 4, color: qr.score >= 70 ? "green" : qr.score >= 50 ? "orange" : "red" }}>
                            {qr.quizTitle}: {qr.score}%
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          )}

          {/* Dashboard quick navigation at bottom */}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Professional Teacher Dashboard Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" }, // Professional light gray background
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  profileAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    borderWidth: 2, 
    borderColor: "#E2E8F0" 
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  profileSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 8,
    right: "50%",
    marginRight: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#2563EB",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
    letterSpacing: 0.3,
  },
  profileRole: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
  },
  contentScroll: { padding: 16, flexGrow: 1, paddingBottom: 36 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
    gap: 12,
    flexWrap: "nowrap",
  },
  dashboardCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    minHeight: 110,
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  dashboardCardTitle: { fontSize: 17, fontWeight: "600", color: "#0F172A", letterSpacing: 0.2 },
  dashboardCardSubtitle: { marginTop: 8, color: "#64748B", fontSize: 13, fontWeight: "400", letterSpacing: 0.1 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 16, color: "#0F172A", letterSpacing: 0.3 },
  input: { 
    backgroundColor: "#FFFFFF", 
    padding: 14, 
    borderRadius: 10, 
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "400",
  },
  fileBtn: { 
    backgroundColor: "#F1F5F9", 
    padding: 12, 
    borderRadius: 8, 
    marginBottom: 12, 
    alignItems: "center", 
    flexDirection: "row", 
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  btn: { 
    backgroundColor: "#2563EB", // Professional blue
    padding: 16, 
    borderRadius: 10, 
    marginBottom: 14, 
    alignItems: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 15, letterSpacing: 0.4 },
  item: { backgroundColor: "#fff", padding: 14, borderRadius: 10, marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontWeight: "800" },
  emptyBox: { marginTop: 18, padding: 18, alignItems: "center", justifyContent: "center" },
  emptyText: { marginTop: 8, color: "#777", fontSize: 15, fontWeight: "600" },
  lessonTitle: { fontSize: 22, fontWeight: "900" },
  lessonDesc: { marginTop: 10, fontSize: 16, lineHeight: 22, color: "#444" },
  smallBtn: { 
    padding: 12, 
    backgroundColor: "#2563EB", 
    borderRadius: 8,
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  smallBtnText: { color: "#fff", fontWeight: "600", fontSize: 14, letterSpacing: 0.2 },

  // itemCard used in preview/listing
  itemCard: {
    backgroundColor: "#fff",
    padding: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    width: "100%",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "800", fontSize: 15, color: "#111", flexShrink: 1 },
  cardDesc: { marginTop: 8, color: "#666" },
  cardBadge: { backgroundColor: "#f1f4ff", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginLeft: 8 },
  cardBadgeText: { color: "#4c1d95", fontWeight: "700", fontSize: 12 },
  
  // Stats card
  statsCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2563EB", // Professional blue
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12, 
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#4c1d95",
  },
  
  // Progress bars
  progressBarContainer: {
    height: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4c1d95",
    borderRadius: 10,
  },
  progressLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  miniProgressBar: {
    height: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  // Quiz builder styles
  typeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeBtnSelected: {
    backgroundColor: "#4c1d95",
    borderColor: "#4c1d95",
  },
  typeBtnText: {
    color: "#333",
    fontWeight: "600",
  },
  typeBtnTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  optionTypeBtn: {
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#e0e0e0",
    borderWidth: 1,
    borderColor: "transparent",
  },
  optionTypeBtnSelected: {
    backgroundColor: "#4c1d95",
    borderColor: "#4c1d95",
  },
  optionTypeBtnText: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  optionTypeBtnTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },
  // Fullscreen Modal Styles
  fullscreenHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  fullscreenCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
  },
  fullscreenContent: {
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
});
