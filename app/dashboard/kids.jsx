// Kids.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, Audio, ResizeMode } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../contexts/UserContext";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import i18n from "../../i18n";
import { useLanguage } from "../../contexts/LanguageContext";
import * as quizApi from "../../src/services/quizApi";
import * as recommendationApi from "../../src/services/recommendationApi";
import * as progressApi from "../../src/services/progressApi";
import * as lessonsApi from "../../src/services/lessonsApi";
import * as profilesApi from "../../src/services/profilesApi";
import * as coreApi from "../../src/services/coreApi";
import api, { fixMediaUrl } from "../../src/api";
const { height, width } = Dimensions.get("window");
const isTablet = width >= 768;
const isSmallScreen = width < 375;

const STORAGE = {
  VIDEOS: "@app_videos_v1",
  QUIZZES: "@app_quizzes_v1",
  COLLECTIONS: "@app_collections_v1",
  PROFILE: "@app_profile_v1",
  STUDENT_PROGRESS: "@app_student_progress_v1",
  PHOTO: "@app_photo_v1",
};

// Badge list is now loaded from backend via progressApi.getBadges()
// Pressable with subtle scale animation
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
// Simple ProgressBar Component (responsive)
const ProgressBar = ({ progress }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: progress,
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);
  return (
    <View style={styles.progressWrap}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
};

// Video Player Component with Controls for Individual Video View
const VideoPlayerWithControls = ({ video, videoRef, collections }) => {
  const [showControls, setShowControls] = useState(false);
  const [status, setStatus] = useState({});
  const [isBuffering, setIsBuffering] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const controlsTimeout = useRef(null);
  const collection = video.collection ? collections?.[video.collection] : null;

  useEffect(() => {
    if (showControls) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls, status]);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleSeek = async (seconds) => {
    if (videoRef.current && status.positionMillis !== undefined) {
      const newPosition = Math.max(0, Math.min(status.durationMillis || 0, status.positionMillis + seconds * 1000));
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = status.durationMillis ? (status.positionMillis / status.durationMillis) * 100 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center" }}>
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        <Video
          source={{ uri: fixMediaUrl(video.uri || video.video_url) }}
          ref={videoRef}
          style={{ width: "100%", height: "100%" }}
          useNativeControls={false}
          resizeMode={ResizeMode.CONTAIN} // Ensure we import ResizeMode if needed or use string "contain"
          shouldPlay={true}
          isLooping={false}
          onLoadStart={() => setIsBuffering(true)}
          onLoad={() => {
            setIsLoaded(true);
            setIsBuffering(false);
          }}
          onReadyForDisplay={() => setIsBuffering(false)}
          onPlaybackStatusUpdate={(s) => {
            setStatus(s);
            if (s.isBuffering !== undefined) setIsBuffering(s.isBuffering);
          }}
        />

        {/* Buffering / Loading Indicator Overlay */}
        {(!isLoaded || isBuffering) && (
          <View style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.3)"
          }}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={{ marginTop: 8, color: "#fff", fontWeight: "600" }}>Loading fun...</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Video Controls Overlay */}
      {showControls && (
        <View style={styles.videoControlsOverlay}>
          <View style={styles.videoControlsContainer}>
            {/* Play/Pause Button */}
            <TouchableOpacity
              onPress={handlePlayPause}
              style={styles.controlButton}
            >
              <Ionicons
                name={status.isPlaying ? "pause" : "play"}
                size={32}
                color="#fff"
              />
            </TouchableOpacity>

            {/* Rewind Button */}
            <TouchableOpacity
              onPress={() => handleSeek(-10)}
              style={styles.controlButton}
            >
              <Ionicons name="play-back" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>10s</Text>
            </TouchableOpacity>

            {/* Fast Forward Button */}
            <TouchableOpacity
              onPress={() => handleSeek(10)}
              style={styles.controlButton}
            >
              <Ionicons name="play-forward" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>10s</Text>
            </TouchableOpacity>

            {/* Time Display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
      )}

      <View style={{ padding: 12, position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)" }}>
        {collection && (
          <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="folder" size={14} color="#16A34A" />
            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "700", color: "#16A34A" }}>
              📦 {collection.title}
            </Text>
          </View>
        )}
        <Text style={{ fontWeight: "800", fontSize: 18, color: "#fff" }}>
          {video.title}
        </Text>
        {video.description ? (
          <Text style={{ marginTop: 8, color: "#ddd" }}>{video.description}</Text>
        ) : null}
      </View>
    </View>
  );
};

// Video Item Component for TikTok Feed
const TikTokVideoItem = ({ item, index, playingIndex, onVideoRef, onStatusUpdate, collections }) => {
  const videoRef = useRef(null);
  const [showControls, setShowControls] = useState(false);
  const [status, setStatus] = useState({});
  const controlsTimeout = useRef(null);
  const collection = item.collection ? collections?.[item.collection] : null;

  const [isBuffering, setIsBuffering] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    onVideoRef(index, videoRef.current);
    return () => {
      onVideoRef(index, null);
    };
  }, []);

  useEffect(() => {
    if (showControls) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [showControls, status]);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (status.isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleSeek = async (seconds) => {
    if (videoRef.current && status.positionMillis !== undefined) {
      const newPosition = Math.max(0, Math.min(status.durationMillis || 0, status.positionMillis + seconds * 1000));
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  const formatTime = (millis) => {
    if (!millis) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = status.durationMillis ? (status.positionMillis / status.durationMillis) * 100 : 0;

  return (
    <View style={{ height: height, backgroundColor: "#000", justifyContent: "center" }}>
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        <Video
          ref={videoRef}
          source={{ uri: fixMediaUrl(item.uri || item.video_url) }}
          style={{ width: "100%", height: "100%" }}
          useNativeControls={false}
          resizeMode={ResizeMode.COVER}
          shouldPlay={index === playingIndex}
          isLooping
          onLoadStart={() => setIsBuffering(true)}
          onLoad={() => {
            setIsLoaded(true);
            setIsBuffering(false);
          }}
          onReadyForDisplay={() => setIsBuffering(false)}
          onPlaybackStatusUpdate={(newStatus) => {
            setStatus(newStatus);
            if (newStatus.isBuffering !== undefined) setIsBuffering(newStatus.isBuffering);
            if (onStatusUpdate) onStatusUpdate(index, newStatus);
          }}
        />

        {/* Buffering Indicator */}
        {(!isLoaded || isBuffering) && (index === playingIndex) && (
          <View style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.2)"
          }}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={{ marginTop: 8, color: "#fff", fontWeight: "600", textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 }}>Buffering...</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Video Controls Overlay */}
      {showControls && (
        <View style={styles.videoControlsOverlay}>
          <View style={styles.videoControlsContainer}>
            {/* Play/Pause Button */}
            <TouchableOpacity
              onPress={handlePlayPause}
              style={styles.controlButton}
            >
              <Ionicons
                name={status.isPlaying ? "pause" : "play"}
                size={32}
                color="#fff"
              />
            </TouchableOpacity>

            {/* Rewind Button */}
            <TouchableOpacity
              onPress={() => handleSeek(-10)}
              style={styles.controlButton}
            >
              <Ionicons name="play-back" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>10s</Text>
            </TouchableOpacity>

            {/* Fast Forward Button */}
            <TouchableOpacity
              onPress={() => handleSeek(10)}
              style={styles.controlButton}
            >
              <Ionicons name="play-forward" size={24} color="#fff" />
              <Text style={styles.controlButtonText}>10s</Text>
            </TouchableOpacity>

            {/* Time Display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {formatTime(status.positionMillis)} / {formatTime(status.durationMillis)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
          </View>
        </View>
      )}

      <View style={{
        padding: 16,
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
      }}>
        {collection && (
          <View style={{ marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="folder" size={14} color="#16A34A" />
            <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "700", color: "#16A34A" }}>
              📦 {collection.title}
            </Text>
          </View>
        )}
        <Text style={{ fontWeight: "800", fontSize: 20, color: "#fff", marginBottom: 4 }}>
          {item.title}
        </Text>
        {item.description ? (
          <Text style={{ marginTop: 4, color: "#ddd", fontSize: 14 }}>{item.description}</Text>
        ) : null}
      </View>
    </View>
  );
};


export default function Kids() {
  const { user: contextUser, logout } = useUser();
  const { language, changeLanguage } = useLanguage();
  const router = useRouter();
  const user = contextUser; // Get parent user for updating children list
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState({});
  const [collections, setCollections] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingChild, setLoadingChild] = useState(true);
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState(null);
  // Selected child profile (loaded using child_id)
  const [selectedChild, setSelectedChild] = useState(null);
  // Numeric child ID for backend API calls (separate from UUID)
  const [numericChildId, setNumericChildId] = useState(null);
  // Which top section is active on the page
  const [selectedSection, setSelectedSection] = useState("dashboard");
  // Collection selection for lessons view
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  // "dashboard" | "videos" | "quizzes" | "progress" | "recommended"
  // Inline detail view state (replaces modals)
  // { type: 'video'|'quiz', item: object | id } or null
  const [detail, setDetail] = useState(null);
  const videoRef = useRef(null);
  // Track completed items for progress
  const [progress, setProgress] = useState({
    videosCompleted: [],
    badges: [],
  });
  const [allBadges, setAllBadges] = useState([]);
  const [loadingBadges, setLoadingBadges] = useState(false);
  const [childBadges, setChildBadges] = useState([]);
  const [loadingChildBadges, setLoadingChildBadges] = useState(false);
  const [progressRecords, setProgressRecords] = useState([]);
  const [loadingProgressRecords, setLoadingProgressRecords] = useState(false);

  // Track video watching sessions (entry time and duration)
  const videoSessionStartTime = useRef(null);
  const videoSessionTimer = useRef(null);
  const currentVideoId = useRef(null);

  const [recommendedVideos, setRecommendedVideos] = useState([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Load recommended videos from backend AI API when the selected child changes
  useEffect(() => {
    const loadRecommendedVideos = async () => {
      if (!selectedChild?.id) {
        setRecommendedVideos([]);
        return;
      }
      try {
        setLoadingRecommendations(true);
        // Prioritize numeric ID for AI recommendations (required by backend)
        const targetId = numericChildId || selectedChild.numericId || (typeof selectedChild.id === 'number' ? selectedChild.id : null);

        if (!targetId) {
          console.log("Waiting for numeric child ID before fetching recommendations...");
          return;
        }

        console.log(`Fetching recommendations for child ID: ${targetId}`);

        const data = await recommendationApi.getRecommendations({
          childId: targetId,
        });

        // Normalise incoming objects to the shape used by the UI where possible
        const mapped = (data || []).map((item) => {
          return {
            id: item.id?.toString?.() ?? String(item.id ?? Math.random()),
            title: item.title || item.video_title || i18n.t("untitled"),
            description:
              item.description ||
              item.reason ||
              item.explanation ||
              "",
            // Try common video / thumbnail fields
            video_url:
              item.video_url ||
              item.videoUrl ||
              item.video?.url ||
              item.content_url ||
              null,
            thumbnail:
              item.thumbnail ||
              item.thumbnail_url ||
              item.video?.thumbnail ||
              null,
            collection: item.collection || item.collection_id || null,
            // Preserve the raw item for future use if needed
            _raw: item,
          };
        });

        setRecommendedVideos(mapped);
      } catch (error) {
        console.warn("Error loading AI recommendations:", error);
        setRecommendedVideos([]);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    loadRecommendedVideos();
  }, [selectedChild?.id, numericChildId]);

  // Badge system state
  const [recentBadge, setRecentBadge] = useState(null);
  const badgeAnim = useRef(new Animated.Value(0)).current;

  // Video feed mode
  const [videoFeedMode, setVideoFeedMode] = useState(true);
  const viewableIndex = useRef(0);

  // Show badge with animation
  const showBadge = (badge) => {
    setRecentBadge(badge);
    Animated.timing(badgeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(badgeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setRecentBadge(null));
      }, 3000);
    });
  };

  // TikTokVideoList component for video feed mode with fullscreen support
  const TikTokVideoList = ({ collections }) => {
    const videoRefs = useRef({});
    const [playingIndex, setPlayingIndex] = useState(0);
    const currentPlayingRef = useRef(null);
    const [videoStatuses, setVideoStatuses] = useState({});

    useEffect(() => {
      // Play the first video when entering feed mode
      const timer = setTimeout(() => {
        if (videos.length > 0 && videoRefs.current[0]) {
          videoRefs.current[0].playAsync().then(() => {
            currentPlayingRef.current = videoRefs.current[0];
          }).catch(console.warn);
        }
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    const handleViewableItemsChanged = useRef(({ viewableItems }) => {
      if (viewableItems.length > 0) {
        const newIndex = viewableItems[0].index;
        setPlayingIndex(newIndex);
        viewableIndex.current = newIndex;

        // Pause currently playing video
        if (currentPlayingRef.current) {
          currentPlayingRef.current.pauseAsync().catch(console.warn);
        }

        // Play the visible video
        if (videoRefs.current[newIndex]) {
          videoRefs.current[newIndex].playAsync().then(() => {
            currentPlayingRef.current = videoRefs.current[newIndex];
          }).catch(console.warn);
        }
      }
    }).current;

    const handleVideoRef = (index, ref) => {
      if (ref) {
        videoRefs.current[index] = ref;
      } else {
        delete videoRefs.current[index];
      }
    };

    const updateVideoStatus = (index, status) => {
      setVideoStatuses(prev => ({
        ...prev,
        [index]: status,
      }));
    };

    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <View style={{ position: "absolute", top: 40, left: 12, zIndex: 10 }}>
          <TouchableOpacity
            onPress={() => {
              // Pause currently playing video before exiting
              if (currentPlayingRef.current) {
                currentPlayingRef.current.pauseAsync().catch(console.warn);
              }
              setVideoFeedMode(false);
            }}
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: 8,
              borderRadius: 20,
            }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={videos}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <TikTokVideoItem
              item={item}
              index={index}
              playingIndex={playingIndex}
              onVideoRef={handleVideoRef}
              onStatusUpdate={updateVideoStatus}
              collections={collections}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={height}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={handleViewableItemsChanged}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
          }}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          getItemLayout={(data, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
        />
      </View>
    );
  };

  // Check for new badge (dynamic emoji/label)
  const checkForNewBadge = (type) => {
    let badge = null;
    const videoCount = progress.videosCompleted.length;

    if (type === "video") {
      if (videoCount === 1) badge = "🎬 First Video";
      else if (videoCount === 3) badge = "🎬 Video Explorer";
      else if (videoCount === 5) badge = "🏆 Video Master";
    }

    if (type === "quiz") {
      Object.values(quizzes).forEach(q => {
        if (q.results?.length > 0) {
          const score = q.results[0].score;
          if (score >= 80) badge = "🧠 Quiz Star";
        }
      });
    }

    if (badge) {
      // Persist badge in progress state (per child), avoiding duplicates
      setProgress((prev) => {
        const existing = prev.badges || [];
        if (existing.includes(badge)) {
          return prev;
        }
        return {
          ...prev,
          badges: [...existing, badge],
        };
      });

      // Show animated popup for the newly earned badge
      showBadge(badge);
    }
  };

  // Save progress to student progress storage (using child_id)
  const saveStudentProgress = async () => {
    try {
      if (!selectedChild?.id) {
        console.warn("No child selected, cannot save progress");
        return;
      }

      const childId = selectedChild.id;
      const childName = selectedChild.nickname || i18n.t('unknownStudent');

      // Progress is now tracked via backend API in real-time:
      // - Video progress: tracked via lessonsApi.trackLessonProgress()
      // - Quiz progress: tracked via quizApi.submitQuizAttempt()
      // - Badges: tracked via progressApi (child-badges endpoint)

      // Keep local storage as fallback/cache
      const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
      const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};

      if (!studentProgress[childId]) {
        studentProgress[childId] = {
          name: childName,
          videosCompleted: [],
          videoWatchingDetails: [],
          quizResults: [],
          badges: [],
        };
      }

      studentProgress[childId].videosCompleted = progress.videosCompleted;
      studentProgress[childId].name = childName;
      studentProgress[childId].badges = progress.badges || [];

      if (!studentProgress[childId].videoWatchingDetails) {
        studentProgress[childId].videoWatchingDetails = [];
      }

      await AsyncStorage.setItem(STORAGE.STUDENT_PROGRESS, JSON.stringify(studentProgress));
    } catch (e) {
      console.warn("Failed to save student progress:", e);
    }
  };

  // Save progress whenever it changes
  useEffect(() => {
    saveStudentProgress();
  }, [progress.videosCompleted.length, progress.badges?.length]);

  // Function to save video watching session (using numeric child_id)
  const saveVideoWatchingSession = useCallback(async (videoId, entryTime, durationMs) => {
    try {
      if (!numericChildId) {
        console.warn("No numeric child ID available, cannot save video session");
        return;
      }

      // Use numericChildId for backend API calls (backend expects numeric ID, not UUID)
      const childId = numericChildId;

      // Track progress via backend API
      try {
        const targetId = numericChildId || selectedChild.numericId || (typeof selectedChild.id === 'number' ? selectedChild.id : null);
        await lessonsApi.trackLessonProgress(videoId, {
          child: targetId || childId,
          child_id: targetId || childId,
          entry_time: entryTime,
          duration_ms: durationMs,
          status: "in-progress", // or "completed" if video finished
        });
      } catch (apiError) {
        console.warn("Failed to save video session to backend:", apiError);
        // Fallback to local storage
        const childName = selectedChild.nickname || i18n.t('unknownStudent');
        const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
        const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};

        if (!studentProgress[childId]) {
          studentProgress[childId] = {
            name: childName,
            videosCompleted: [],
            videoWatchingDetails: [],
            quizResults: [],
          };
        }

        if (!studentProgress[childId].videoWatchingDetails) {
          studentProgress[childId].videoWatchingDetails = [];
        }

        const existingEntry = studentProgress[childId].videoWatchingDetails.find(
          (entry) => entry.videoId === videoId
        );

        if (existingEntry) {
          existingEntry.totalDurationMs = (existingEntry.totalDurationMs || 0) + durationMs;
          if (!existingEntry.entryTime) {
            existingEntry.entryTime = entryTime;
          }
        } else {
          studentProgress[childId].videoWatchingDetails.push({
            videoId,
            entryTime,
            totalDurationMs: durationMs,
          });
        }

        await AsyncStorage.setItem(STORAGE.STUDENT_PROGRESS, JSON.stringify(studentProgress));
      }
    } catch (e) {
      console.warn("Failed to save video watching session:", e);
    }
  }, [numericChildId, selectedChild?.id]);

  // Cleanup video session when detail changes or component unmounts
  useEffect(() => {
    return () => {
      // When detail changes or component unmounts, save the session if video was open
      if (videoSessionStartTime.current && currentVideoId.current) {
        const durationMs = Date.now() - videoSessionStartTime.current;
        const entryTime = new Date(videoSessionStartTime.current).toISOString();

        // Clear timer
        if (videoSessionTimer.current) {
          clearInterval(videoSessionTimer.current);
          videoSessionTimer.current = null;
        }

        // Save the session asynchronously
        saveVideoWatchingSession(currentVideoId.current, entryTime, durationMs).catch(console.warn);

        // Reset start time and video ID
        videoSessionStartTime.current = null;
        currentVideoId.current = null;
      }
    };
  }, [detail, saveVideoWatchingSession]);

  // Quiz-taking state when viewing a quiz detail
  const [quizState, setQuizState] = useState(null);
  // Load profile function (accessible from anywhere)
  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE.PROFILE);
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
      console.warn("Error loading profile:", e);
      setProfile(null);
    }
  };

  // Load selected child profile using child_id
  const loadSelectedChild = async () => {
    try {
      // Give a small delay to ensure AsyncStorage write is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const stored = await AsyncStorage.getItem("@selected_child");
      if (stored) {
        try {
          const childData = JSON.parse(stored);

          // Validate child data has required fields
          // Normalize: check for both id and uuid fields
          const childId = childData.id || childData.uuid;
          if (!childData || !childId) {
            console.warn("Invalid child data in storage - missing ID/UUID");
            setLoadingChild(false);
            // Don't redirect - just show error state
            return;
          }

          // Extract numeric ID if available (stored separately from UUID)
          // Extract numeric ID if available
          const initialNid = parseInt(childData.numericId || childData.id);
          if (!isNaN(initialNid)) {
            setNumericChildId(initialNid);
          }

          // Ensure id field exists (normalize uuid to id for frontend logic)
          if (!childData.id && childData.uuid) {
            childData.id = childData.uuid;
          }

          // Validate that the child belongs to the current logged-in parent
          // Check backend API first, then fallback to old storage format
          if (user?.id) {
            let isOwned = false;

            // Try to validate via backend API first
            try {
              const parentChildren = await profilesApi.getChildren({ parent: user.id });
              const childrenList = Array.isArray(parentChildren)
                ? parentChildren
                : (parentChildren?.results || parentChildren?.data || []);

              // Normalize children IDs (backend might use uuid)
              // Find matching child to extract numeric ID
              const matchingChild = childrenList.find(c => {
                const childId = c.id || c.uuid;
                return childId === childData.id || childId === childData.uuid ||
                  (c.uuid && c.uuid === childData.uuid) ||
                  (c.uuid && c.uuid === childData.id);
              });

              if (matchingChild) {
                // Extract numeric ID (if it's a number) separately from UUID
                // Backend returns both 'id' (numeric) and 'uuid' (string)
                if (typeof matchingChild.id === 'number') {
                  setNumericChildId(matchingChild.id);
                  // Update childData to preserve both numeric ID and UUID
                  childData.numericId = matchingChild.id;
                  if (matchingChild.uuid && !childData.uuid) {
                    childData.uuid = matchingChild.uuid;
                  }
                }
              }

              isOwned = !!matchingChild;
            } catch (apiError) {
              console.warn("Failed to validate child via backend API, trying fallback:", apiError);

              // Fallback to old storage format for backward compatibility
              const storedChildren = await AsyncStorage.getItem("@app_children_v1");
              if (storedChildren) {
                const allChildren = JSON.parse(storedChildren);
                const parentChildren = allChildren[user.id] || [];
                isOwned = parentChildren.some(c => c.id === childData.id);
              }
            }

            // If validation fails, still allow navigation but log a warning
            // This is more permissive to handle edge cases during migration
            if (!isOwned) {
              console.warn("Selected child validation failed, but allowing navigation");
              // Don't block navigation - just log the warning
            }
          } else {
            // No user logged in, clear selection
            console.warn("No user logged in");
            await AsyncStorage.removeItem("@selected_child");
            setSelectedChild(null);
            setNumericChildId(null);
            setLoadingChild(false);
            return;
          }

          let finalChild = childData;

          // Normalize child data: ensure id field exists (map uuid to id if needed)
          if (finalChild.uuid && !finalChild.id) {
            finalChild.id = finalChild.uuid;
          }
          if (finalChild.learning_level && !finalChild.learningLevel) {
            finalChild.learningLevel = finalChild.learning_level.toUpperCase();
          }
          if (finalChild.parent_phone && !finalChild.parentPhone) {
            finalChild.parentPhone = finalChild.parent_phone;
          }
          if (finalChild.avatar_url && !finalChild.avatarUrl) {
            finalChild.avatarUrl = finalChild.avatar_url;
          }

          // Refresh child info from backend when possible
          // Fetch full children list to get numeric ID
          try {
            const childId = finalChild.id || finalChild.uuid;
            if (childId) {
              // Fetch children list to get numeric ID (backend detail endpoint may use UUID)
              const childrenResponse = await api.get('profiles/children/');
              const childrenList = Array.isArray(childrenResponse.data)
                ? childrenResponse.data
                : (childrenResponse.data?.results || childrenResponse.data?.data || []);

              // Find the matching child to extract numeric ID
              const matchingChild = childrenList.find(c => {
                return (c.uuid === childId || c.uuid === finalChild.uuid) ||
                  (c.id === childId || (typeof c.id === 'number' && String(c.id) === childId));
              });

              if (matchingChild) {
                // Extract numeric ID separately from UUID
                const matchingId = parseInt(matchingChild.id);
                if (!isNaN(matchingId)) {
                  setNumericChildId(matchingId);
                  finalChild.numericId = matchingId;
                }

                // Normalize the fresh child data
                if (matchingChild.uuid && !finalChild.uuid) {
                  finalChild.uuid = matchingChild.uuid;
                }
                if (!finalChild.id && finalChild.uuid) {
                  finalChild.id = finalChild.uuid; // Keep id as UUID for frontend logic
                }
                if (matchingChild.learning_level && !finalChild.learning_level) {
                  finalChild.learning_level = matchingChild.learning_level;
                }
                if (matchingChild.learning_level && !finalChild.learningLevel) {
                  finalChild.learningLevel = matchingChild.learning_level.toUpperCase();
                }
                if (matchingChild.parent_phone && !finalChild.parentPhone) {
                  finalChild.parentPhone = matchingChild.parent_phone;
                }
                if (matchingChild.avatar_url && !finalChild.avatarUrl) {
                  finalChild.avatarUrl = matchingChild.avatar_url;
                }

                // Update with fresh data while preserving both UUID and numeric ID
                await AsyncStorage.setItem("@selected_child", JSON.stringify(finalChild));
              }
            }
          } catch (refreshErr) {
            console.warn("Failed to refresh child from profiles API:", refreshErr);
            // Continue with stored child data if refresh fails
          }

          setSelectedChild(finalChild);

          // Ensure numericChildId is set if available in finalChild
          if (finalChild.numericId && typeof finalChild.numericId === 'number') {
            setNumericChildId(finalChild.numericId);
          }

          // Use child_id to load child-specific progress
          const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
          const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};
          const childProgress = studentProgress[finalChild.id] || {
            videosCompleted: [],
            videoWatchingDetails: [],
            quizResults: [],
            badges: [],
          };

          // Update progress state with child-specific data
          setProgress({
            videosCompleted: childProgress.videosCompleted || [],
            badges: childProgress.badges || [],
          });

          setLoadingChild(false); // Child profile loaded
          console.log("Child profile loaded successfully:", childData.nickname);
        } catch (parseError) {
          console.warn("Failed to parse child data:", parseError);
          setLoadingChild(false);
          // Don't redirect - just show error state
        }
      } else {
        // No child selected
        console.warn("No child selected in storage");
        setLoadingChild(false);
        // Don't redirect - stay on kids dashboard and show message
      }
    } catch (e) {
      console.warn("Failed to load selected child:", e);
      setLoadingChild(false);
      // Don't redirect - stay on kids dashboard and show error state
    }
  };

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Basic health check to ensure Core API connectivity
  useEffect(() => {
    coreApi.getHealth().catch((err) => console.warn("Core health check failed:", err));
  }, []);

  // Load selected child on mount (app switches to kid mode)
  useEffect(() => {
    loadSelectedChild();
  }, []);

  // Load all badges from backend once (for display in Progress section)
  useEffect(() => {
    const loadBadges = async () => {
      try {
        setLoadingBadges(true);
        const data = await progressApi.getBadges();
        // Expecting fields: id, name, description, created_at
        const mapped =
          Array.isArray(data) ?
            data.map((b) => ({
              id: b.id,
              name: b.name,
              description: b.description,
              created_at: b.created_at,
            })) : [];
        setAllBadges(mapped);
      } catch (e) {
        console.warn("Failed to load badges from backend:", e);
        setAllBadges([]);
      } finally {
        setLoadingBadges(false);
      }
    };

    loadBadges();
  }, []);

  // Load child badges from backend when selected child changes
  useEffect(() => {
    const loadChildBadges = async () => {
      if (!selectedChild?.id) {
        setChildBadges([]);
        return;
      }

      try {
        setLoadingChildBadges(true);
        const targetId = numericChildId || selectedChild.numericId || (typeof selectedChild.id === 'number' ? selectedChild.id : null);
        const data = await progressApi.getChildBadges({ child: targetId || selectedChild.id });
        // Expecting fields: id, child, child_nickname, badge, badge_name, awarded_at
        const mapped = Array.isArray(data)
          ? data
            .filter((cb) => cb.child === selectedChild.id || cb.child === parseInt(selectedChild.id))
            .map((cb) => ({
              id: cb.id,
              child: cb.child,
              child_nickname: cb.child_nickname,
              badge: cb.badge,
              badge_name: cb.badge_name,
              awarded_at: cb.awarded_at,
            }))
          : [];
        setChildBadges(mapped);
      } catch (e) {
        console.warn("Failed to load child badges from backend:", e);
        setChildBadges([]);
      } finally {
        setLoadingChildBadges(false);
      }
    };

    loadChildBadges();
  }, [selectedChild?.id, numericChildId]);

  // Load per-lesson progress records from backend when selected child changes
  useEffect(() => {
    const loadProgressRecords = async () => {
      if (!selectedChild?.id) {
        setProgressRecords([]);
        return;
      }

      try {
        setLoadingProgressRecords(true);
        const targetId = numericChildId || selectedChild.numericId || (typeof selectedChild.id === 'number' ? selectedChild.id : null);
        const data = await progressApi.getProgress({ child: targetId || selectedChild.id });
        // Expecting fields:
        // id, child, child_nickname, lesson, lesson_title, lesson_slug,
        // status, points_earned, last_accessed, completion_date
        const mapped = Array.isArray(data)
          ? data
            .filter((p) => p.child === selectedChild.id || p.child === parseInt(selectedChild.id))
            .map((p) => ({
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
  }, [selectedChild?.id, numericChildId]);

  // Load content function (videos/collections from backend lessons API, with AsyncStorage fallback)
  const loadContent = async () => {
    try {
      const [backendCollectionsRaw, backendLessonsRaw, backendQuizzes] = await Promise.all([
        lessonsApi.getCollections().catch(() => null),
        lessonsApi.getLessons().catch(() => null),
        quizApi.getQuizzes().catch(() => ({})), // Fallback to empty object if API fails
      ]);

      // ---------- Collections ----------
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

      // ---------- Videos / Lessons ----------
      if (backendLessonsRaw) {
        const lessonArray = Array.isArray(backendLessonsRaw)
          ? backendLessonsRaw
          : backendLessonsRaw.results || [];

        const mappedVideos = lessonArray.map((lesson) => ({
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
        }));

        setVideos(mappedVideos);
        await AsyncStorage.setItem(STORAGE.VIDEOS, JSON.stringify(mappedVideos));
      } else {
        const rawVideos = await AsyncStorage.getItem(STORAGE.VIDEOS);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
      }

      setQuizzes(backendQuizzes || {});
    } catch (e) {
      console.warn("Failed to load content", e);
      // Fallback entirely to AsyncStorage
      try {
        const [rawVideos, rawCollections, rawQuizzes] = await Promise.all([
          AsyncStorage.getItem(STORAGE.VIDEOS),
          AsyncStorage.getItem(STORAGE.COLLECTIONS),
          AsyncStorage.getItem(STORAGE.QUIZZES),
        ]);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
        setCollections(rawCollections ? JSON.parse(rawCollections) : {});
        setQuizzes(rawQuizzes ? JSON.parse(rawQuizzes) : {});
      } catch (err) {
        console.warn("Failed to load content from AsyncStorage:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load content on mount
  useEffect(() => {
    loadContent();
  }, []);

  // Reload content when screen comes into focus (to get newly created quizzes)
  useFocusEffect(
    useCallback(() => {
      loadContent();
    }, [])
  );



  // Render collection card - Grid Layout
  const renderCollectionCard = (collection) => {
    // Count lessons in this collection
    const lessonCount = videos.filter(v => v.collection === collection.id).length;

    return (
      <AnimatedPressable
        key={collection.id}
        style={{ width: "48%", marginBottom: 16 }}
        onPress={() => {
          // Set selected collection to show videos in that collection
          setSelectedCollectionId(collection.id);
        }}
      >
        <View style={styles.collectionCard}>
          <View style={styles.collectionIconContainer}>
            <Ionicons name="folder" size={48} color="#FBBF24" />
          </View>

          <Text style={styles.collectionTitle} numberOfLines={1}>
            {collection.title}
          </Text>

          <Text style={styles.collectionSubtitle}>
            {lessonCount} {lessonCount === 1 ? i18n.t('lesson') : i18n.t('lessons')}
          </Text>
        </View>
      </AnimatedPressable>
    );
  };

  // Pick profile photo directly from dashboard - updates child's avatar in parent's children list
  const pickProfilePhoto = async () => {
    try {
      if (!selectedChild || !selectedChild.id) {
        Alert.alert(i18n.t('error'), "No child selected");
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

        // Update the selected child's avatar
        // Preserve numericId when updating
        const updatedChild = {
          ...selectedChild,
          avatarUrl: uri,
          // Preserve numericId if it exists
          ...(numericChildId && { numericId: numericChildId }),
        };

        // Update in parent's children list (STORAGE.CHILDREN)
        try {
          if (user?.id) {
            const stored = await AsyncStorage.getItem("@app_children_v1");
            let allChildren = stored ? JSON.parse(stored) : {};
            const parentChildren = allChildren[user.id] || [];

            // Update the child in the parent's children list
            const updatedChildren = parentChildren.map((child) =>
              child.id === selectedChild.id ? updatedChild : child
            );

            allChildren[user.id] = updatedChildren;
            await AsyncStorage.setItem("@app_children_v1", JSON.stringify(allChildren));
          }
        } catch (updateError) {
          console.warn("Failed to update child in parent's list:", updateError);
        }

        // Update the selected_child storage (preserves both UUID and numericId)
        await AsyncStorage.setItem("@selected_child", JSON.stringify(updatedChild));

        // Update local state (numericChildId should already be set, but ensure it's preserved)
        setSelectedChild(updatedChild);

        Alert.alert(i18n.t('success'), i18n.t('profilePictureUpdated'));
      }
    } catch (e) {
      console.log(e);
      Alert.alert(i18n.t('error'), i18n.t('failedToUpdateProfilePicture'));
    }
  };
  // Search helpers
  const normalize = (s = "") => s.toLowerCase().trim();
  const filterVideos = (q) =>
    videos.filter(
      (v) =>
        normalize(v.title).includes(q) || normalize(v.description).includes(q)
    );
  const filterQuizzes = (q) =>
    Object.entries(quizzes)
      .filter(
        ([key, qObj]) =>
          normalize(key).includes(q) || normalize(qObj.title).includes(q)
      )
      .map(([id, quiz]) => ({ id, ...quiz }));
  const q = normalize(search);
  const results = {
    videos: q ? filterVideos(q) : videos,
    quizzes: q
      ? filterQuizzes(q)
      : Object.entries(quizzes).map(([id, quiz]) => ({ id, ...quiz })),
  };
  // === Inline open item functions (no modal) ===
  const openVideoInline = (video) => {
    // Save previous session if any
    if (videoSessionStartTime.current && currentVideoId.current) {
      const durationMs = Date.now() - videoSessionStartTime.current;
      const entryTime = new Date(videoSessionStartTime.current).toISOString();
      saveVideoWatchingSession(currentVideoId.current, entryTime, durationMs).catch(console.warn);
    }

    // Track entry time for new video
    videoSessionStartTime.current = Date.now();
    currentVideoId.current = video.id;

    setDetail({ type: "video", item: video });

    // Start tracking time spent watching
    videoSessionTimer.current = setInterval(() => {
      // This will be used to update the duration periodically
    }, 1000);

    // Mark watched locally
    setProgress((prev) => {
      const updated = {
        ...prev,
        videosCompleted: prev.videosCompleted.includes(video.id)
          ? prev.videosCompleted
          : [...prev.videosCompleted, video.id],
      };
      checkForNewBadge("video");
      return updated;
    });

    const targetId = numericChildId || selectedChild.numericId || (typeof selectedChild.id === 'number' ? selectedChild.id : null);
    /* 
    // Disabled as per user request to avoid 404 errors
    if (video.id && targetId) {
      lessonsApi
        .trackLessonProgress(video.id, { child: targetId, child_id: targetId })
        .catch((err) => console.warn("Failed to track lesson progress:", err));
    } 
    */
  };

  const openQuizInline = (quizId) => {
    const quiz = quizzes[quizId];
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      Alert.alert(i18n.t('noQuestions'), i18n.t('quizHasNoQuestions'));
      return;
    }
    // prepare quizState for taking it
    setQuizState({
      quizId,
      idx: 0,
      answers: Array(quiz.questions.length).fill(null),
      finished: false,
      score: null,
      startTime: Date.now(),
    });
    setDetail({ type: "quiz", item: quizId });
  };
  // Choose quiz option (works with inline quizState)
  const chooseOption = (questionIdx, optIdx) => {
    setQuizState((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, answers: [...prev.answers] };
      updated.answers[questionIdx] = optIdx;
      return updated;
    });
  };
  // Submit quiz and persist results
  const submitQuiz = async (quizId, answers) => {
    if (!quizId || !answers) return;
    const quiz = quizzes[quizId];
    if (!quiz || !quiz.questions) return;

    let correct = 0;
    quiz.questions.forEach((q, i) => {
      const questionCorrectIndex = q.answerIndex !== undefined ? q.answerIndex : q.correct_option_index;
      if (answers[i] === questionCorrectIndex) correct++;
    });
    const score = Math.round((correct / quiz.questions.length) * 100);

    if (!selectedChild?.id) {
      Alert.alert(i18n.t('error'), "No child selected");
      return;
    }

    const childName = selectedChild.nickname || i18n.t('unknownStudent');
    const childUUID = selectedChild.uuid || selectedChild.id;

    try {
      // Calculate duration
      const durationSeconds = quizState?.startTime
        ? Math.floor((Date.now() - quizState.startTime) / 1000)
        : 60;

      // Ensure we have a numeric ID (Integer) for the backend
      const rawChildId = numericChildId || selectedChild?.numericId || selectedChild?.id;
      const childInt = parseInt(rawChildId);

      if (isNaN(childInt)) {
        console.error("CRITICAL: Failed to determine numeric child ID", { rawChildId, selectedChild });
        Alert.alert(i18n.t('error'), "Account error: Numeric child ID not found. Please re-select your profile.");
        return;
      }

      // Format answers for the specific backend Scoring Logic:
      // answers: [{ "question_id": int, "selected_indices": [int] }]
      const backendAnswers = [];
      quiz.questions.forEach((q, i) => {
        if (answers[i] !== null && answers[i] !== undefined) {
          backendAnswers.push({
            question_id: parseInt(q.id),
            selected_indices: [parseInt(answers[i])] // Even single choice must be a list
          });
        }
      });

      const attemptData = {
        child_id: childUUID, // Reverting to UUID as Integer ID returned "child not found"
        quiz_id: parseInt(quizId),
        answers: backendAnswers,
        duration_seconds: durationSeconds,
      };

      console.log("Submitting To Backend:", JSON.stringify(attemptData, null, 2));
      const submittedAttempt = await quizApi.submitQuizAttempt(attemptData);

      // Local success logic
      const updated = { ...quizzes };
      const item = updated[quizId] || { ...quiz };
      item.results = item.results || [];
      item.results.unshift({
        score,
        date: new Date().toISOString(),
        childId: childUUID,
        childName,
        attemptId: submittedAttempt?.id,
      });
      updated[quizId] = item;

      // Update student progress in AsyncStorage
      const rawProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
      const studentProgress = rawProgress ? JSON.parse(rawProgress) : {};

      if (!studentProgress[childUUID]) {
        studentProgress[childUUID] = {
          name: childName,
          videosCompleted: [],
          quizResults: [],
        };
      }

      const existingRecordIndex = studentProgress[childUUID].quizResults.findIndex(r => r.quizId === quizId);
      const resultEntry = {
        quizId,
        quizTitle: quiz.title,
        score,
        date: new Date().toISOString(),
        attemptId: submittedAttempt?.id,
      };

      if (existingRecordIndex > -1) {
        studentProgress[childUUID].quizResults[existingRecordIndex] = resultEntry;
      } else {
        studentProgress[childUUID].quizResults.push(resultEntry);
      }

      // Sync local state
      await AsyncStorage.setItem(STORAGE.STUDENT_PROGRESS, JSON.stringify(studentProgress));
      await AsyncStorage.setItem(STORAGE.QUIZZES, JSON.stringify(updated));
      setQuizzes(updated);
      setQuizState((prev) => (prev ? { ...prev, finished: true, score } : prev));
      checkForNewBadge("quiz");

      Alert.alert(i18n.t('quizCompleted'), `${i18n.t('yourScore')}: ${score}%`);
    } catch (error) {
      console.warn("Quiz Submission Error:", error);
      const backendError = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      Alert.alert(i18n.t('error'), "Backend submission failed: " + backendError);

      // Fallback: Save locally if backend fails
      try {
        const updated = { ...quizzes };
        const item = updated[quizId] || { ...quiz };
        item.results = item.results || [];
        item.results.unshift({
          score,
          date: new Date().toISOString(),
          childId: childUUID,
          childName,
        });
        updated[quizId] = item;
        setQuizzes(updated);
        await AsyncStorage.setItem(STORAGE.QUIZZES, JSON.stringify(updated));
      } catch (localErr) {
        console.warn("Storage fallback failed:", localErr);
      }
    }
  };

  // Render item card: opens inline detail now
  const renderCard = (item, type) => {
    const collection = item.collection ? collections[item.collection] : null;
    const isVideo = type === "videos";

    return (
      <AnimatedPressable
        key={item.id}
        style={{ marginTop: 16 }}
        onPress={() => {
          if (type === "videos") openVideoInline(item);
          if (type === "quizzes") openQuizInline(item.id);
        }}
      >
        <View style={[styles.itemCard, { padding: 0, overflow: "hidden" }]}>
          {/* Thumbnail Section for Videos */}
          {isVideo && (
            <View style={{ height: 180, width: "100%", backgroundColor: "#000", position: "relative" }}>
              {item.thumbnail ? (
                <Image
                  source={{ uri: fixMediaUrl(item.thumbnail) }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1E293B" }}>
                  <Ionicons name="film" size={48} color="#475569" />
                </View>
              )}
              {/* Play Overlay */}
              <View style={{
                position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "rgba(0,0,0,0.3)",
                alignItems: "center", justifyContent: "center"
              }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  alignItems: "center", justifyContent: "center",
                  elevation: 4, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
                }}>
                  <Ionicons name="play" size={32} color="#38BDF8" style={{ marginLeft: 4 }} />
                </View>
              </View>

              {/* Duration Badge if available */}
              {item.duration_seconds && (
                <View style={{
                  position: "absolute", bottom: 12, right: 12,
                  backgroundColor: "rgba(0,0,0,0.7)",
                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6
                }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>
                    {Math.floor(item.duration_seconds / 60)}:{String(item.duration_seconds % 60).padStart(2, '0')}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ padding: 16 }}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { fontSize: 18 }]}>
                {!isVideo && (type === "quizzes" ? "❓ " : "📄 ")}
                {item.title}
              </Text>
              {!isVideo && (
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>
                    {type}
                  </Text>
                </View>
              )}
            </View>

            {item.description ? (
              <Text style={[styles.cardDesc, { marginTop: 8 }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}

            {collection && (
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", padding: 8, backgroundColor: "#F0FDF4", borderRadius: 8, alignSelf: "flex-start" }}>
                <Ionicons name="folder" size={14} color="#16A34A" />
                <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "600", color: "#16A34A" }}>
                  {collection.title}
                </Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  // Render recommended video card with thumbnail
  const renderRecommendedVideoCard = (video) => {
    const isWatched = progress.videosCompleted.includes(video.id);
    const collection = video.collection ? collections[video.collection] : null;

    return (
      <AnimatedPressable
        key={video.id}
        style={{ width: "48%", marginBottom: 16 }}
        onPress={() => {
          // Open video in fullscreen
          openVideoInline(video);
        }}
      >
        <View style={styles.recommendedCard}>
          {/* Video Thumbnail */}
          <View style={styles.thumbnailContainer}>
            {/* AI badge */}
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color="#fff" />
              <Text style={styles.aiBadgeText}>{i18n.t('aiRecommended') || "AI"}</Text>
            </View>
            {video.thumbnail ? (
              <Image source={{ uri: fixMediaUrl(video.thumbnail) }} style={styles.thumbnail} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                <Ionicons name="play-circle" size={40} color="#fff" />
              </View>
            )}
            {/* Play overlay */}
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Ionicons name="play" size={20} color="#fff" />
              </View>
            </View>
            {/* Watched badge */}
            {isWatched && (
              <View style={styles.watchedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4c1d95" />
              </View>
            )}
            {/* Collection badge */}
            {collection && (
              <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "rgba(22, 163, 74, 0.9)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="folder" size={12} color="#fff" />
                <Text style={{ marginLeft: 4, fontSize: 10, fontWeight: "700", color: "#fff" }}>
                  {collection.title}
                </Text>
              </View>
            )}
          </View>

          {/* Video Info */}
          <View style={styles.recommendedCardContent}>
            <Text style={styles.recommendedCardTitle} numberOfLines={2}>
              {video.title}
            </Text>
            {video.description && (
              <Text style={styles.recommendedCardDesc} numberOfLines={2}>
                {video.description}
              </Text>
            )}
            {collection && (
              <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="folder" size={14} color="#16A34A" />
                <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: "600", color: "#16A34A" }}>
                  {collection.title}
                </Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    );
  };

  // Card component for dashboard grid - Kid-friendly design with vibrant colors
  const DashboardCard = ({ title, subtitle, emoji, onPress, colorScheme }) => {
    const colors = colorScheme || {
      bg: "#FFE5F1",
      border: "#FF6B9D",
      shadow: "#FF1493",
    };

    return (
      <AnimatedPressable onPress={onPress} style={{
        width: isTablet ? "48%" : width < 400 ? "49%" : "48%",
        flexShrink: 1,
      }}>
        <View style={[
          styles.dashboardCard,
          {
            padding: isTablet ? 24 : isSmallScreen ? 16 : 20,
            minHeight: isTablet ? 160 : isSmallScreen ? 130 : 140,
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: 4,
          }
        ]}>
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Large emoji icon with bounce effect */}
            <Text style={{ fontSize: isTablet ? 72 : isSmallScreen ? 56 : 64, marginBottom: 12 }}>
              {emoji}
            </Text>
            {/* Simple title only */}
            <Text style={[
              styles.dashboardCardTitle,
              {
                fontSize: isTablet ? 22 : isSmallScreen ? 18 : 20,
                textAlign: "center",
                color: "#1E293B",
              }
            ]}>
              {title}
            </Text>
          </View>
        </View>
      </AnimatedPressable>
    );
  };
  // When loading content or child profile
  if (loading || loadingChild) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        {/* testID added to support comprehensive dashboard tests */}
        <ActivityIndicator testID="loading-indicator" size="large" color="#4c1d95" />
        <Text style={{ marginTop: 10, color: "#000" }}>
          {loadingChild ? "Loading child profile..." : i18n.t("loading")}
        </Text>
      </SafeAreaView>
    );
  }

  // Validate user is a parent and has selected a child
  // If user is not a parent, or no child selected, show error page
  if (!user || user.role !== "parent" || !selectedChild) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={80} color="#999" />
          <Text style={styles.errorTitle}>
            Route is not found
          </Text>
          <Text style={styles.errorMessage}>
            The route you are trying to access is not found. Please log in again.
          </Text>
          <Text style={styles.errorInstruction}>
            You can use the back button or logout to return to the parent dashboard.
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={styles.errorBackButton}
              onPress={() => {
                try {
                  router.back();
                } catch (e) {
                  router.replace("/dashboard/parent");
                }
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#10B981" />
              <Text style={styles.errorBackButtonText}>Back</Text>
            </TouchableOpacity>
            {logout && (
              <TouchableOpacity
                style={styles.errorLogoutButton}
                onPress={async () => {
                  try {
                    await AsyncStorage.multiRemove([
                      "user",
                      "role",
                      "@selected_child",
                    ]);
                    if (logout) {
                      await logout();
                    }
                    router.replace("/(drawer)/login");
                  } catch (e) {
                    console.warn("Logout error:", e);
                    router.replace("/(drawer)/login");
                  }
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.errorLogoutButtonText}>Logout</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Video feed mode
  if (videoFeedMode) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <TikTokVideoList collections={collections} />
      </View>
    );
  }
  // Search visibility: show for dashboard, videos, quizzes.
  const showSearch =
    selectedSection === "dashboard" ||
    selectedSection === "videos" ||
    selectedSection === "quizzes";
  return (
    <SafeAreaView style={styles.container}>
      {/* Badge Popup */}
      {recentBadge && (
        <Animated.View
          style={[
            styles.badgePopup,
            {
              opacity: badgeAnim,
              transform: [
                {
                  translateY: badgeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.badgePopupText}>{recentBadge}</Text>
        </Animated.View>
      )}
      {/* Floating Action Buttons */}
      <View style={styles.floatingActions}>
        {/* Back Button */}
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/dashboard/parent");
            }
          }}
          style={styles.floatingBackButton}
          accessibilityLabel="Go back"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Search Bar - Before language button */}
        {showSearch && !detail && (
          <View style={styles.floatingSearchBoxInline}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              placeholder={i18n.t('searchVideosQuizzes')}
              style={styles.floatingSearchInputInline}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              placeholderTextColor="#94A3B8"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Language and Avatar */}
        <View style={styles.floatingActionButtons}>
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
            <Ionicons name="language" size={22} color="#38BDF8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={pickProfilePhoto}
            accessibilityLabel={i18n.t('changeProfilePicture')}
            style={styles.floatingProfileButton}
            activeOpacity={0.8}
          >
            {selectedChild?.avatarUrl && selectedChild.avatarUrl.trim() !== "" ? (
              <Image source={{ uri: selectedChild.avatarUrl }} style={styles.floatingProfileAvatar} />
            ) : (
              <View style={styles.floatingProfileAvatarPlaceholder}>
                <Ionicons name="person" size={22} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      {/* Fullscreen Modal for detail view and dashboard sections */}
      <Modal
        visible={!!detail}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={async () => {
          if (detail?.type === "video" && videoSessionStartTime.current && currentVideoId.current) {
            const durationMs = Date.now() - videoSessionStartTime.current;
            const entryTime = new Date(videoSessionStartTime.current).toISOString();

            if (videoSessionTimer.current) {
              clearInterval(videoSessionTimer.current);
              videoSessionTimer.current = null;
            }

            await saveVideoWatchingSession(currentVideoId.current, entryTime, durationMs);
            videoSessionStartTime.current = null;
            currentVideoId.current = null;
          }

          if (selectedSection && selectedSection !== "dashboard") {
            setDetail({ type: "section", section: selectedSection });
          } else {
            setDetail(null);
          }
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: detail?.type === "video" ? "#000" : "#F0F9FF" }}>
          <View style={{ flex: 1 }}>
            {/* Header with close button */}
            <View style={[styles.fullscreenHeader, { backgroundColor: detail?.type === "video" ? "rgba(0,0,0,0.8)" : "#FFFFFF" }]}>
              <TouchableOpacity
                style={styles.fullscreenCloseButton}
                onPress={async () => {
                  if (detail?.type === "video" && videoSessionStartTime.current && currentVideoId.current) {
                    const durationMs = Date.now() - videoSessionStartTime.current;
                    const entryTime = new Date(videoSessionStartTime.current).toISOString();

                    if (videoSessionTimer.current) {
                      clearInterval(videoSessionTimer.current);
                      videoSessionTimer.current = null;
                    }

                    await saveVideoWatchingSession(currentVideoId.current, entryTime, durationMs);
                    videoSessionStartTime.current = null;
                    currentVideoId.current = null;
                  }

                  if (selectedSection && selectedSection !== "dashboard") {
                    setDetail({ type: "section", section: selectedSection });
                  } else {
                    setDetail(null);
                  }
                }}
              >
                <Ionicons name="close" size={32} color={detail?.type === "video" ? "#fff" : "#38BDF8"} />
              </TouchableOpacity>
            </View>

            {/* Video Content */}
            {detail?.type === "video" && (
              <VideoPlayerWithControls video={detail.item} videoRef={videoRef} collections={collections} />
            )}

            {/* Quiz Content */}
            {detail?.type === "quiz" && quizState && quizState.quizId === detail.item && (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
              >
                <ScrollView
                  contentContainerStyle={[
                    styles.fullscreenQuizContainer,
                    { paddingHorizontal: isSmallScreen ? 12 : isTablet ? 40 : 18 }
                  ]}
                >
                  {quizzes[quizState.quizId] ? (
                    quizzes[quizState.quizId].questions.map((q, idx) => (
                      <View key={q.id || idx} style={[
                        styles.fullscreenQuizQuestion,
                        {
                          marginBottom: isTablet ? 32 : 24,
                          padding: isTablet ? 24 : 16,
                          maxWidth: isTablet ? 800 : "100%",
                          alignSelf: "center",
                          width: "100%"
                        }
                      ]}>
                        <Text style={[styles.questionText, { fontSize: isTablet ? 24 : 20 }]}>
                          {idx + 1}. {q.question || q.question_text || q.text || q.title || q.content || q.body || q.label || q.name || "Question"}
                        </Text>

                        {(q.imageUri || q.media_url || q.media) && (
                          <Image
                            source={{ uri: fixMediaUrl(q.media_url || q.media || q.imageUri) }}
                            style={{
                              width: "100%",
                              height: isTablet ? 300 : 200,
                              marginTop: 12,
                              borderRadius: 8,
                              resizeMode: "contain"
                            }}
                          />
                        )}

                        {(q.audioUri || q.media_url || q.audio) && (
                          <View style={{ marginTop: 12, backgroundColor: "#f0f0f0", padding: 12, borderRadius: 8, flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="musical-notes" size={24} color="#4c1d95" />
                            <Text style={{ marginLeft: 8, color: "#000" }}>{i18n.t('audioQuestion')}</Text>
                            <TouchableOpacity
                              onPress={async () => {
                                try {
                                  const { sound } = await Audio.Sound.createAsync({ uri: fixMediaUrl(q.media_url || q.media || q.audio || q.audioUri) });
                                  await sound.playAsync();
                                  sound.setOnPlaybackStatusUpdate((status) => {
                                    if (status.didJustFinish) {
                                      sound.unloadAsync();
                                    }
                                  });
                                } catch (e) {
                                  Alert.alert(i18n.t('error'), i18n.t('couldNotPlayAudio'));
                                }
                              }}
                              style={{ marginLeft: "auto", backgroundColor: "#4c1d95", padding: 8, borderRadius: 6 }}
                            >
                              <Ionicons name="play" size={20} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}

                        {q.options.map((opt, i) => (
                          <TouchableOpacity
                            key={i}
                            onPress={() => chooseOption(idx, i)}
                            style={[
                              styles.optionBtn,
                              quizState.answers[idx] === i && styles.optionBtnSelected,
                              { marginTop: 8, padding: isTablet ? 20 : 16 },
                            ]}
                          >
                            {typeof opt === "object" && opt.type === "image" && opt.imageUri ? (
                              <Image
                                source={{ uri: opt.imageUri }}
                                style={{
                                  width: "100%",
                                  height: isTablet ? 160 : 120,
                                  borderRadius: 8,
                                  marginBottom: 8
                                }}
                                resizeMode="cover"
                              />
                            ) : typeof opt === "object" && opt.type === "audio" && opt.audioUri ? (
                              <View style={{ flexDirection: "row", alignItems: "center", padding: 8 }}>
                                <Ionicons name="musical-notes" size={20} color={quizState.answers[idx] === i ? "#fff" : "#4c1d95"} />
                                <Text style={{ marginLeft: 8, color: quizState.answers[idx] === i ? "#fff" : "#000" }}>Play Audio</Text>
                                <TouchableOpacity
                                  onPress={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const { sound } = await Audio.Sound.createAsync({ uri: opt.audioUri });
                                      await sound.playAsync();
                                      sound.setOnPlaybackStatusUpdate((status) => {
                                        if (status.didJustFinish) {
                                          sound.unloadAsync();
                                        }
                                      });
                                    } catch (err) {
                                      Alert.alert(i18n.t('error'), i18n.t('couldNotPlayAudio'));
                                    }
                                  }}
                                  style={{ marginLeft: "auto" }}
                                >
                                  <Ionicons name="play" size={18} color={quizState.answers[idx] === i ? "#fff" : "#4c1d95"} />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <Text
                                style={[
                                  styles.optionText,
                                  quizState.answers[idx] === i && styles.optionTextSelected,
                                  { fontSize: isTablet ? 18 : 16 }
                                ]}
                              >
                                {typeof opt === "string" ? opt : opt.text || `${i18n.t('option')} ${i + 1}`}
                              </Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>{i18n.t('quizNotFound')}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => (quizState ? submitQuiz(quizState.quizId, quizState.answers) : null)}
                    style={[
                      styles.primaryBtn,
                      { marginBottom: 12, padding: isTablet ? 22 : 18 }
                    ]}
                  >
                    <Text style={[styles.primaryBtnText, { fontSize: isTablet ? 20 : 18 }]}>
                      {i18n.t('submitQuiz')}
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </KeyboardAvoidingView>
            )}

            {/* Dashboard Section Content - Kid-friendly full screen */}
            {detail?.type === "section" && (
              <ScrollView
                contentContainerStyle={styles.contentScroll}
                keyboardShouldPersistTaps="handled"
                style={{ flex: 1, backgroundColor: "#F0F9FF" }}
              >
                {/* Recommended Section */}
                {detail.section === "recommended" && (
                  <View style={styles.recommendedSection}>
                    <View style={styles.sectionHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ fontSize: 32, marginRight: 12 }}>✨</Text>
                        <Text style={[styles.sectionTitle, { fontSize: 28 }]}>{i18n.t('recommendedForYou')}</Text>
                      </View>
                    </View>
                    {(() => {
                      const filteredRecommended = search
                        ? recommendedVideos.filter(v =>
                          normalize(v.title).includes(normalize(search)) ||
                          normalize(v.description || "").includes(normalize(search))
                        )
                        : recommendedVideos;
                      return filteredRecommended.length > 0 ? (
                        <View style={styles.recommendedGrid}>
                          {filteredRecommended.map((video) => renderRecommendedVideoCard(video))}
                        </View>
                      ) : (
                        <View style={styles.emptyBox}>
                          <Ionicons name="sparkles-outline" size={64} color="#94A3B8" />
                          <Text style={styles.emptyText}>
                            {search ? "No videos match your search" : i18n.t('recommendationsComingSoon')}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}

                {/* Videos Section */}
                {detail.section === "videos" && (
                  <>
                    {results.videos.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Ionicons name="film-outline" size={64} color="#94A3B8" />
                        <Text style={styles.emptyText}>No videos found</Text>
                      </View>
                    ) : (
                      results.videos.map((v) => renderCard(v, "videos"))
                    )}
                  </>
                )}

                {/* Collections Section */}
                {detail.section === "collections" && (
                  <>
                    {selectedCollectionId ? (
                      <>
                        {/* Back button to return to collections list */}
                        <TouchableOpacity
                          onPress={() => setSelectedCollectionId(null)}
                          style={[styles.backButton, { marginBottom: 16 }]}
                        >
                          <Ionicons name="arrow-back" size={28} color="#38BDF8" />
                        </TouchableOpacity>

                        {/* Collection title */}
                        {collections[selectedCollectionId] && (
                          <View style={{ marginBottom: 16 }}>
                            <Text style={styles.sectionTitle}>
                              📦 {collections[selectedCollectionId].title}
                            </Text>
                            {collections[selectedCollectionId].description && (
                              <Text style={{ marginTop: 8, color: "#64748B", fontSize: 16 }}>
                                {collections[selectedCollectionId].description}
                              </Text>
                            )}
                          </View>
                        )}

                        {/* Videos in this collection */}
                        {(() => {
                          const collectionVideos = videos.filter(v =>
                            v.collection === selectedCollectionId ||
                            v.collection_id === selectedCollectionId ||
                            v.collection?.id === selectedCollectionId
                          );

                          return collectionVideos.length === 0 ? (
                            <View style={styles.emptyBox}>
                              <Ionicons name="film-outline" size={64} color="#94A3B8" />
                              <Text style={styles.emptyText}>No videos in this collection</Text>
                            </View>
                          ) : (
                            collectionVideos.map((v) => renderCard(v, "videos"))
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        {/* Collections list */}
                        {Object.keys(collections).length === 0 ? (
                          <View style={styles.emptyBox}>
                            <Ionicons name="folder-outline" size={64} color="#94A3B8" />
                            <Text style={styles.emptyText}>No collections available</Text>
                          </View>
                        ) : (
                          Object.values(collections)
                            .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description && c.description.toLowerCase().includes(search.toLowerCase())))
                            .map((collection) => renderCollectionCard(collection))
                        )}
                      </>
                    )}
                  </>
                )}

                {/* Quizzes Section */}
                {detail.section === "quizzes" && (
                  <>
                    {results.quizzes.length === 0 ? (
                      <View style={styles.emptyBox}>
                        <Ionicons name="help-circle-outline" size={64} color="#94A3B8" />
                        <Text style={styles.emptyText}>No quizzes found</Text>
                      </View>
                    ) : (
                      results.quizzes.map((q) => renderCard(q, "quizzes"))
                    )}
                  </>
                )}

                {/* Progress Section */}
                {detail.section === "progress" && (
                  <>
                    <View style={styles.card}>
                      <Text style={styles.smallTitle}>Videos Watched</Text>
                      <Text style={{ marginTop: 12, fontSize: 18, color: "#1E293B" }}>
                        {progress.videosCompleted.length} / {videos.length}
                      </Text>
                      <View style={{ marginTop: 12 }}>
                        <ProgressBar
                          progress={
                            videos.length === 0
                              ? 0
                              : Math.round((progress.videosCompleted.length / videos.length) * 100)
                          }
                        />
                      </View>
                    </View>

                    <View style={[styles.card, { marginTop: 16 }]}>
                      <Text style={styles.smallTitle}>Quizzes Completed</Text>
                      <Text style={{ marginTop: 12, fontSize: 18, color: "#1E293B" }}>
                        {Object.values(quizzes).filter((q) => q.results?.length > 0).length} / {Object.keys(quizzes).length}
                      </Text>
                      <View style={{ marginTop: 12 }}>
                        <ProgressBar
                          progress={
                            Object.keys(quizzes).length === 0
                              ? 0
                              : Math.round((Object.values(quizzes).filter((q) => q.results?.length > 0).length / Object.keys(quizzes).length) * 100)
                          }
                        />
                      </View>
                    </View>

                    {loadingProgressRecords ? (
                      <View style={[styles.card, { marginTop: 16 }]}>
                        <ActivityIndicator size="large" color="#38BDF8" />
                        <Text style={{ marginTop: 12, color: "#1E293B" }}>Loading progress…</Text>
                      </View>
                    ) : progressRecords.length > 0 ? (
                      <View style={{ marginTop: 16 }}>
                        <Text style={styles.sectionTitle}>📚 My Lesson Progress 📚</Text>
                        {progressRecords.map((rec) => (
                          <View key={rec.id} style={[styles.card, { marginTop: 12 }]}>
                            <Text style={styles.cardTitle}>{rec.lesson_title || "Untitled lesson"}</Text>
                            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <View style={{
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor:
                                  rec.status === "completed"
                                    ? "#d1fae5"
                                    : rec.status === "in-progress"
                                      ? "#fef3c7"
                                      : "#f3f4f6",
                              }}>
                                <Text style={{
                                  fontSize: 12,
                                  fontWeight: "700",
                                  color:
                                    rec.status === "completed"
                                      ? "#065f46"
                                      : rec.status === "in-progress"
                                        ? "#92400e"
                                        : "#6b7280",
                                  textTransform: "uppercase",
                                }}>
                                  {rec.status || "not-started"}
                                </Text>
                              </View>
                              {typeof rec.points_earned === "number" && rec.points_earned > 0 && (
                                <View style={{ flexDirection: "row", alignItems: "center" }}>
                                  <Ionicons name="star" size={16} color="#f59e0b" />
                                  <Text style={{ marginLeft: 4, color: "#38BDF8", fontSize: 14, fontWeight: "600" }}>
                                    {rec.points_earned} points
                                  </Text>
                                </View>
                              )}
                            </View>
                            {(rec.last_accessed || rec.completion_date) && (
                              <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                                {rec.last_accessed && (
                                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Ionicons name="time-outline" size={14} color="#64748B" />
                                    <Text style={{ marginLeft: 4, fontSize: 12, color: "#64748B" }}>
                                      Last accessed: {new Date(rec.last_accessed).toLocaleDateString()}
                                    </Text>
                                  </View>
                                )}
                                {rec.completion_date && (
                                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                    <Text style={{ marginLeft: 4, fontSize: 12, color: "#10B981", fontWeight: "600" }}>
                                      Completed: {new Date(rec.completion_date).toLocaleDateString()}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {/* Badge Progress - Integrated into Progress Section */}
                    <View style={[styles.card, { marginTop: 16, backgroundColor: "#FFF4E6", borderColor: "#FFB84D" }]}>
                      <Text style={styles.smallTitle}>🏅 Badges Earned 🏅</Text>
                      <Text style={{ marginTop: 12, fontSize: 22, color: "#1E293B", fontWeight: "800" }}>
                        🎉 {childBadges.length} / {allBadges.length} Badges 🎉
                      </Text>
                      {allBadges.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                          <ProgressBar
                            progress={
                              allBadges.length === 0
                                ? 0
                                : Math.round((childBadges.length / allBadges.length) * 100)
                            }
                          />
                        </View>
                      )}
                    </View>

                    {/* Earned Badges List */}
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.sectionTitle}>{i18n.t('myAwesomeBadges')}</Text>
                      {loadingChildBadges ? (
                        <View style={styles.emptyBox}>
                          <ActivityIndicator size="large" color="#38BDF8" />
                          <Text style={[styles.emptyText, { marginTop: 12 }]}>{i18n.t('loadingBadges')}</Text>
                        </View>
                      ) : childBadges.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <Text style={{ fontSize: 80 }}>🏆</Text>
                          <Text style={[styles.emptyText, { fontSize: 18, fontWeight: "800" }]}>
                            {selectedChild?.nickname || "You"} {i18n.t('noBadgesYet').replace("You ", "")}
                          </Text>
                          <Text style={[styles.emptyText, { marginTop: 12, fontSize: 16, color: "#64748B" }]}>
                            {i18n.t('startEarningBadges')}
                          </Text>
                          <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14, color: "#94A3B8" }]}>
                            {i18n.t('keepLearning')}
                          </Text>
                        </View>
                      ) : (
                        childBadges.map((childBadge) => (
                          <View
                            key={childBadge.id}
                            style={[
                              styles.card,
                              {
                                paddingVertical: 16,
                                paddingHorizontal: 16,
                                marginTop: 12,
                                borderColor: "#FFD700",
                                borderWidth: 3,
                                backgroundColor: "#FFFEF0",
                              }
                            ]}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                              <Text style={{ fontSize: 28, marginRight: 12 }}>🏆</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.cardTitle, { fontSize: 20 }]}>
                                  {childBadge.badge_name}
                                </Text>
                                {childBadge.child_nickname && (
                                  <Text style={{ marginTop: 4, color: "#64748B", fontSize: 14 }}>
                                    Awarded to: {childBadge.child_nickname}
                                  </Text>
                                )}
                              </View>
                            </View>
                            {childBadge.awarded_at && (
                              <Text style={{ marginTop: 8, color: "#38BDF8", fontSize: 14, fontWeight: "600" }}>
                                Awarded: {new Date(childBadge.awarded_at).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                        ))
                      )}
                    </View>

                    {/* All Available Badges */}
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.sectionTitle}>{i18n.t('allAvailableBadges')}</Text>
                      {loadingBadges ? (
                        <View style={styles.emptyBox}>
                          <ActivityIndicator size="large" color="#38BDF8" />
                          <Text style={[styles.emptyText, { marginTop: 12 }]}>Loading badges…</Text>
                        </View>
                      ) : allBadges.length === 0 ? (
                        <View style={styles.emptyBox}>
                          <Text style={{ fontSize: 80 }}>🎁</Text>
                          <Text style={[styles.emptyText, { fontSize: 18, fontWeight: "800" }]}>
                            {i18n.t('noBadgesAvailable')}
                          </Text>
                          <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14, color: "#64748B" }]}>
                            {i18n.t('checkBackSoon')}
                          </Text>
                        </View>
                      ) : (
                        allBadges.map((badge) => {
                          const isEarned = childBadges.some(cb => cb.badge === badge.id || cb.badge_name === badge.name);
                          return (
                            <View
                              key={badge.id}
                              style={[
                                styles.card,
                                {
                                  paddingVertical: 16,
                                  paddingHorizontal: 16,
                                  marginTop: 12,
                                  opacity: isEarned ? 1 : 0.6,
                                  borderColor: isEarned ? "#FFD700" : "#E0F2FE",
                                  borderWidth: isEarned ? 3 : 2,
                                  backgroundColor: isEarned ? "#FFFEF0" : "#FFFFFF",
                                }
                              ]}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Text style={{ fontSize: 24, marginRight: 12 }}>
                                  {isEarned ? "🏆" : "🎯"}
                                </Text>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                                    <Text style={[styles.cardTitle, { flex: 1 }]}>{badge.name}</Text>
                                    {isEarned && (
                                      <View style={{
                                        backgroundColor: "#FFD700",
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 12,
                                        marginLeft: 8,
                                      }}>
                                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E293B" }}>
                                          {i18n.t('earned')}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                  <Text style={{ marginTop: 4, color: "#64748B", fontSize: 14 }}>
                                    {badge.description}
                                  </Text>
                                  {badge.created_at && (
                                    <Text style={{ marginTop: 6, color: "#94A3B8", fontSize: 12 }}>
                                      Created: {new Date(badge.created_at).toLocaleDateString()}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Main Content - only show when detail is not active */}
      {!detail && (
        // MAIN CONTENT: Dashboard OR selected section (lists/progress)
        <>
          {selectedSection === "dashboard" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              {/* Welcome Section */}
              <View style={styles.welcomeSection}>
                <Text style={styles.welcomeTitle}>
                  🎉 {i18n.t('hi') || 'Hi'} {selectedChild?.nickname || 'Friend'}! 🎉
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  🌟 {i18n.t('readyToLearn') || 'Ready to learn something amazing today?'} 🌟
                </Text>
                <Text style={styles.welcomeSubtitle2}>
                  Let&apos;s have fun learning together! 🚀✨
                </Text>
              </View>

              {/* Dashboard Cards - Kid-friendly layout - Opens in full screen */}
              <View style={styles.gridRow}>
                <DashboardCard
                  title={i18n.t('recommendedForYou') || "For You!"}
                  emoji="✨"
                  onPress={() => setDetail({ type: "section", section: "recommended" })}
                  colorScheme={{ bg: "#FFF4E6", border: "#FFB84D", shadow: "#FF8C00" }}
                />
                <DashboardCard
                  title={i18n.t('videos') || "Videos"}
                  emoji="🎬"
                  onPress={() => setDetail({ type: "section", section: "videos" })}
                  colorScheme={{ bg: "#E0F2FE", border: "#38BDF8", shadow: "#0EA5E9" }}
                />
              </View>
              <View style={styles.gridRow}>
                <DashboardCard
                  title={`${i18n.t('collections')} 📚`}
                  emoji="📦"
                  onPress={() => {
                    setSelectedCollectionId(null);
                    setDetail({ type: "section", section: "collections" });
                  }}
                  colorScheme={{ bg: "#F0FDF4", border: "#10B981", shadow: "#059669" }}
                />
                <DashboardCard
                  title={`${i18n.t('quizzes')} 🧠`}
                  emoji="❓"
                  onPress={() => setDetail({ type: "section", section: "quizzes" })}
                  colorScheme={{ bg: "#FEF3C7", border: "#F59E0B", shadow: "#D97706" }}
                />
              </View>
              <View style={styles.gridRow}>
                <DashboardCard
                  title={i18n.t('progress') || "My Progress"}
                  emoji="🎯"
                  onPress={() => setDetail({ type: "section", section: "progress" })}
                  colorScheme={{ bg: "#FFE5F1", border: "#FF6B9D", shadow: "#FF1493" }}
                />
              </View>
            </ScrollView>
          )}

          {/* RECOMMENDED VIDEOS SECTION */}
          {selectedSection === "recommended" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setSelectedSection("dashboard")}
                  style={[styles.backButton, { marginBottom: 0 }]}
                >
                  <Ionicons name="arrow-back" size={28} color="#38BDF8" />
                </TouchableOpacity>
              </View>
              <View style={styles.recommendedSection}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="sparkles" size={20} color="#4c1d95" />
                    <Text style={styles.sectionTitle}>{i18n.t('recommendedForYou')}</Text>
                  </View>
                </View>
                {(() => {
                  const filteredRecommended = search
                    ? recommendedVideos.filter(v =>
                      normalize(v.title).includes(normalize(search)) ||
                      normalize(v.description || "").includes(normalize(search))
                    )
                    : recommendedVideos;
                  return filteredRecommended.length > 0 ? (
                    <View style={styles.recommendedGrid}>
                      {filteredRecommended.map((video) => renderRecommendedVideoCard(video))}
                    </View>
                  ) : (
                    <View style={styles.emptyBox}>
                      <Ionicons name="sparkles-outline" size={48} color="#999" />
                      <Text style={styles.emptyText}>
                        {search ? "No videos match your search" : i18n.t('recommendationsComingSoon')}
                      </Text>
                      {!search && (
                        <Text style={styles.emptySub}>
                          {i18n.t('recommendationsDescription')}
                        </Text>
                      )}
                    </View>
                  );
                })()}
              </View>
            </ScrollView>
          )}

          {/* COLLECTIONS SECTION */}
          {selectedSection === "collections" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setSelectedSection("dashboard")}
                  style={[styles.backButton, { marginBottom: 0 }]}
                >
                  <Ionicons name="arrow-back" size={28} color="#38BDF8" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", marginBottom: 16 }}>Collections</Text>
              {Object.keys(collections).length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="folder-outline" size={48} color="#999" />
                  <Text style={styles.emptyText}>No collections available</Text>
                </View>
              ) : (
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                  {Object.values(collections)
                    .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description && c.description.toLowerCase().includes(search.toLowerCase())))
                    .map((collection) => renderCollectionCard(collection))}
                </View>
              )}
            </ScrollView>
          )}

          {/* VIDEOS LIST INLINE */}
          {selectedSection === "videos" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                onPress={() => setSelectedSection("dashboard")}
                style={[styles.backButton, { marginBottom: 16 }]}
              >
                <Ionicons name="arrow-back" size={28} color="#38BDF8" />
              </TouchableOpacity>
              {results.videos.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No videos found</Text>
                </View>
              ) : (
                results.videos.map((v) => renderCard(v, "videos"))
              )}
            </ScrollView>
          )}

          {/* QUIZZES LIST INLINE */}
          {selectedSection === "quizzes" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                onPress={() => setSelectedSection("dashboard")}
                style={[styles.backButton, { marginBottom: 16 }]}
              >
                <Ionicons name="arrow-back" size={28} color="#38BDF8" />
              </TouchableOpacity>
              {results.quizzes.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No quizzes found</Text>
                </View>
              ) : (
                results.quizzes.map((q) => renderCard(q, "quizzes"))
              )}
            </ScrollView>
          )}
          {/* PROGRESS INLINE (NO search bar here) */}
          {selectedSection === "progress" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity
                onPress={() => setSelectedSection("dashboard")}
                style={[styles.backButton, { marginBottom: 16 }]}
              >
                <Ionicons name="arrow-back" size={28} color="#38BDF8" />
              </TouchableOpacity>

              <View style={[styles.card, { backgroundColor: "#E0F2FE", borderColor: "#38BDF8" }]}>
                <Text style={styles.smallTitle}>{i18n.t('videosWatchedTitle')}</Text>
                <Text style={{ marginTop: 12, color: "#000", fontSize: 22, fontWeight: "800" }}>
                  {progress.videosCompleted.length} / {videos.length} Videos
                </Text>
                <ProgressBar
                  progress={
                    videos.length === 0
                      ? 0
                      : Math.round((progress.videosCompleted.length / videos.length) * 100)
                  }
                />
              </View>
              <View style={[styles.card, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
                <Text style={styles.smallTitle}>{i18n.t('quizzesCompletedTitle')}</Text>
                <Text style={{ marginTop: 12, color: "#000", fontSize: 22, fontWeight: "800" }}>
                  {Object.values(quizzes).filter((q) => q.results?.length > 0).length} /{" "}
                  {Object.keys(quizzes).length} Quizzes
                </Text>
              </View>

              {/* Lesson progress records from backend */}
              <View style={[styles.card, { backgroundColor: "#F0FDF4", borderColor: "#10B981" }]}>
                <Text style={styles.smallTitle}>{i18n.t('myLessonProgress')}</Text>
                {loadingProgressRecords ? (
                  <View style={{ marginTop: 12, alignItems: "center" }}>
                    <ActivityIndicator size="large" color="#10B981" />
                    <Text style={{ marginTop: 8, color: "#000", fontSize: 16, fontWeight: "600" }}>
                      {i18n.t('loadingProgress')}
                    </Text>
                  </View>
                ) : progressRecords.length === 0 ? (
                  <View style={{ marginTop: 12, alignItems: "center" }}>
                    <Text style={{ fontSize: 60 }}>📖</Text>
                    <Text style={{ marginTop: 12, color: "#000", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
                      {i18n.t('noLessonProgress')}
                    </Text>
                    <Text style={{ marginTop: 8, color: "#64748B", fontSize: 16, textAlign: "center" }}>
                      {i18n.t('startLessonProgress')}
                    </Text>
                  </View>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    {progressRecords.map((rec) => (
                      <View key={rec.id} style={[styles.card, { marginBottom: 10 }]}>
                        <Text style={styles.cardTitle}>
                          {rec.lesson_title || "Untitled lesson"}
                        </Text>
                        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <View style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor:
                              rec.status === "completed"
                                ? "#d1fae5"
                                : rec.status === "in-progress"
                                  ? "#fef3c7"
                                  : "#f3f4f6",
                          }}>
                            <Text style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color:
                                rec.status === "completed"
                                  ? "#065f46"
                                  : rec.status === "in-progress"
                                    ? "#92400e"
                                    : "#6b7280",
                              textTransform: "uppercase",
                            }}>
                              {rec.status || "not-started"}
                            </Text>
                          </View>
                          {typeof rec.points_earned === "number" && rec.points_earned > 0 && (
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <Ionicons name="star" size={16} color="#f59e0b" />
                              <Text style={{ marginLeft: 4, color: "#000", fontSize: 14, fontWeight: "600" }}>
                                {rec.points_earned} points
                              </Text>
                            </View>
                          )}
                        </View>
                        {(rec.last_accessed || rec.completion_date) && (
                          <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                            {rec.last_accessed && (
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Ionicons name="time-outline" size={14} color="#666" />
                                <Text style={{ marginLeft: 4, fontSize: 12, color: "#666" }}>
                                  Last accessed: {new Date(rec.last_accessed).toLocaleDateString()}
                                </Text>
                              </View>
                            )}
                            {rec.completion_date && (
                              <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                                <Text style={{ marginLeft: 4, fontSize: 12, color: "#10B981", fontWeight: "600" }}>
                                  Completed: {new Date(rec.completion_date).toLocaleDateString()}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {/* All Badges section - from backend */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>🏅 All Available Badges 🏅</Text>
                {loadingBadges ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>Loading badges…</Text>
                  </View>
                ) : allBadges.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No badges defined yet.</Text>
                  </View>
                ) : (
                  allBadges.map((badge) => (
                    <View
                      key={badge.id}
                      style={[styles.card, { flexDirection: "row", alignItems: "center", paddingVertical: 12 }]}
                    >
                      <View style={{ marginLeft: 4, flex: 1 }}>
                        <Text style={styles.cardTitle}>{badge.name}</Text>
                        <Text style={{ marginTop: 4, color: "#000" }}>
                          {badge.description}
                        </Text>
                        {badge.created_at && (
                          <Text style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
                            Created: {new Date(badge.created_at).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                )}
              </View>

              {/* Child badges section - from backend */}
              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>⭐ My Awesome Badges ⭐</Text>
                {loadingChildBadges ? (
                  <View style={styles.emptyBox}>
                    <ActivityIndicator size="large" color="#FF6B9D" />
                    <Text style={[styles.emptyText, { marginTop: 12, fontSize: 16 }]}>
                      Loading your amazing badges... ⏳
                    </Text>
                  </View>
                ) : childBadges.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 80 }}>🏆</Text>
                    <Text style={[styles.emptyText, { fontSize: 18, fontWeight: "800", marginTop: 12 }]}>
                      {selectedChild?.nickname || "You"} hasn&apos;t earned any badges yet! 😊
                    </Text>
                    <Text style={[styles.emptyText, { marginTop: 8, fontSize: 16, color: "#64748B" }]}>
                      🎬 Start watching videos and taking quizzes to earn amazing badges! 🎉
                    </Text>
                    <Text style={[styles.emptyText, { marginTop: 8, fontSize: 14, color: "#94A3B8" }]}>
                      You can do it! Keep learning! 💪✨
                    </Text>
                  </View>
                ) : (
                  childBadges.map((childBadge) => (
                    <View
                      key={childBadge.id}
                      style={[styles.card, { paddingVertical: 12 }]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                        <Text style={{ fontSize: 24, marginRight: 12 }}>🏆</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{childBadge.badge_name}</Text>
                          {childBadge.child_nickname && (
                            <Text style={{ marginTop: 4, color: "#64748B", fontSize: 14 }}>
                              Awarded to: {childBadge.child_nickname}
                            </Text>
                          )}
                        </View>
                      </View>
                      {childBadge.awarded_at && (
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                          <Ionicons name="trophy" size={14} color="#38BDF8" />
                          <Text style={{ marginLeft: 4, color: "#38BDF8", fontSize: 14, fontWeight: "600" }}>
                            Awarded: {new Date(childBadge.awarded_at).toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>

              <View style={{ marginTop: 16 }}>
                <Text style={styles.sectionTitle}>📊 My Quiz History 📊</Text>
                {Object.entries(quizzes).length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={{ fontSize: 60 }}>📝</Text>
                    <Text style={[styles.emptyText, { fontSize: 18, fontWeight: "800", marginTop: 12 }]}>
                      No quizzes yet! 😊
                    </Text>
                    <Text style={[styles.emptyText, { marginTop: 8, fontSize: 16, color: "#64748B" }]}>
                      Start taking quizzes to see your history here! 🎯
                    </Text>
                  </View>
                )}
                {Object.entries(quizzes).map(([id, quiz]) => (
                  <View key={id} style={[styles.card, { paddingVertical: 12 }]}>
                    <Text style={styles.cardTitle}>{quiz.title}</Text>
                    {quiz.results?.length > 0 ? (
                      quiz.results.map((r, idx) => (
                        <Text key={idx} style={{ marginTop: 6, color: "#000" }}>
                          {new Date(r.date).toLocaleDateString()} - Score: {r.score}%
                        </Text>
                      ))
                    ) : (
                      <Text style={{ marginTop: 6, fontStyle: "italic", color: "#000" }}>Not attempted yet</Text>
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEF3F2" }, // Warm, kid-friendly background
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  errorTitle: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
  },
  errorMessage: {
    marginTop: 12,
    fontSize: 16,
    color: "#000",
    textAlign: "center",
    lineHeight: 22,
  },
  errorInstruction: {
    marginTop: 20,
    fontSize: 14,
    color: "#000",
    textAlign: "center",
    lineHeight: 20,
  },
  errorActions: {
    marginTop: 32,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  errorBackButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#F0FDF4",
    borderWidth: 1.5,
    borderColor: "#10B981",
  },
  errorBackButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
  errorLogoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#EF4444",
  },
  errorLogoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
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
  floatingBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#38BDF8",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingActionButtons: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  floatingActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E0F2FE",
  },
  floatingProfileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
  },
  floatingProfileAvatar: {
    width: "100%",
    height: "100%",
  },
  floatingProfileAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#38BDF8",
    justifyContent: "center",
    alignItems: "center",
  },
  floatingSearchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 110 : 80,
    left: 20,
    right: 20,
    zIndex: 999,
  },
  floatingSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    borderRadius: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#E0F2FE",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  floatingSearchBoxInline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    borderRadius: 20,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#E0F2FE",
    marginLeft: 12,
    maxWidth: 200,
    shadowColor: "#38BDF8",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  floatingSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  floatingSearchInputInline: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  headerHi: { color: "#000", fontWeight: "700", fontSize: 14 },
  headerName: { fontSize: 20, fontWeight: "900", color: "#000" },
  logoutBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  welcomeSection: {
    marginTop: Platform.OS === "ios" ? 100 : 80,
    marginBottom: 24,
    paddingBottom: 20,
  },
  welcomeTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 20,
    color: "#475569",
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
    marginBottom: 8,
  },
  welcomeSubtitle2: {
    fontSize: 18,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    fontStyle: "italic",
  },
  searchRow: { paddingHorizontal: 12, marginTop: 12 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: Platform.OS === "android" ? 1 : 0,
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 4,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  clearBtn: { marginLeft: 8 },
  backButton: {
    padding: 10,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0F2FE",
    alignSelf: "flex-start",
  },
  contentScroll: {
    padding: 20,
    flexGrow: 1,
    paddingBottom: 40,
    paddingTop: Platform.OS === "ios" ? 20 : 10,
  },
  // Grid - Kid-friendly spacing
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
    gap: 16,
    flexWrap: "nowrap",
  },
  dashboardCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: "#E0F2FE",
    shadowColor: "#38BDF8",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    minHeight: 140,
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  collectionCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    height: 180, // Fixed height for uniformity
  },
  collectionIconContainer: {
    marginBottom: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF3C7", // Light yellow bg for icon
    alignItems: "center",
    justifyContent: "center",
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  dashboardCardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E293B",
    letterSpacing: 0.3,
  },
  dashboardCardSubtitle: { marginTop: 8, color: "#000", fontSize: 15, fontWeight: "700" },
  // item cards (list inside sections)
  itemCard: {
    backgroundColor: "#FFFFFF",
    padding: isTablet ? 24 : isSmallScreen ? 14 : 18,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FFE5F1",
    shadowColor: "#FF6B9D",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    width: "100%",
    alignSelf: "center",
    maxWidth: isTablet ? 800 : "100%",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "900", fontSize: 18, color: "#000", flexShrink: 1 },
  cardDesc: { marginTop: 10, color: "#000", fontSize: 15, fontWeight: "600" },
  cardBadge: {
    backgroundColor: "#FFE5F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
    borderWidth: 2,
    borderColor: "#FFB6C1",
  },
  cardBadgeText: { color: "#000", fontWeight: "800", fontSize: 13 },
  sectionTitle: { fontSize: 26, fontWeight: "900", marginTop: 4, color: "#1E293B", letterSpacing: 0.5 },
  smallTitle: { fontSize: 22, fontWeight: "900", color: "#1E293B", letterSpacing: 0.3 },
  emptyBox: {
    marginTop: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { marginTop: 8, color: "#000", fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptySub: { marginTop: 6, color: "#64748B", fontSize: 14, textAlign: "center" },
  emptyEmoji: { fontSize: 36 },

  // Progress
  progressWrap: {
    marginTop: 10,
    height: 24,
    backgroundColor: "#FFE5F1",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFB6C1",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF6B9D",
    borderRadius: 24,
    width: "0%",
  },

  // Lesson / general
  lessonTitle: { fontSize: 22, fontWeight: "900" },
  lessonDesc: { marginTop: 10, fontSize: 16, lineHeight: 22, color: "#000" },
  primaryBtn: {
    padding: 18,
    backgroundColor: "#FF6B9D",
    borderRadius: 20,
    marginTop: 24,
    alignItems: "center",
    marginHorizontal: 4,
    shadowColor: "#FF6B9D",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#FFB6C1",
  },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 18 },
  // Quiz
  questionText: { fontWeight: "900", fontSize: 20, marginBottom: 12, color: "#000" },
  optionBtn: {
    padding: 16,
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: "#FFE5F1",
    borderWidth: 2,
    borderColor: "#FFB6C1",
  },
  optionBtnSelected: { backgroundColor: "#FF6B9D", borderColor: "#FF1493" },
  optionText: { color: "#000", fontSize: 16, fontWeight: "700" },
  optionTextSelected: { color: "#fff", fontWeight: "900", fontSize: 17 },

  // small card style used in some places
  card: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "#FFE5F1",
    shadowColor: "#FF6B9D",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  badgePopup: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    backgroundColor: "#FF6B9D",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: "#FF1493",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 99,
    borderWidth: 3,
    borderColor: "#FFB6C1",
  },
  badgePopupText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
  },
  videoPage: {
    height: "100%",
    width: "100%",
    backgroundColor: "#000",
    justifyContent: "center",
  },
  fullVideo: {
    height: "100%",
    width: "100%",
  },
  // Video Controls Styles
  videoControlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  videoControlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 20,
  },
  controlButton: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 12,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },
  timeContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  timeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  // Recommended Videos Styles
  recommendedSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitleAlt: {
    fontSize: 24,
    fontWeight: "900",
    color: "#000",
    marginLeft: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4c1d95",
  },
  recommendedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  recommendedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  thumbnailContainer: {
    width: "100%",
    height: 140,
    position: "relative",
    backgroundColor: "#000",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    backgroundColor: "#4c1d95",
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  watchedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendedCardContent: {
    padding: 12,
  },
  recommendedCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#000",
    marginBottom: 4,
    lineHeight: 18,
  },
  recommendedCardDesc: {
    fontSize: 12,
    color: "#000",
    lineHeight: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#000",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  aiBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(76, 29, 149, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  aiBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 4,
  },
  viewFeedButton: {
    backgroundColor: "#4c1d95",
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#4c1d95",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewFeedButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 8,
  },
  // Fullscreen Modal Styles
  fullscreenHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1000,
  },
  fullscreenCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenQuizContainer: {
    paddingTop: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  fullscreenQuizQuestion: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
  },
});
