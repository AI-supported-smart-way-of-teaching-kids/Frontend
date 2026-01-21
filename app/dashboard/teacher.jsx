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
  Platform,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import i18n from "../../i18n";
import { useLanguage } from "../../contexts/LanguageContext";
import { useUser } from "../../contexts/UserContext";
import * as quizApi from "../../src/services/quizApi";
import * as lessonsApi from "../../src/services/lessonsApi";
import * as profilesApi from "../../src/services/profilesApi";
import * as coreApi from "../../src/services/coreApi";
import * as progressApi from "../../src/services/progressApi";
import AudioPlayer from "../../components/AudioPlayer";

import { fixMediaUrl } from "../../src/api";
const { width } = Dimensions.get("window");
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

// ... (keep helper functions like formatDuration, AnimatedPressable if mostly unchanged, or inline them if needed)
const formatDuration = (milliseconds) => {
  if (!milliseconds || milliseconds < 0) return "0 seconds";
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'} `);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'} `);
  if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'} `);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'} `);
  return parts.join(", ");
};
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

const getMimeType = (uri, defaultType = 'application/octet-stream') => {
  if (!uri) return defaultType;
  const filename = uri.split('/').pop().toLowerCase();
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1] : '';

  const map = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'm4v': 'video/x-m4v',
    'avi': 'video/x-msvideo',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
  };

  return map[ext] || (ext ? (uri.includes('video') ? `video/${ext}` : (uri.includes('image') ? `image/${ext}` : (uri.includes('audio') ? `audio/${ext}` : defaultType))) : defaultType);
};

export default function TeacherDashboard() {
  const router = useRouter();
  const { language, changeLanguage } = useLanguage();
  const { user, logout } = useUser();
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [profileCheckComplete, setProfileCheckComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // Data
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState({}); // object keyed by id
  const [collections, setCollections] = useState({}); // object keyed by id

  // Local UI state
  const [selectedSection, setSelectedSection] = useState("dashboard"); // dashboard | videos | quizzes | progress
  const [detail, setDetail] = useState(null); // detail modal for item

  // Quiz Specific UI State
  const [quizViewMode, setQuizViewMode] = useState('list'); // 'list' | 'form'

  // Video Form
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [videoDifficulty, setVideoDifficulty] = useState("easy");
  const [videoTags, setVideoTags] = useState("");
  const [videoIsPublished, setVideoIsPublished] = useState(true);
  const [videoFile, setVideoFile] = useState(null); // Store the file object/asset
  const [videoLesson, setVideoLesson] = useState(null); // Store selected lesson ID
  const [editingVideoId, setEditingVideoId] = useState(null);
  const scrollViewRef = useRef(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [videoCollection, setVideoCollection] = useState("");
  const [showCollectionModal, setShowCollectionModal] = useState(false);

  // Collection form
  const [collectionTitle, setCollectionTitle] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  // Quiz Builder State
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizVideo, setQuizVideo] = useState("");
  const [quizTimeLimit, setQuizTimeLimit] = useState("");
  // Lessons for dropdown (Unified with videos)
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);


  const [showStudentPreview, setShowStudentPreview] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingQuizTitle, setEditingQuizTitle] = useState("");
  const [editingQuizQuestions, setEditingQuizQuestions] = useState([]);
  const [editingQuizVideo, setEditingQuizVideo] = useState("");
  const [editingQuizTimeLimit, setEditingQuizTimeLimit] = useState("");

  // Progress
  const [progress, setProgress] = useState([]);
  const [studentProgress, setStudentProgress] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [progressRecords, setProgressRecords] = useState([]);
  const [loadingProgressRecords, setLoadingProgressRecords] = useState(false);

  // ... (keep existing loadContent, loadProgressData, mapLessons, pickProfilePhoto, useEffects)

  // ---------- Backend content loaders (Lessons / Collections / Quizzes) ----------
  const mapLessons = React.useCallback((lessonArray = []) =>
    lessonArray.map((lesson) => ({
      id: lesson.id?.toString?.() ?? String(lesson.id ?? Math.random()),
      title: lesson.title || lesson.name || i18n.t("untitled"),
      description: lesson.description || "",
      video_url:
        lesson.video_url ||
        lesson.videoUrl ||
        lesson.video?.url ||
        lesson.media_url ||
        null,
      thumbnail:
        lesson.thumbnail ||
        lesson.thumbnail_url ||
        lesson.video?.thumbnail ||
        null,
      collection: lesson.collection || lesson.collection_id || null,
      _raw: lesson,
    })), []);

  const loadContent = React.useCallback(async () => {
    try {
      const [backendCollectionsRaw, backendLessonsRaw, backendQuizzes] = await Promise.all([
        lessonsApi.getCollections().catch(() => null),
        lessonsApi.getLessons().catch(() => null),
        quizApi.getQuizzes().catch(() => ({})),
      ]);

      // Collections
      if (backendCollectionsRaw) {
        const colArray = Array.isArray(backendCollectionsRaw)
          ? backendCollectionsRaw
          : backendCollectionsRaw.results || [];
        const collectionsMap = {};
        colArray.forEach((c) => {
          if (!c || c.id == null) return;
          collectionsMap[c.id] = c;
        });
        setCollections(collectionsMap);
        await AsyncStorage.setItem(STORAGE.COLLECTIONS, JSON.stringify(collectionsMap));
      } else {
        const rawCollections = await AsyncStorage.getItem(STORAGE.COLLECTIONS);
        setCollections(rawCollections ? JSON.parse(rawCollections) : {});
      }

      // Lessons / videos
      if (backendLessonsRaw) {
        const lessonArray = Array.isArray(backendLessonsRaw)
          ? backendLessonsRaw
          : backendLessonsRaw.results || [];
        const mappedVideos = mapLessons(lessonArray);
        setVideos(mappedVideos);
        await AsyncStorage.setItem(STORAGE.VIDEOS, JSON.stringify(mappedVideos));
      } else {
        const rawVideos = await AsyncStorage.getItem(STORAGE.VIDEOS);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
      }

      // Quizzes
      setQuizzes(backendQuizzes || {});
      await AsyncStorage.setItem(STORAGE.QUIZZES, JSON.stringify(backendQuizzes || {}));
    } catch (e) {
      console.warn("Teacher: failed to load content", e);
      try {
        const [rawVideos, rawCollections, rawQuizzes] = await Promise.all([
          AsyncStorage.getItem(STORAGE.VIDEOS),
          AsyncStorage.getItem(STORAGE.COLLECTIONS),
          AsyncStorage.getItem(STORAGE.QUIZZES),
        ]);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
        setCollections(rawCollections ? JSON.parse(rawCollections) : {});
        setQuizzes(rawQuizzes ? JSON.parse(rawQuizzes) : {});
      } catch (fallbackErr) {
        console.warn("Teacher: fallback load from storage failed", fallbackErr);
      }
    }
  }, [mapLessons, setCollections, setQuizzes, setVideos]);

  const loadProgressData = React.useCallback(async () => {
    try {
      const [rawProgress, rawStudentProgress] = await Promise.all([
        AsyncStorage.getItem(STORAGE.PROGRESS),
        AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),
      ]);
      setProgress(rawProgress ? JSON.parse(rawProgress) : []);
      setStudentProgress(rawStudentProgress ? JSON.parse(rawStudentProgress) : {});
    } catch (e) {
      console.warn("Teacher: failed to load progress data", e);
    }
  }, [setProgress, setStudentProgress]);

  // Pick profile photo directly from dashboard
  const pickProfilePhoto = async () => {
    try {
      if (!user?.id) {
        Alert.alert(i18n.t('error'), "User not found. Please log in again.");
        return;
      }

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

        // Load existing teacher profiles
        const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
        let profiles = storedProfiles ? JSON.parse(storedProfiles) : {};

        // Get current teacher profile or create empty one
        let teacherProfile = profiles[user.id] || {
          userId: user.id,
          email: user.email,
          name: user.name,
          bio: "",
          uploaded_count: 0,
          created_at: new Date().toISOString(),
        };

        // Update photo in teacher profile
        teacherProfile.photo = uri;

        // Save updated profile back to profiles object
        profiles[user.id] = teacherProfile;
        await AsyncStorage.setItem(STORAGE.TEACHER_PROFILES, JSON.stringify(profiles));

        // Update state
        setProfile({ photo: uri });
        setTeacherProfile(teacherProfile);
      }
    } catch (e) {
      console.log(e);
      Alert.alert(i18n.t('error'), "Failed to update profile photo. Please try again.");
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
        // Try to load teacher profile from backend first
        const backendProfile = await profilesApi.getTeacher(user.id);
        if (backendProfile) {
          setTeacherProfile(backendProfile);
          if (backendProfile.photo && backendProfile.photo.trim() !== "") {
            setProfile({ photo: backendProfile.photo });
          } else {
            setProfile({ photo: null });
          }
          // Save to local storage for offline access
          const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
          const profiles = storedProfiles ? JSON.parse(storedProfiles) : {};
          profiles[user.id] = backendProfile;
          await AsyncStorage.setItem(STORAGE.TEACHER_PROFILES, JSON.stringify(profiles));
          setProfileCheckComplete(true);
          return;
        }

        // If not from backend, check local
        const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
        if (storedProfiles) {
          const profiles = JSON.parse(storedProfiles);
          if (profiles[user.id]) {
            setProfileCheckComplete(true);
            return;
          }
        }

        // If no profile found, redirect
        setProfileCheckComplete(true);
        setTimeout(() => {
          router.replace("/teacher-profile-setup");
        }, 500);

      } catch (e) {
        console.warn("Error checking teacher profile:", e);
        setProfileCheckComplete(true);
      }
    };

    if (user) {
      checkTeacherProfile();
    }
  }, [user, router]);

  // load backend + stored data
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        await Promise.all([loadContent(), loadProgressData()]);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [loadContent, loadProgressData]);

  // Core API health check (best-effort)
  useEffect(() => {
    coreApi.getHealth().catch((err) => console.warn("Core health check failed:", err));
  }, []);

  // Load progress records from backend (all children's lesson progress)
  useEffect(() => {
    const loadProgressRecords = async () => {
      try {
        setLoadingProgressRecords(true);
        const data = await progressApi.getProgress();
        // Expecting fields:
        // id, child, child_nickname, lesson, lesson_title, lesson_slug,
        // status, points_earned, last_accessed, completion_date
        const mapped = Array.isArray(data)
          ? data.map((p) => ({
            id: p.id,
            child: p.child,
            child_nickname: p.child_nickname,
            lesson: p.lesson,
            lesson_title: p.lesson_title,
            lesson_slug: p.lesson_slug,
            status: p.status,
            points_earned: p.points_earned,
            last_accessed: p.last_accessed,
            completion_date: p.completion_date,
          }))
          : [];
        setProgressRecords(mapped);
      } catch (e) {
        console.warn("Failed to load progress records from backend:", e);
        setProgressRecords([]);
      } finally {
        setLoadingProgressRecords(false);
      }
    };

    loadProgressRecords();
  }, []);
  useFocusEffect(
    React.useCallback(() => {
      const loadProfile = async () => {
        try {
          if (!user?.id) {
            setProfile(null);
            return;
          }

          // Try refreshing teacher profile from backend first
          try {
            const remoteTeacher = await profilesApi.getTeacher(user.id);
            if (remoteTeacher) {
              setTeacherProfile(remoteTeacher);
              setProfileCheckComplete(true);
              if (remoteTeacher.photo && remoteTeacher.photo.trim() !== "") {
                setProfile({ photo: remoteTeacher.photo });
              } else {
                setProfile({ photo: null });
              }
              // Persist latest teacher profile
              const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
              const profiles = storedProfiles ? JSON.parse(storedProfiles) : {};
              profiles[user.id] = remoteTeacher;
              await AsyncStorage.setItem(STORAGE.TEACHER_PROFILES, JSON.stringify(profiles));
              return; // Profile found and loaded
            }
          } catch (remoteErr) {
            console.warn("Failed to refresh teacher profile from backend:", remoteErr);
          }

          // Load teacher profile from TEACHER_PROFILES storage
          const storedProfiles = await AsyncStorage.getItem(STORAGE.TEACHER_PROFILES);
          if (storedProfiles) {
            const profiles = JSON.parse(storedProfiles);
            const teacherProfile = profiles[user.id];

            if (teacherProfile) {
              setTeacherProfile(teacherProfile);
              setProfileCheckComplete(true);
              // Extract photo from teacher profile
              if (teacherProfile.photo && teacherProfile.photo.trim() !== "") {
                setProfile({ photo: teacherProfile.photo });
              } else {
                setProfile({ photo: null });
              }
            } else {
              setProfile(null);
              setTeacherProfile(null);
            }
          } else {
            // No profiles found
            setProfile(null);
            setTeacherProfile(null);
          }
        } catch (e) {
          console.warn("Failed to load profile", e);
          setProfile(null);
        }
      };
      loadProfile();

      // Also reload backend content when screen comes into focus
      loadContent().catch((e) => console.warn("Failed to reload content:", e));
    }, [user?.id, loadContent])
  );

  // Using 'videos' as availableLessons source for quizzes.
  // It is already loaded and synced in loadContent and useFocusEffect.

  // generic save helpers
  const persist = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Persist error", key, e);
    }
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
        setVideoFile(file); // Store the file asset
        Alert.alert(i18n.t('success'), `${i18n.t('video')} "${file.name || i18n.t('file')}" ${i18n.t('selectedSuccessfully')} `);
      } else if (result.type === "success") {
        // Fallback for older API format
        setVideoUrl(result.uri);
        setVideoFile({ uri: result.uri, name: result.name, type: 'video/mp4' }); // Mock asset
        Alert.alert(i18n.t('success'), `${i18n.t('video')} "${result.name || i18n.t('file')}" ${i18n.t('selectedSuccessfully')} `);
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
        mediaTypes: ImagePicker.MediaType.Images,
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
    // Multi-Step Upload Flow 2.0 (Refactored)
    console.log("Teacher Dashboard Version: Multi-Step Upload 2.1 (Robust) - Loaded at " + new Date().toISOString());

    // --- Validation ---
    if (!videoTitle.trim()) {
      Alert.alert(i18n.t('error'), "Video title is required.");
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

    const hasVideoFile = !!videoFile;
    const hasVideoUrl = videoUrl && videoUrl.trim().length > 0;

    if (!hasVideoFile && !hasVideoUrl) {
      Alert.alert(i18n.t('error'), "Please select a video file or provide a video URL.");
      return;
    }

    try {
      setLoading(true);

      // STEP 1: Create Lesson Metadata (JSON)
      // Note: Backend expects 'tags' as array of strings
      const tagsArray = videoTags.trim() ? videoTags.split(',').map(t => t.trim()) : [];

      const lessonData = {
        title: videoTitle.trim(),
        description: videoDescription.trim(),
        collection: videoCollection ? parseInt(videoCollection) : null,
        difficulty: videoDifficulty,
        tags: tagsArray,
        is_published: videoIsPublished,
        video_url: (hasVideoUrl && !hasVideoFile) ? videoUrl : null
      };

      console.log("STEP 1: Creating Lesson with data:", JSON.stringify(lessonData));
      const createdLesson = await lessonsApi.createLesson(lessonData);
      console.log("STEP 1 Response:", createdLesson);

      const newLessonId = createdLesson.id;
      if (!newLessonId) {
        throw new Error("Created lesson returned no ID. Response: " + JSON.stringify(createdLesson));
      }
      console.log("STEP 1 Success: Lesson created with ID:", newLessonId);

      let finalVideoUrl = createdLesson.video_url; // Default to what was sent
      let finalThumbnailUrl = createdLesson.thumbnail; // Default to what was sent (likely null)

      // STEP 2: Upload Video (if file selected)
      if (hasVideoFile) {
        console.log("STEP 2A: Uploading Video File...", videoFile);
        try {
          const fileObj = Platform.OS === 'web'
            ? (videoFile.file || videoFile) // a File or Blob from the picker
            : {
              uri: videoFile.uri,
              name: videoFile.name || `video_${Date.now()}.mp4`,
              type: videoFile.mimeType || videoFile.type || 'video/mp4',
            };

          // Use file.type if available else default to 'video/mp4'
          const fileTypeToSend = fileObj.type || fileObj.mimeType || 'video/mp4';

          const videoUploadRes = await lessonsApi.createMediaUpload({
            lesson: newLessonId,
            file: fileObj,
            file_type: fileTypeToSend,
          });

          console.log("STEP 2A Success: Video uploaded", videoUploadRes);

          if (videoUploadRes.file_url) finalVideoUrl = videoUploadRes.file_url;
          else if (videoUploadRes.file) finalVideoUrl = videoUploadRes.file;

        } catch (vidErr) {
          console.error("Video upload failed:", vidErr);
          Alert.alert("Warning", "Lesson created but video upload failed. Please try editing only the video.");
        }
      }

      // STEP 3: Upload Thumbnail (if file selected)
      if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
        console.log("STEP 2B: Uploading Thumbnail...");
        try {
          let finalThumbnailFile = null;
          if (Platform.OS === 'web') {
            try {
              // If it's a blob URL, we might need to fetch it to get a blob, 
              // OR if it came from file picker it might already be a file.
              // Assuming standard file picker flow provides a File/Blob.
              if (thumbnailUrl.startsWith('blob:')) {
                const res = await fetch(thumbnailUrl);
                finalThumbnailFile = await res.blob();
              } else {
                // Fallback or specific web handling if needed
                console.warn("Thumbnail URL is not http or blob on web?", thumbnailUrl);
              }
            } catch (e) {
              console.warn("Failed to fetch thumbnail blob on web", e);
            }
          } else {
            finalThumbnailFile = {
              uri: thumbnailUrl,
              type: 'image/jpeg',
              name: `thumb_${Date.now()}.jpg`
            };
          }

          if (finalThumbnailFile) {
            const thumbUploadRes = await lessonsApi.createMediaUpload({
              lesson: newLessonId,
              file: finalThumbnailFile,
              file_type: 'image/jpeg'
            });
            console.log("STEP 2B Success: Thumbnail uploaded");

            if (thumbUploadRes.file_url) finalThumbnailUrl = thumbUploadRes.file_url;
            else if (thumbUploadRes.file) finalThumbnailUrl = thumbUploadRes.file;
          }
        } catch (thumbErr) {
          console.warn("Thumbnail upload failed:", thumbErr);
          // Non-blocking error
        }
      }

      // STEP 4: Patch Lesson with URLs
      // Only patch if we actually have new URLs to save
      if (finalVideoUrl !== createdLesson.video_url || finalThumbnailUrl !== createdLesson.thumbnail) {
        console.log("STEP 3: Patching Lesson with URLs...", { finalVideoUrl, finalThumbnailUrl });
        const patchData = {};

        if (finalVideoUrl) patchData.video_url = finalVideoUrl;

        // Use 'thumbnail' or 'thumbnail_url' based on backend support. 
        // Previous code updates used 'thumbnail_url' in some contexts or 'thumbnail'. 
        // We'll send 'thumbnail_url' if available, as that matches the pattern for 'video_url'.
        if (finalThumbnailUrl) {
          patchData.thumbnail_url = finalThumbnailUrl;
          // Also send 'thumbnail' if the backend serializer expects that for URL updates (sometimes string works)
          // patchData.thumbnail = finalThumbnailUrl; 
        }

        // If we have data to patch, send it
        if (Object.keys(patchData).length > 0) {
          try {
            await lessonsApi.patchLesson(newLessonId, patchData);
            console.log("STEP 3 Success: Lesson patched with URLs.");
          } catch (patchErr) {
            console.warn("STEP 3 Failed: Could not patch lesson with URLs", patchErr);
            // Don't fail the whole CLI, just warn
          }
        }
      }

      Alert.alert(i18n.t('success'), i18n.t('lessonCreatedUnknown') || "Lesson created successfully!");

      // Refresh list
      const allLessons = await lessonsApi.getLessons();
      setVideos(mapLessons(allLessons.results || allLessons));

      // Reset Form
      setVideoTitle("");
      setVideoDescription("");
      setVideoUrl("");
      setVideoFile(null);
      setThumbnailUrl("");
      setDurationSeconds("");
      setVideoDifficulty("easy");
      setVideoTags("");
      setVideoIsPublished(true);
      setVideoCollection("");

    } catch (error) {
      console.error("Failed to add video:", error);
      const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      Alert.alert(i18n.t('error'), `Failed to add video: ${msg} `);
    } finally {
      setLoading(false);
    }
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

    try {
      setLoading(true);

      let uploadedVideoUrl = null;
      let uploadedThumbnailUrl = null;

      // STEP 1: Upload new video if selected
      if (videoFile) {
        console.log("Uploading new video file for lesson update...");
        try {
          let finalVideoFile = null;
          if (Platform.OS === 'web') {
            finalVideoFile = videoFile.file || videoFile;
          } else {
            finalVideoFile = {
              uri: videoFile.uri,
              type: videoFile.mimeType || videoFile.type || 'video/mp4',
              name: videoFile.name || `video_${Date.now()}.mp4`
            };
          }

          const uploadResult = await lessonsApi.createMediaUpload({
            lesson: editingVideoId,
            file: finalVideoFile,
            file_type: videoFile.mimeType || videoFile.type || 'video/mp4'
          });
          uploadedVideoUrl = uploadResult.file_url || uploadResult.file;
        } catch (uploadError) {
          console.error("Video upload failed during update:", uploadError);
          throw new Error("Video upload failed during update");
        }
      }

      // STEP 2: Upload new thumbnail if selected
      if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
        console.log("Uploading new thumbnail file for lesson update...");
        try {
          let finalThumbnailFile = null;
          if (Platform.OS === 'web') {
            // Web: try fetch if needed, similar to addVideo logic, or just use what we have
            try {
              const res = await fetch(thumbnailUrl);
              const blob = await res.blob();
              finalThumbnailFile = blob;
            } catch (e) {
              console.warn("Failed to fetch thumbnail blob (update)", e);
            }
          } else {
            finalThumbnailFile = {
              uri: thumbnailUrl,
              type: 'image/jpeg',
              name: `thumb_${Date.now()}.jpg`
            };
          }

          if (finalThumbnailFile) {
            const uploadResult = await lessonsApi.createMediaUpload({
              lesson: editingVideoId,
              file: finalThumbnailFile,
              file_type: 'image/jpeg'
            });
            uploadedThumbnailUrl = uploadResult.file_url || uploadResult.file;
          }
        } catch (thumbError) {
          console.warn("Thumbnail upload failed during update:", thumbError);
        }
      }

      // STEP 3: Patch the lesson with metadata and new URLs
      const patchData = {
        title: videoTitle.trim(),
        description: videoDescription.trim(),
        difficulty: videoDifficulty,
        is_published: videoIsPublished,
      };

      if (durationSeconds) patchData.duration_seconds = parseInt(durationSeconds);
      if (videoCollection) patchData.collection = parseInt(videoCollection);

      const tagsArray = videoTags.trim() ? videoTags.trim().split(',').map(t => t.trim()) : [];
      if (tagsArray.length > 0) patchData.tags = tagsArray;

      if (uploadedVideoUrl) patchData.video_url = uploadedVideoUrl;
      else if (videoUrl && videoUrl.startsWith('http')) patchData.video_url = videoUrl;

      if (uploadedThumbnailUrl) patchData.thumbnail_url = uploadedThumbnailUrl;
      else if (thumbnailUrl && thumbnailUrl.startsWith('http')) patchData.thumbnail_url = thumbnailUrl;

      console.log("Patching lesson with update data:", patchData);
      const updatedLesson = await lessonsApi.patchLesson(editingVideoId, patchData);

      // Map to video format and update local state
      const mappedVideo = mapLessons([updatedLesson])[0];
      const updated = videos.map((v) =>
        v.id === editingVideoId ? mappedVideo : v
      );
      setVideos(updated);

      Alert.alert(i18n.t('success'), "Lesson updated successfully!");

      setEditingVideoId(null);
      // Reset form
      setVideoTitle("");
      setVideoDescription("");
      setVideoUrl("");
      setVideoFile(null);
      setThumbnailUrl("");
      setDurationSeconds("");
      setVideoDifficulty("easy");
      setVideoCollection("");
      setVideoTags("");
      setVideoIsPublished(true);
    } catch (error) {
      console.error("Failed to update lesson:", error);
      Alert.alert(i18n.t('error'), `Failed to update lesson: ${error.message || "Please try again."} `);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = (id) => {
    Alert.alert(i18n.t('deleteVideoConfirm'), i18n.t('areYouSure'), [
      { text: i18n.t('cancel') },
      {
        text: i18n.t('delete'),
        style: "destructive",
        onPress: async () => {
          try {
            // Delete lesson via backend API
            await lessonsApi.deleteLesson(id);

            // Update local state
            const updated = videos.filter((v) => v.id !== id);
            setVideos(updated);

            Alert.alert(i18n.t('success'), "Lesson deleted successfully!");
          } catch (error) {
            console.warn("Failed to delete lesson:", error);
            Alert.alert(i18n.t('error'), "Failed to delete lesson. Please try again.");

            // Fallback: delete from AsyncStorage
            const updated = videos.filter((v) => v.id !== id);
            setVideos(updated);
            await persist(STORAGE.VIDEOS, updated);
          }
        },
      },
    ]);
  };

  // ---------- QUIZZES ----------

  // Helper to update specific question field
  const updateQuestion = (index, field, value) => {
    const isEditing = !!editingQuizId;
    const questions = isEditing ? [...editingQuizQuestions] : [...quizQuestions];
    if (!questions[index]) return;
    questions[index] = { ...questions[index], [field]: value };
    if (isEditing) setEditingQuizQuestions(questions);
    else setQuizQuestions(questions);
  };

  // Helper to update specific option
  const updateOption = (qIndex, oIndex, value) => {
    const isEditing = !!editingQuizId;
    const questions = isEditing ? [...editingQuizQuestions] : [...quizQuestions];
    if (!questions[qIndex]) return;

    // Ensure options array exists and has length 3
    const currentOpts = questions[qIndex].options || ["", "", ""];
    const newOptions = [...currentOpts];
    // Fill empty spots if needed
    while (newOptions.length < 3) newOptions.push("");

    newOptions[oIndex] = value;
    questions[qIndex] = { ...questions[qIndex], options: newOptions };

    if (isEditing) setEditingQuizQuestions(questions);
    else setQuizQuestions(questions);
  };

  // Pick image for question
  const pickQuestionImage = async (index) => {
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
        updateQuestion(index, 'imageUri', result.assets[0].uri);
        updateQuestion(index, 'type', 'image');
      }
    } catch (e) {
      console.warn("pickQuestionImage error", e);
    }
  };

  // Pick audio for question
  const pickQuestionAudio = async (index) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        updateQuestion(index, 'audioUri', result.assets[0].uri);
        updateQuestion(index, 'type', 'audio');
        Alert.alert(i18n.t('success'), "Audio selected successfully!");
      }
    } catch (e) {
      console.warn("pickQuestionAudio error", e);
      Alert.alert(i18n.t('error'), i18n.t('failedToPickAudioFile'));
    }
  };

  const handleAddQuestion = () => {
    const newQuestion = {
      question_text: '',
      type: 'text',
      options: ['', '', ''],
      correct_option_index: 0,
      imageUri: null,
      audioUri: null
    };

    if (editingQuizId) {
      setEditingQuizQuestions([...editingQuizQuestions, newQuestion]);
    } else {
      setQuizQuestions([...quizQuestions, newQuestion]);
    }
  };

  const handleRemoveQuestion = (index) => {
    if (editingQuizId) {
      const updated = editingQuizQuestions.filter((_, i) => i !== index);
      setEditingQuizQuestions(updated);
    } else {
      const updated = quizQuestions.filter((_, i) => i !== index);
      setQuizQuestions(updated);
    }
  };

  const uploadMedia = async (uri, type, lessonId) => {
    if (!uri || uri.startsWith('http') || uri.startsWith('https')) return uri;

    try {
      const filename = uri.split('/').pop();
      const fileType = getMimeType(uri, type === 'image' ? 'image/jpeg' : 'audio/mpeg');

      // Fix: lessonsApi.createMediaUpload expects a plain object, it wraps it in FormData
      const response = await lessonsApi.createMediaUpload({
        lesson: lessonId,
        file: {
          uri: uri,
          name: filename,
          type: fileType,
        },
        file_type: fileType
      });
      // Backend returns { id, file: "url", ... }
      return response.file;
    } catch (error) {
      console.warn("Media upload failed:", error);
      throw error;
    }
  };

  const saveQuiz = async () => {
    const isEdit = !!editingQuizId;
    const currentTitle = (isEdit ? editingQuizTitle : quizTitle) || "";
    const currentQuestions = isEdit ? editingQuizQuestions : quizQuestions;
    const currentVideo = isEdit ? editingQuizVideo : quizVideo;

    // Use selectedLesson specifically, or fallback to currentVideo if it was populated from edit
    // Ensure we have a valid integer ID
    let currentLessonId = selectedLesson;
    if (currentLessonId === null && currentVideo) {
      currentLessonId = parseInt(currentVideo);
    }

    // --- Validation ---
    if (!currentTitle.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('quizTitleRequired') || "Quiz title is required.");
      return;
    }

    if (!currentLessonId) {
      Alert.alert(i18n.t('error'), i18n.t('selectLessonForQuiz') || "Please select a lesson for this quiz.");
      return;
    }

    if (!currentQuestions || currentQuestions.length === 0) {
      Alert.alert(i18n.t('error'), i18n.t('addAtLeastOneQuestion') || "Add at least one question.");
      return;
    }

    // Check for empty fields in questions
    for (let i = 0; i < currentQuestions.length; i++) {
      const q = currentQuestions[i];
      const qText = q.question_text || q.question || q.text || "";
      if (!qText.trim()) {
        Alert.alert(i18n.t('error'), `${i18n.t('questionTextEmpty') || "Question text is empty"} (${i + 1})`);
        return;
      }

      const opts = q.options || ["", "", ""];
      if (opts.length < 3 || opts.some(o => !o || !o.trim())) {
        Alert.alert(i18n.t('error'), `${i18n.t('optionsEmpty') || "At least 3 options are required"} (${i + 1})`);
        return;
      }
    }

    setActionLoading(true);
    try {
      // Process questions to upload media first if needed
      const processedQuestions = await Promise.all(currentQuestions.map(async (q) => {
        let mediaUrl = q.media_url || q.mediaUrl || null;

        // If it's a new local media URI, upload it first
        if (q.type === 'image' && q.imageUri && !q.imageUri.startsWith('http')) {
          mediaUrl = await uploadMedia(q.imageUri, 'image', currentLessonId);
        } else if (q.type === 'audio' && q.audioUri && !q.audioUri.startsWith('http')) {
          mediaUrl = await uploadMedia(q.audioUri, 'audio', currentLessonId);
        } else if (q.type === 'image') {
          mediaUrl = q.imageUri || mediaUrl;
        } else if (q.type === 'audio') {
          mediaUrl = q.audioUri || mediaUrl;
        }

        const questionData = {
          question_text: q.question_text || q.question || q.text,
          type: q.type,
          options: q.options.filter(o => o && o.trim()), // Ensure options are trimmed and not empty
          correct_option_index: q.correct_option_index,
          media_url: mediaUrl,
        };

        // CRITICAL: Preserve the ID for existing questions so the backend can update them
        if (q.id) {
          questionData.id = q.id;
        }

        return questionData;
      }));

      // Build payload matching backend exactly (Swagger: /api/quizzes/quizzes/)
      const payload = {
        lesson: currentLessonId ? parseInt(String(currentLessonId)) : null,
        title: currentTitle.trim(),
        questions: processedQuestions,
        time_limit: isEdit ? (editingQuizTimeLimit ? parseInt(editingQuizTimeLimit) : 300) : (quizTimeLimit ? parseInt(quizTimeLimit) : 300),
      };

      if (isEdit) {
        payload.id = editingQuizId; // Ensure ID is present for PUT if backend needs it
      }

      console.log("Submitting Quiz Payload:", JSON.stringify(payload, null, 2));

      let responseData;
      if (isEdit) {
        responseData = await quizApi.updateQuiz(editingQuizId, payload);
      } else {
        responseData = await quizApi.createQuiz(payload);
      }

      // Update local state and persist
      const updatedQuizzes = { ...quizzes, [responseData.id]: responseData };
      setQuizzes(updatedQuizzes);
      await persist(STORAGE.QUIZZES, updatedQuizzes);

      Alert.alert(i18n.t('success'), `Quiz ${isEdit ? 'updated' : 'created'} successfully!`);

      // Reset and go back to list
      setEditingQuizId(null);
      setEditingQuizTitle("");
      setEditingQuizQuestions([]);
      setEditingQuizVideo("");
      setEditingQuizTimeLimit("");
      setQuizTitle("");
      setQuizQuestions([]);
      setQuizVideo("");
      setQuizTimeLimit("");
      setSelectedLesson(null);
      setQuizViewMode('list');
    } catch (error) {
      console.error(`Failed to ${isEdit ? 'update' : 'create'} quiz: `, error);
      const errorMsg = error.response?.data?.detail
        || (error.response?.data && JSON.stringify(error.response.data))
        || error.message
        || "An unknown error occurred";
      Alert.alert(i18n.t('error'), `Failed: ${errorMsg} `);
    } finally {
      setActionLoading(false);
    }
  };

  const startEditQuiz = (id) => {
    const q = quizzes[id];
    if (!q) return;
    setEditingQuizId(id);
    setEditingQuizTitle(q.title || "");
    setEditingQuizQuestions(q.questions ? [...q.questions] : []);
    setEditingQuizVideo(q.video ? String(q.video) : "");
    setSelectedLesson(q.video ? parseInt(q.video) : null); // Ensure selector is in sync
    setEditingQuizTimeLimit(q.timeLimit ? String(q.timeLimit) : "");
    setQuizViewMode('form');
  };

  const deleteQuiz = (id) => {
    Alert.alert(i18n.t('deleteQuizConfirm'), i18n.t('areYouSure'), [
      { text: i18n.t('cancel') },
      {
        text: i18n.t('delete'),
        style: "destructive",
        onPress: async () => {
          try {
            await quizApi.deleteQuiz(id);

            // Update local state
            const updated = { ...quizzes };
            delete updated[id];
            setQuizzes(updated);

            Alert.alert(i18n.t('success'), "Quiz deleted successfully!");
          } catch (error) {
            console.warn("Failed to delete quiz:", error);
            Alert.alert(i18n.t('error'), "Failed to delete quiz. Please try again.");

            // Fallback: delete from AsyncStorage
            const updated = { ...quizzes };
            delete updated[id];
            setQuizzes(updated);
            await persist(STORAGE.QUIZZES, updated);
          }
        },
      },
    ]);
  };

  // ---------- progress (teacher view) ----------
  // Load progress from backend API
  const refreshProgress = async () => {
    try {
      // Load progress records from backend
      const progressData = await progressApi.getProgress();

      // Handle different response formats
      let progressList = [];
      if (Array.isArray(progressData)) {
        progressList = progressData;
      } else if (progressData.results && Array.isArray(progressData.results)) {
        progressList = progressData.results;
      } else if (progressData.data && Array.isArray(progressData.data)) {
        progressList = progressData.data;
      }

      setProgress(progressList);

      // Also load from local storage as fallback/cache
      try {
        const [rawProgress, rawStudentProgress] = await Promise.all([
          AsyncStorage.getItem(STORAGE.PROGRESS),
          AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),
        ]);
        // Use backend data as primary, local as fallback
        if (progressList.length === 0 && rawProgress) {
          setProgress(JSON.parse(rawProgress));
        }
        if (rawStudentProgress) {
          setStudentProgress(JSON.parse(rawStudentProgress));
        }
      } catch (localError) {
        console.warn("Failed to load local progress:", localError);
      }
    } catch (e) {
      console.warn("Failed to load progress from backend:", e);
      // Fallback to local storage
      try {
        const [rawProgress, rawStudentProgress] = await Promise.all([
          AsyncStorage.getItem(STORAGE.PROGRESS),
          AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),
        ]);
        setProgress(rawProgress ? JSON.parse(rawProgress) : []);
        setStudentProgress(rawStudentProgress ? JSON.parse(rawStudentProgress) : {});
      } catch (fallbackError) {
        console.warn("refreshProgress fallback failed:", fallbackError);
      }
    }
  };

  // Show loading state while teacher dashboard data is being prepared
  // Only wait for content loading, not profile (profile check will redirect if needed)
  if (loading || !profileCheckComplete) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        {/* testID added to support comprehensive dashboard tests */}
        <ActivityIndicator testID="loading-indicator" size="large" color="#4c1d95" />
        <Text style={{ marginTop: 10, color: "#444" }}>
          {i18n.t("loading")}
        </Text>
      </SafeAreaView>
    );
  }

  // Section toggles: dashboard / lessons / videos / quizzes / progress
  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Action Buttons */}
      <View style={styles.floatingActions}>
        {/* Avatar - Top Left */}
        <TouchableOpacity
          onPress={pickProfilePhoto}
          accessibilityLabel={i18n.t('goToProfile')}
          style={styles.floatingProfileButton}
        >
          {profile?.photo && profile.photo.trim() !== "" ? (
            <Image source={{ uri: profile.photo }} style={styles.floatingProfileAvatar} />
          ) : (
            <View style={styles.floatingProfileAvatarPlaceholder}>
              <Ionicons name="person" size={22} color="#fff" />
            </View>
          )}
          {/* Small label so tests can find the photo button via /photo/i */}
          <Text style={{ fontSize: 10, color: "#FFFFFF", marginTop: 2 }}>
            {i18n.t("photo") || "Photo"}
          </Text>
        </TouchableOpacity>

        {/* Right Side Actions */}
        <View style={styles.floatingActionButtons}>
          {/* Language Switcher */}
          <TouchableOpacity
            onPress={() => {
              const languages = ["en", "ti", "am"];
              const currentIndex = languages.indexOf(language);
              const nextIndex = (currentIndex + 1) % languages.length;
              changeLanguage(languages[nextIndex]);
            }}
            style={styles.floatingActionButton}
            accessibilityLabel={i18n.t('selectLanguage')}
          >
            <Ionicons name="language" size={20} color="#2563EB" />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={async () => {
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
                // Navigate to login - use drawer route
                router.replace("/(drawer)/login");
              } catch (e) {
                console.warn("Logout error:", e);
                // Still navigate to login even if there's an error
                router.replace("/(drawer)/login");
              }
            }}
            style={[styles.floatingActionButton, styles.floatingLogoutButton]}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
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
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <Text style={[styles.lessonTitle, { fontSize: isTablet ? 32 : 28, textAlign: "center", color: "#4c1d95" }]}>
                    Quiz Master
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: "600", color: "#666", marginTop: 4 }}>
                    {detail.item.title}
                  </Text>
                </View>

                {/* Linked Video Section */}
                {detail.item.video && (() => {
                  const linkedVideo = videos.find(v => v.id === detail.item.video);
                  if (linkedVideo) {
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setDetail({ type: "videos", item: linkedVideo });
                        }}
                        style={{
                          marginBottom: 20,
                          padding: 12,
                          backgroundColor: "#EFF6FF",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#DBEAFE",
                          flexDirection: "row",
                          alignItems: "center",
                        }}
                      >
                        <Ionicons name="videocam" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E40AF" }}>
                          Linked: {linkedVideo.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })()}

                {/* Questions List */}
                {(!detail.item.questions || detail.item.questions.length === 0) ? (
                  <View style={{ padding: 40, alignItems: "center", justifyContent: "center", backgroundColor: "#f9f9f9", borderRadius: 16 }}>
                    <Text style={{ fontSize: 40, marginBottom: 12 }}>❓</Text>
                    <Text style={{ fontSize: 18, color: "#666", fontWeight: "600" }}>{i18n.t('noQuestionsFound') || "No questions found"}</Text>
                  </View>
                ) : (
                  (detail.item.questions || []).map((q, i) => (
                    <View key={q.id || i} style={[
                      styles.itemCard,
                      { backgroundColor: "#E0F2FE", padding: 16, borderRadius: 20, borderWidth: 0, marginBottom: 16 }
                    ]}>
                      <Text style={{ fontWeight: "800", fontSize: 18, marginBottom: 12, color: "#000" }}>
                        {i + 1}. {q.question || q.question_text || q.text || q.title || q.content || q.body || q.label || q.name || "Question"}
                      </Text>

                      {/* Media Handling */}
                      {q.type === "image" && (q.imageUri || q.media_url) && (
                        <Image
                          source={{ uri: fixMediaUrl(q.media_url || q.imageUri) }}
                          style={{
                            width: "100%",
                            height: 200,
                            marginBottom: 16,
                            borderRadius: 12,
                            resizeMode: "contain",
                            backgroundColor: "#fff"
                          }}
                        />
                      )}

                      {q.type === "audio" && (q.audioUri || q.media_url) && (
                        <View style={{ marginBottom: 16 }}>
                          <AudioPlayer uri={fixMediaUrl(q.media_url || q.audioUri)} />
                        </View>
                      )}

                      {/* Options Buttons */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        {q.options.map((o, j) => {
                          const isCorrect = (q.answerIndex !== undefined ? q.answerIndex : q.correct_option_index) === j;
                          return (
                            <View
                              key={j}
                              style={{
                                flex: 1,
                                minWidth: "30%",
                                backgroundColor: isCorrect ? "#86EFAC" : "#60A5FA", // Green if correct, Blue otherwise
                                paddingVertical: 12,
                                paddingHorizontal: 8,
                                borderRadius: 25,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: isCorrect ? 2 : 0,
                                borderColor: "#166534"
                              }}
                            >
                              <Text style={{
                                color: isCorrect ? "#064E3B" : "#FFF",
                                fontWeight: "700",
                                textAlign: "center",
                                fontSize: 15
                              }}>
                                {typeof o === 'string' ? o : (o.text || o)}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}

                <View style={{ flexDirection: "row", marginTop: 24, gap: 12, justifyContent: "center" }}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { paddingHorizontal: 24 }]}
                    onPress={() => {
                      startEditQuiz(detail.item.id);
                      setDetail(null);
                      setSelectedSection("quizzes");
                      setQuizViewMode('form');
                    }}
                  >
                    <Text style={[styles.smallBtnText, { fontSize: 16 }]}>
                      {i18n.t('edit')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#EF4444", paddingHorizontal: 24 }]}
                    onPress={() => {
                      deleteQuiz(detail.item.id);
                      setDetail(null);
                    }}
                  >
                    <Text style={[styles.smallBtnText, { color: "#fff", fontSize: 16 }]}>
                      {i18n.t('delete')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal >

      {/* Student Preview Modal */}
      < Modal visible={showStudentPreview} transparent animationType="fade" onRequestClose={() => setShowStudentPreview(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ width: isTablet ? 600 : "90%", backgroundColor: "#FFF", borderRadius: 20, padding: 20, alignItems: "center" }}>
            {previewQuestion && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                  <Text style={{ fontSize: 24, fontWeight: "900", color: "#4c1d95" }}>Question Preview</Text>
                </View>

                <Text style={{ fontSize: 20, fontWeight: "700", textAlign: "center", marginBottom: 16 }}>
                  {previewQuestion.question}
                </Text>

                {previewQuestion.type === "image" && previewQuestion.imageUri && (
                  <Image source={{ uri: previewQuestion.imageUri }} style={{ width: "100%", height: 200, borderRadius: 12, resizeMode: "contain", marginBottom: 20 }} />
                )}
                {previewQuestion.type === "audio" && previewQuestion.audioUri && (
                  <View style={{ width: '100%', marginBottom: 20 }}>
                    <AudioPlayer uri={previewQuestion.audioUri} />
                  </View>
                )}

                <View style={{ width: "100%", gap: 12 }}>
                  {previewQuestion.options.map((opt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.8}
                      style={{
                        backgroundColor: idx === previewQuestion.answerIndex ? "#DCFCE7" : "#F3F4F6",
                        padding: 16,
                        borderRadius: 16,
                        borderWidth: 2,
                        borderColor: idx === previewQuestion.answerIndex ? "#22C55E" : "#E5E7EB",
                        flexDirection: "row",
                        alignItems: "center"
                      }}
                    >
                      <View style={{
                        width: 32, height: 32, borderRadius: 16,
                        backgroundColor: idx === previewQuestion.answerIndex ? "#22C55E" : "#D1D5DB",
                        justifyContent: "center", alignItems: "center", marginRight: 12
                      }}>
                        <Text style={{ color: "#FFF", fontWeight: "bold" }}>{String.fromCharCode(65 + idx)}</Text>
                      </View>
                      <Text style={{ fontSize: 18, fontWeight: "600", color: "#374151" }}>{opt}</Text>
                      {idx === previewQuestion.answerIndex && <Ionicons name="checkmark-circle" size={24} color="#22C55E" style={{ marginLeft: "auto" }} />}
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={() => setShowStudentPreview(false)}
                  style={{ marginTop: 24, paddingVertical: 12, paddingHorizontal: 32, backgroundColor: "#4c1d95", borderRadius: 12 }}
                >
                  <Text style={{ color: "#FFF", fontWeight: "bold", fontSize: 16 }}>Close Preview</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal >

      {/* Lesson Selector Modal */}
      <Modal visible={showLessonModal} transparent animationType="slide" onRequestClose={() => setShowLessonModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ width: isTablet ? 500 : "90%", maxHeight: "80%", backgroundColor: "#FFF", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: "800", color: "#1E293B" }}>Select Lesson</Text>
              <TouchableOpacity onPress={() => setShowLessonModal(false)}>
                <Ionicons name="close-circle" size={32} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedLesson(null);
                  setQuizVideo("");
                  setShowLessonModal(false);
                }}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: selectedLesson === null ? "#EFF6FF" : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: selectedLesson === null ? "#2563EB" : "#E2E8F0",
                  marginBottom: 12,
                  flexDirection: "row",
                  alignItems: "center"
                }}
              >
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: selectedLesson === null ? "#2563EB" : "#CBD5E1", marginRight: 12 }} />
                <Text style={{ fontSize: 16, fontWeight: "600", color: selectedLesson === null ? "#2563EB" : "#475569" }}>None</Text>
              </TouchableOpacity>

              {videos.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Text style={{ color: "#64748B", textAlign: "center" }}>No lessons found. Please add a video lesson first.</Text>
                </View>
              ) : (
                videos.map((lesson) => (
                  <TouchableOpacity
                    key={lesson.id}
                    onPress={() => {
                      setSelectedLesson(lesson.id);
                      setQuizVideo(String(lesson.id));
                      setShowLessonModal(false);
                    }}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      backgroundColor: String(selectedLesson) === String(lesson.id) ? "#EFF6FF" : "#F8FAFC",
                      borderWidth: 1,
                      borderColor: String(selectedLesson) === String(lesson.id) ? "#2563EB" : "#E2E8F0",
                      marginBottom: 12,
                      flexDirection: "row",
                      alignItems: "center"
                    }}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: String(selectedLesson) === String(lesson.id) ? "#2563EB" : "#CBD5E1", marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: "600", color: String(selectedLesson) === String(lesson.id) ? "#1E40AF" : "#334155" }}>{lesson.title}</Text>
                      {lesson.description ? <Text style={{ fontSize: 13, color: "#64748B", marginTop: 2 }} numberOfLines={1}>{lesson.description}</Text> : null}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Main Content - only show when detail is not active */}
      {
        !detail && (
          // Main content
          <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
            {/* Welcome Section */}
            {selectedSection === "dashboard" && (
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>{i18n.t('teacherDashboard') || 'Teacher Dashboard'}</Text>
                <Text style={styles.welcomeSubtitle}>{i18n.t('manageContent') || 'Manage lessons, quizzes, and track progress'}</Text>
              </View>
            )}

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
                  <AnimatedPressable onPress={() => router.push("/dashboard/collections")} style={{ flex: 1, minWidth: 0 }}>
                    <View style={[styles.dashboardCard, { padding: isTablet ? 24 : isSmallScreen ? 12 : 16 }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <View style={{
                          width: isSmallScreen ? 36 : 40,
                          height: isSmallScreen ? 36 : 40,
                          borderRadius: isSmallScreen ? 18 : 20,
                          backgroundColor: "#FFFBEB",
                          justifyContent: "center",
                          alignItems: "center",
                          marginRight: 12,
                        }}>
                          <Ionicons name="folder" size={isSmallScreen ? 18 : 20} color="#F59E0B" />
                        </View>
                        <Text style={[styles.dashboardCardTitle, { fontSize: isTablet ? 19 : isSmallScreen ? 15 : 17 }]}>
                          {i18n.t('myCollections') || "My Collections"}
                        </Text>
                      </View>
                      <Text style={[styles.dashboardCardSubtitle, { fontSize: isTablet ? 14 : isSmallScreen ? 11 : 13 }]}>
                        {Object.values(collections).reduce((acc, c) => acc + (c.lesson_count || 0), 0)} {i18n.t('lessons') || "lessons"}
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

            {/* VIDEO MANAGEMENT */}
            {selectedSection === "videos" && (
              <View>
                <TouchableOpacity
                  onPress={() => setSelectedSection("dashboard")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                    padding: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color="#2563EB" />
                  <Text style={{ fontSize: 17, color: "#2563EB", marginLeft: 8, fontWeight: "700", letterSpacing: 0.2 }}>
                    {i18n.t('backToDashboard') || "Back to Dashboard"}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.title, { marginBottom: 16 }]}>Manage Videos</Text>

                {/* Add New Video Form */}
                <View style={[styles.card, { marginBottom: 24 }]}>
                  <Text style={[styles.cardTitle, { marginBottom: 16 }]}>
                    {editingVideoId ? "Edit Video" : "Upload New Video"}
                  </Text>

                  {/* Lesson Selection Dropdown */}
                  <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#374151" }}>Video Title *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Introduction to Physics"
                    placeholderTextColor="#94a3b8"
                    value={videoTitle}
                    onChangeText={setVideoTitle}
                  />

                  <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#374151" }}>Description *</Text>
                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                    placeholder="Briefly describe this video..."
                    placeholderTextColor="#94a3b8"
                    value={videoDescription}
                    onChangeText={setVideoDescription}
                    multiline
                  />

                  {/* File Pickers */}
                  <TouchableOpacity style={styles.fileBtn} onPress={pickVideo}>
                    <Ionicons name="videocam" size={24} color="#64748B" />
                    <Text style={{ marginLeft: 10, color: "#64748B", fontWeight: "600" }}>
                      {videoUrl ? (videoFile ? videoFile.name : (videoUrl.split('/').pop() || "Video Selected")) : "Select Video File *"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.fileBtn} onPress={pickThumbnail}>
                    <Ionicons name="image" size={24} color="#64748B" />
                    <Text style={{ marginLeft: 10, color: "#64748B", fontWeight: "600" }}>
                      {thumbnailUrl ? "Thumbnail Selected" : "Select Thumbnail (Optional)"}
                    </Text>
                  </TouchableOpacity>

                  {/* Metadata */}
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#374151" }}>Duration (sec)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 120"
                        keyboardType="numeric"
                        value={durationSeconds}
                        onChangeText={setDurationSeconds}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#374151" }}>Difficulty</Text>
                      <View style={{ flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 }}>
                        {['easy', 'medium', 'hard'].map((lvl) => (
                          <TouchableOpacity
                            key={lvl}
                            onPress={() => setVideoDifficulty(lvl)}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 8,
                              backgroundColor: videoDifficulty === lvl ? '#fff' : 'transparent',
                              shadowColor: videoDifficulty === lvl ? '#000' : 'transparent',
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: videoDifficulty === lvl ? 2 : 0,
                              alignItems: 'center'
                            }}
                          >
                            <Text style={{
                              fontWeight: '600',
                              color: videoDifficulty === lvl ? '#2563EB' : '#64748B',
                              textTransform: 'capitalize'
                            }}>
                              {lvl}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#374151" }}>Tags (comma separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="math, algebra, basics"
                    value={videoTags}
                    onChangeText={setVideoTags}
                  />

                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#374151", marginRight: 12 }}>Published?</Text>
                    <TouchableOpacity
                      onPress={() => setVideoIsPublished(!videoIsPublished)}
                      style={{
                        width: 50, height: 28,
                        backgroundColor: videoIsPublished ? "#10B981" : "#CBD5E1",
                        borderRadius: 14, padding: 2
                      }}
                    >
                      <View style={{
                        width: 24, height: 24,
                        backgroundColor: "#fff", borderRadius: 12,
                        alignSelf: videoIsPublished ? "flex-end" : "flex-start"
                      }} />
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={editingVideoId ? saveEditVideo : addVideo}>
                      <Text style={styles.btnText}>{editingVideoId ? "Update Video" : "Upload Video"}</Text>
                    </TouchableOpacity>

                    {editingVideoId && (
                      <TouchableOpacity
                        style={[styles.btn, { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#EF4444" }]}
                        onPress={() => {
                          setEditingVideoId(null);
                          setVideoTitle("");
                          setVideoDescription("");
                          setVideoUrl("");
                          setThumbnailUrl("");
                          setVideoLesson(null);
                        }}
                      >
                        <Text style={[styles.btnText, { color: "#EF4444" }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Video List */}
                {videos.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No videos found.</Text>
                  </View>
                ) : (
                  videos.map((v) => (
                    <View key={v.id} style={styles.itemCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16 }}>{v.title}</Text>
                          <Text style={{ color: '#666', fontSize: 13, marginTop: 4 }} numberOfLines={1}>{v.description}</Text>
                          <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                            {v.duration_seconds ? `${Math.floor(v.duration_seconds / 60)}m ${v.duration_seconds % 60} s` : 'No duration'} • {v.difficulty}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <TouchableOpacity style={[styles.smallBtn, { padding: 8, backgroundColor: '#3B82F6' }]} onPress={() => startEditVideo(v.id)}>
                            <Ionicons name="create" size={16} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.smallBtn, { padding: 8, backgroundColor: '#EF4444' }]} onPress={() => deleteVideo(v.id)}>
                            <Ionicons name="trash" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* QUIZZES MANAGEMENT */}
            {selectedSection === "quizzes" && (
              <View>
                {/* Header Navigation */}
                <TouchableOpacity
                  onPress={() => {
                    if (quizViewMode === 'form') {
                      setQuizViewMode('list');
                    } else {
                      setSelectedSection("dashboard");
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                    padding: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color="#2563EB" />
                  <Text style={{ fontSize: 17, color: "#2563EB", marginLeft: 8, fontWeight: "700", letterSpacing: 0.2 }}>
                    {quizViewMode === 'form' ? (i18n.t('backToList') || "Back to Quiz List") : (i18n.t('backToDashboard') || "Back to Dashboard")}
                  </Text>
                </TouchableOpacity>

                {/* LIST MODE */}
                {quizViewMode === 'list' && (
                  <View>
                    <Text style={[styles.title, { marginBottom: 16 }]}>{i18n.t('allQuizzes') || "All Quizzes"}</Text>

                    {Object.keys(quizzes).length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Text style={{ fontSize: 50, marginBottom: 12 }}>🧩</Text>
                        <Text style={styles.emptyText}>{i18n.t('noQuizzesYet') || "No quizzes yet."}</Text>
                        <Text style={{ color: "#94a3b8", marginTop: 4 }}>Create your first quiz below!</Text>
                      </View>
                    ) : (
                      Object.values(quizzes).map((q) => {
                        const linkedVideo = q.video ? videos.find(v => v.id === q.video) : null;
                        return (
                          <View key={q.id} style={[styles.item, { flexDirection: "column", alignItems: "flex-start" }]}>
                            <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[styles.itemTitle, { fontSize: 18, color: "#4c1d95" }]}>{q.title}</Text>
                                <Text style={{ color: "#64748B", marginTop: 4, fontWeight: "600" }}>
                                  {(q.questions || []).length} {i18n.t('questions') || "questions"}
                                  {q.timeLimit ? ` • ⏱️ ${Math.floor(q.timeLimit / 60)}m ${q.timeLimit % 60} s` : ""}
                                </Text>
                              </View>
                              <View style={{ flexDirection: "row", gap: 12 }}>
                                <TouchableOpacity onPress={() => {
                                  startEditQuiz(q.id);
                                  setQuizViewMode('form');
                                }} style={{ padding: 6 }}>
                                  <Ionicons name="pencil" size={22} color="#007AFF" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={async () => {
                                  let item = q;
                                  if (!q.questions || q.questions.length === 0) {
                                    try {
                                      const fullQuiz = await quizApi.getQuiz(q.id);
                                      if (fullQuiz) item = fullQuiz;
                                    } catch (e) { console.warn("Failed to load full quiz", e); }
                                  }
                                  setDetail({ type: "quizzes", item });
                                }} style={{ padding: 6 }}>
                                  <Ionicons name="eye" size={22} color="#333" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteQuiz(q.id)} style={{ padding: 6 }}>
                                  <Ionicons name="trash" size={22} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            </View>

                            {linkedVideo && (
                              <View style={{
                                marginTop: 12,
                                flexDirection: "row",
                                alignItems: "center",
                                padding: 8,
                                backgroundColor: "#EFF6FF",
                                borderRadius: 8,
                                width: "100%"
                              }}>
                                <Ionicons name="videocam" size={16} color="#2563EB" />
                                <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: "600", color: "#2563EB" }}>
                                  Linked to: {linkedVideo.title}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}

                    {/* Add New Quiz Button - At the bottom as requested */}
                    <TouchableOpacity
                      style={[styles.btn, { marginTop: 24, flexDirection: "row", gap: 8 }]}
                      onPress={() => {
                        setEditingQuizId(null);
                        setQuizTitle("");
                        setQuizQuestions([]);
                        setQuizVideo("");
                        setQuizTimeLimit("");
                        setSelectedLesson(null);
                        setQuizViewMode('form');
                      }}
                    >
                      <Ionicons name="add-circle" size={24} color="#fff" />
                      <Text style={[styles.btnText, { fontSize: 18 }]}>{i18n.t('addNewQuiz') || "Add New Quiz"}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* FORM MODE */}
                {quizViewMode === 'form' && (
                  <View style={styles.card}>
                    <Text style={[styles.title, { borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 12 }]}>
                      {editingQuizId ? (i18n.t('editQuiz') || "Edit Quiz") : (i18n.t('createNewQuiz') || "Create New Quiz")}
                    </Text>

                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#64748B", marginBottom: 6 }}>Quiz Title</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={i18n.t('quizTitle') || "Enter quiz title"}
                      value={editingQuizId ? editingQuizTitle : quizTitle}
                      onChangeText={(t) => (editingQuizId ? setEditingQuizTitle(t) : setQuizTitle(t))}
                    />

                    <TouchableOpacity
                      style={[styles.input, { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 }]}
                      onPress={() => setShowLessonModal(true)}
                    >
                      <Text style={{ color: selectedLesson ? "#0F172A" : "#94A3B8", fontSize: 15 }}>
                        {selectedLesson
                          ? videos.find(l => String(l.id) === String(selectedLesson))?.title || `Lesson ${selectedLesson} `
                          : "Select lesson"}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#64748B" />
                    </TouchableOpacity>

                    {/* Questions List - Controlled Components */}
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#4c1d95", marginTop: 24, marginBottom: 12 }}>
                      Questions
                    </Text>

                    {/* Render inputs for each question directly */}
                    {(editingQuizId ? editingQuizQuestions : quizQuestions).map((q, qIndex) => (
                      <View key={qIndex} style={{
                        marginBottom: 24,
                        padding: 16,
                        backgroundColor: "#F8FAFC",
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: "#E2E8F0"
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text style={{ fontWeight: '700', fontSize: 16 }}>Question {qIndex + 1}</Text>
                          <TouchableOpacity onPress={() => handleRemoveQuestion(qIndex)}>
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Text</Text>
                        <TextInput
                          style={[styles.input, { marginBottom: 12 }]}
                          placeholder="Type your question here"
                          value={q.question_text || q.question || q.text || ""}
                          onChangeText={(t) => updateQuestion(qIndex, 'question_text', t)}
                        />

                        {/* Type Selection */}
                        <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Type</Text>
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                          {['text', 'image', 'audio'].map((t) => (
                            <TouchableOpacity
                              key={t}
                              onPress={() => updateQuestion(qIndex, 'type', t)}
                              style={[styles.typeBtn, (q.type || 'text') === t && styles.typeBtnSelected]}
                            >
                              <Ionicons
                                name={t === 'audio' ? 'mic' : t === 'image' ? 'image' : 'text'}
                                size={16}
                                color={(q.type || 'text') === t ? "#fff" : "#475569"}
                              />
                              <Text style={[styles.typeBtnText, (q.type || 'text') === t && styles.typeBtnTextSelected, { marginLeft: 4, textTransform: 'capitalize' }]}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Media Inputs */}
                        {(q.type === 'image') && (
                          <View style={{ marginBottom: 12 }}>
                            <TouchableOpacity style={styles.fileBtn} onPress={() => pickQuestionImage(qIndex)}>
                              <Ionicons name="image-outline" size={20} color={q.imageUri || q.media_url ? "#4c1d95" : "#333"} />
                              <Text style={{ marginLeft: 8, color: "#333" }}>
                                {q.imageUri || q.media_url ? "Change Image" : "Pick Image"}
                              </Text>
                            </TouchableOpacity>
                            {(q.imageUri || q.media_url) && (
                              <Image source={{ uri: q.imageUri || q.media_url }} style={{ width: "100%", height: 150, marginTop: 8, borderRadius: 8, resizeMode: "contain" }} />
                            )}
                          </View>
                        )}

                        {(q.type === 'audio') && (
                          <View style={{ marginBottom: 12 }}>
                            <TouchableOpacity style={styles.fileBtn} onPress={() => pickQuestionAudio(qIndex)}>
                              <Ionicons name="musical-notes-outline" size={20} color={q.audioUri || q.media_url ? "#4c1d95" : "#333"} />
                              <Text style={{ marginLeft: 8, color: "#333" }}>
                                {q.audioUri || q.media_url ? "Change Audio" : "Pick Audio"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Options */}
                        <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 6 }}>Options</Text>
                        {[0, 1, 2].map((oIndex) => (
                          <View key={oIndex} style={{ marginBottom: 8 }}>
                            <TextInput
                              style={[styles.input, { marginBottom: 0 }]}
                              placeholder={`Option ${oIndex + 1} `}
                              value={(q.options && q.options[oIndex]) ? q.options[oIndex] : ""}
                              onChangeText={(t) => updateOption(qIndex, oIndex, t)}
                            />
                          </View>
                        ))}

                        {/* Correct Answer */}
                        <Text style={{ fontSize: 14, fontWeight: "600", marginTop: 8, marginBottom: 6 }}>Correct Answer</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {[0, 1, 2].map((oIndex) => {
                            const isCorrect = (q.correct_option_index !== undefined ? q.correct_option_index : q.answerIndex) === oIndex;
                            return (
                              <TouchableOpacity
                                key={oIndex}
                                onPress={() => updateQuestion(qIndex, 'correct_option_index', oIndex)}
                                style={{
                                  flex: 1,
                                  paddingVertical: 10,
                                  backgroundColor: isCorrect ? "#22C55E" : "#F1F5F9",
                                  borderRadius: 8,
                                  alignItems: 'center',
                                  borderWidth: 1,
                                  borderColor: isCorrect ? "#15803D" : "#CBD5E1"
                                }}
                              >
                                <Text style={{ fontWeight: "bold", color: isCorrect ? "#fff" : "#64748B" }}>
                                  Opt {oIndex + 1}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ))}

                    <TouchableOpacity style={[styles.btn, { marginBottom: 24, backgroundColor: "#3B82F6" }]} onPress={handleAddQuestion}>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={[styles.btnText, { marginLeft: 8 }]}>Add Question</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 20 }}>
                      <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: "#10B981" }]} onPress={saveQuiz}>
                        <Text style={styles.btnText}>{editingQuizId ? (i18n.t('saveChanges') || "Save Changes") : (i18n.t('saveQuiz') || "Create Quiz")}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: "#fff", borderColor: "#EF4444", borderWidth: 1 }]} onPress={() => {
                        setEditingQuizId(null);
                        setEditingQuizTitle("");
                        setEditingQuizQuestions([]);
                        setEditingQuizVideo("");
                        setEditingQuizTimeLimit("");
                        setQuizViewMode('list');
                      }}>
                        <Text style={{ color: "#EF4444", fontWeight: "700", textAlign: "center" }}>{i18n.t('cancel') || "Cancel"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* PROGRESS */}
            {selectedSection === "progress" && (
              <View>
                <TouchableOpacity
                  onPress={() => setSelectedSection("dashboard")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 16,
                    padding: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  <Ionicons name="arrow-back" size={24} color="#2563EB" />
                  <Text style={{ fontSize: 17, color: "#2563EB", marginLeft: 8, fontWeight: "700", letterSpacing: 0.2 }}>
                    {i18n.t('back') || "Back"}
                  </Text>
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
                            <View style={[styles.progressBarFill, { width: `${overallProgress}% ` }]} />
                          </View>
                          <View style={{ flexDirection: "row", marginTop: 8, gap: 12 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.progressLabel}>Videos: {Math.round(videosProgress)}%</Text>
                              <View style={styles.miniProgressBar}>
                                <View style={[styles.miniProgressFill, { width: `${videosProgress}% `, backgroundColor: "#10b981" }]} />
                              </View>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.progressLabel}>Quizzes: {Math.round(quizzesProgress)}%</Text>
                              <View style={styles.miniProgressBar}>
                                <View style={[styles.miniProgressFill, { width: `${quizzesProgress}% `, backgroundColor: "#f59e0b" }]} />
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
                              const videoTitle = video ? video.title : `Video ID: ${videoDetail.videoId} `;
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

                {/* Lesson Progress Records from Backend */}
                <Text style={{ fontWeight: "900", marginTop: 16, marginBottom: 8 }}>📚 Lesson Progress Records</Text>
                {loadingProgressRecords ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>Loading lesson progress…</Text>
                  </View>
                ) : progressRecords.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No lesson progress records yet.</Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    {progressRecords.map((rec) => (
                      <View
                        key={rec.id}
                        style={[
                          styles.card,
                          {
                            paddingVertical: 12,
                            marginBottom: 12,
                            borderLeftWidth: 4,
                            borderLeftColor:
                              rec.status === "completed"
                                ? "#10b981"
                                : rec.status === "in-progress"
                                  ? "#f59e0b"
                                  : "#e5e7eb",
                          },
                        ]}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { fontSize: 16 }]}>
                              {rec.lesson_title || "Untitled Lesson"}
                            </Text>
                            <Text style={{ marginTop: 4, color: "#666", fontSize: 13 }}>
                              👤 {rec.child_nickname || `Child ID: ${rec.child} `}
                            </Text>
                          </View>
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              backgroundColor:
                                rec.status === "completed"
                                  ? "#d1fae5"
                                  : rec.status === "in-progress"
                                    ? "#fef3c7"
                                    : "#f3f4f6",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color:
                                  rec.status === "completed"
                                    ? "#065f46"
                                    : rec.status === "in-progress"
                                      ? "#92400e"
                                      : "#6b7280",
                                textTransform: "uppercase",
                              }}
                            >
                              {rec.status || "not-started"}
                            </Text>
                          </View>
                        </View>

                        <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                          {typeof rec.points_earned === "number" && (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Ionicons name="star" size={14} color="#f59e0b" />
                              <Text style={{ marginLeft: 4, fontSize: 13, color: "#000", fontWeight: "600" }}>
                                {rec.points_earned} points
                              </Text>
                            </View>
                          )}
                          {rec.last_accessed && (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Ionicons name="time-outline" size={14} color="#666" />
                              <Text style={{ marginLeft: 4, fontSize: 12, color: "#666" }}>
                                Last: {new Date(rec.last_accessed).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                          {rec.completion_date && (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                              <Text style={{ marginLeft: 4, fontSize: 12, color: "#10b981", fontWeight: "600" }}>
                                Completed: {new Date(rec.completion_date).toLocaleDateString()}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Dashboard quick navigation at bottom */}
            <View style={{ height: 24 }} />
          </ScrollView>
        )
      }
      {actionLoading && (
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ marginTop: 16, fontSize: 16, fontWeight: "600", color: "#1E293B" }}>
            {editingQuizId ? "Saving changes..." : "Creating quiz..."}
          </Text>
        </View>
      )}
    </SafeAreaView >
  );
}

// Professional Teacher Dashboard Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" }, // Professional light gray background
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  floatingActions: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    left: 20,
    right: 20,
    zIndex: 1000,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
  floatingProfileButton: {
    position: "relative",
  },
  floatingProfileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  floatingProfileAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  floatingActionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  floatingActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  floatingLogoutButton: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
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
  contentScroll: { padding: 20, flexGrow: 1, paddingBottom: 40, paddingTop: Platform.OS === "ios" ? 80 : 70 },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 18,
    gap: 16,
    flexWrap: "nowrap",
  },
  dashboardCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    minHeight: 120,
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  dashboardCardTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A", letterSpacing: 0.3 },
  dashboardCardSubtitle: { marginTop: 10, color: "#64748B", fontSize: 14, fontWeight: "500", letterSpacing: 0.1, lineHeight: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 20, color: "#0F172A", letterSpacing: 0.3 },
  input: {
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
  },
  fileBtn: {
    backgroundColor: "#F1F5F9",
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  btn: {
    backgroundColor: "#2563EB", // Professional blue
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16, letterSpacing: 0.5 },
  item: { backgroundColor: "#fff", padding: 14, borderRadius: 10, marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontWeight: "800" },
  emptyBox: { marginTop: 24, padding: 32, alignItems: "center", justifyContent: "center" },
  emptyText: { marginTop: 12, color: "#64748B", fontSize: 16, fontWeight: "600", textAlign: "center", lineHeight: 24 },
  lessonTitle: { fontSize: 22, fontWeight: "900" },
  lessonDesc: { marginTop: 10, fontSize: 16, lineHeight: 22, color: "#444" },
  smallBtn: {
    padding: 14,
    backgroundColor: "#2563EB",
    borderRadius: 12,
    shadowColor: "#2563EB",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  smallBtnText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.3 },

  // itemCard used in preview/listing
  itemCard: {
    backgroundColor: "#fff",
    padding: 18,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    width: "100%",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontWeight: "700", fontSize: 16, color: "#0F172A", flexShrink: 1, letterSpacing: 0.2 },
  cardDesc: { marginTop: 10, color: "#64748B", fontSize: 14, lineHeight: 20 },
  cardBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginLeft: 10, borderWidth: 1, borderColor: "#C7D2FE" },
  cardBadgeText: { color: "#4F46E5", fontWeight: "700", fontSize: 12, letterSpacing: 0.2 },

  // Stats card
  statsCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2563EB", // Professional blue
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 6,
    fontWeight: "600",
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
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeBtnSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
    ...Platform.select({
      ios: {
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  typeBtnText: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  typeBtnTextSelected: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.3,
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
