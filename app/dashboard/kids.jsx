// Kids.jsx
import React, { useState, useEffect, useRef } from "react";
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
import api from "../../src/api";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video, Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../contexts/UserContext";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import PdfViewer from "../../components/PdfViewer";
import i18n from "../../i18n";
import { useLanguage } from "../../contexts/LanguageContext";
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
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <TouchableOpacity
        style={{ flex: 1 }}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        <Video
          source={{ uri: video.uri || video.video_url }}
          ref={videoRef}
          style={{ flex: 1 }}
          useNativeControls={false}
          resizeMode="contain"
          shouldPlay
          onPlaybackStatusUpdate={setStatus}
          onFullscreenUpdate={async (fsStatus) => {
            if (fsStatus.fullscreenUpdate === 1) {
              // Entered fullscreen
            } else if (fsStatus.fullscreenUpdate === 3) {
              // Exited fullscreen
            }
          }}
        />
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
          source={{ uri: item.uri || item.video_url }}
          style={{ width: "100%", height: "100%" }}
          useNativeControls={false}
          resizeMode="cover"
          shouldPlay={index === playingIndex}
          isLooping
          onPlaybackStatusUpdate={(newStatus) => {
            setStatus(newStatus);
            if (onStatusUpdate) onStatusUpdate(index, newStatus);
          }}
        />
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

// Full-screen video with controls & progress tracking
const FullScreenVideo = ({ video, onWatched }) => {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});

  useEffect(() => {
    if (status.didJustFinish && onWatched) {
      onWatched(video.id); // mark video as watched
    }
  }, [status]);

  return (
    <View style={styles.videoPage}>
      <Video
        ref={videoRef}
        source={{ uri: video.uri || video.video_url }}
        style={styles.fullVideo}
        useNativeControls
        resizeMode="contain"
        shouldPlay
        onPlaybackStatusUpdate={setStatus}
      />
      <View style={{ position: "absolute", bottom: 12, left: 12, right: 12 }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>
          {video.title}
        </Text>
        {video.description ? (
          <Text style={{ color: "#ddd", marginTop: 6 }}>{video.description}</Text>
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
  });
  
  // Track video watching sessions (entry time and duration)
  const videoSessionStartTime = useRef(null);
  const videoSessionTimer = useRef(null);
  const currentVideoId = useRef(null);

  // Recommended videos state (will be populated by backend API)
  // Backend and AI recommendation logic are not integrated yet
  const [recommendedVideos, setRecommendedVideos] = useState([]);

  // Load recommended videos from backend API (not implemented yet)
  // useEffect(() => {
  //   const loadRecommendedVideos = async () => {
  //     try {
  //       const response = await api.get('/recommendations');
  //       setRecommendedVideos(response.data);
  //     } catch (error) {
  //       console.warn("Error loading recommendations:", error);
  //     }
  //   };
  //   loadRecommendedVideos();
  // }, []);

  // Badge system state
  const [recentBadge, setRecentBadge] = useState(null);
  const badgeAnim = useRef(new Animated.Value(0)).current;

  // Video feed mode
  const [videoFeedMode, setVideoFeedMode] = useState(false);
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
    const [videoStatuses, setVideoStatuses] = useState({});
    const currentPlayingRef = useRef(null);

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

    if (badge) showBadge(badge);
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

      studentProgress[childId].videosCompleted = progress.videosCompleted;
      studentProgress[childId].name = childName; // Update name in case it changed
      
      // Preserve videoWatchingDetails if it exists
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
  }, [progress.videosCompleted.length]);
  
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
  }, [detail]);
  
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
          if (!childData || !childData.id) {
            console.warn("Invalid child data in storage");
            setLoadingChild(false);
            // Don't redirect - just show error state
            return;
          }
          
          setSelectedChild(childData);
          
          // Use child_id to load child-specific progress
          const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
          const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};
          const childProgress = studentProgress[childData.id] || {
            videosCompleted: [],
            videoWatchingDetails: [],
            quizResults: [],
          };
          
          // Update progress state with child-specific data
          setProgress({
            videosCompleted: childProgress.videosCompleted || [],
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

  // Load selected child on mount (app switches to kid mode)
  useEffect(() => {
    loadSelectedChild();
  }, []);

  // Load content
  useEffect(() => {
    (async () => {
      try {
        const [rawVideos, rawQuizzes, rawCollections] = await Promise.all([
          AsyncStorage.getItem(STORAGE.VIDEOS),
          AsyncStorage.getItem(STORAGE.QUIZZES),
          AsyncStorage.getItem(STORAGE.COLLECTIONS),
        ]);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
        setQuizzes(rawQuizzes ? JSON.parse(rawQuizzes) : {});
        setCollections(rawCollections ? JSON.parse(rawCollections) : {});
      } catch (e) {
        console.warn("Failed to load stored content", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Compute selected collection
  const selectedCollection = selectedCollectionId ? collections[selectedCollectionId] : null;

  // Render collection card
  const renderCollectionCard = (collection) => {
    return (
      <AnimatedPressable
        key={collection.id}
        style={{ marginTop: 12 }}
        onPress={() => {
          // Collections are kept but don't navigate to lessons anymore
        }}
      >
        <View style={styles.itemCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              📦 {collection.title}
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>
                Collection
              </Text>
            </View>
          </View>
          {collection.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {collection.description}
            </Text>
          ) : null}
        </View>
      </AnimatedPressable>
    );
  };
  // Logout
  const handleLogout = async () => {
    try {
      if (logout) await logout();
      else await AsyncStorage.multiRemove(["user", "userToken", "userRole"]);
    } catch (e) {
      console.warn("Logout error:", e);
    } finally {
      router.replace("/login");
    }
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
        const updatedChild = {
          ...selectedChild,
          avatarUrl: uri,
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
        
        // Update the selected_child storage
        await AsyncStorage.setItem("@selected_child", JSON.stringify(updatedChild));
        
        // Update local state
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
    
    // Mark watched
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
  };
  
  // Function to save video watching session (using child_id)
  const saveVideoWatchingSession = async (videoId, entryTime, durationMs) => {
    try {
      if (!selectedChild?.id) {
        console.warn("No child selected, cannot save video session");
        return;
      }

      const childId = selectedChild.id;
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
      
      // Initialize videoWatchingDetails if it doesn't exist
      if (!studentProgress[childId].videoWatchingDetails) {
        studentProgress[childId].videoWatchingDetails = [];
      }
      
      // Find existing entry for this video
      const existingEntry = studentProgress[childId].videoWatchingDetails.find(
        (entry) => entry.videoId === videoId
      );
      
      if (existingEntry) {
        // Update existing entry: add to total duration
        existingEntry.totalDurationMs = (existingEntry.totalDurationMs || 0) + durationMs;
        // Keep the first entry time
        if (!existingEntry.entryTime) {
          existingEntry.entryTime = entryTime;
        }
      } else {
        // Create new entry
        studentProgress[childId].videoWatchingDetails.push({
          videoId,
          entryTime,
          totalDurationMs: durationMs,
        });
      }
      
      await AsyncStorage.setItem(STORAGE.STUDENT_PROGRESS, JSON.stringify(studentProgress));
    } catch (e) {
      console.warn("Failed to save video watching session:", e);
    }
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
      if (answers[i] === q.answerIndex) correct++;
    });
    const score = Math.round((correct / quiz.questions.length) * 100);
    
    if (!selectedChild?.id) {
      Alert.alert(i18n.t('error'), "No child selected");
      return;
    }

    const childId = selectedChild.id;
    const childName = selectedChild.nickname || i18n.t('unknownStudent');
    
    // Update quiz results with child info
    const updated = { ...quizzes };
    const item = updated[quizId] || {};
    item.results = item.results || [];
    item.results.unshift({ 
      score, 
      date: new Date().toISOString(),
      childId,  // Use childId instead of studentId
      childName,  // Use childName instead of studentName
    });
    updated[quizId] = { ...quiz, ...item };
    
    // Update student progress (using child_id)
    try {
      const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
      const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};
      
      if (!studentProgress[childId]) {
        studentProgress[childId] = {
          name: childName,
          videosCompleted: [],
          quizResults: [],
        };
      }
      
      // Add quiz result to child progress
      const existingResult = studentProgress[childId].quizResults.find(r => r.quizId === quizId);
      if (!existingResult) {
        studentProgress[childId].quizResults.push({
          quizId,
          quizTitle: quiz.title,
          score,
          date: new Date().toISOString(),
        });
      } else {
        // Update existing result
        existingResult.score = score;
        existingResult.date = new Date().toISOString();
      }
      
      // Update videos completed
      studentProgress[childId].videosCompleted = progress.videosCompleted;
      
      await AsyncStorage.setItem(STORAGE.STUDENT_PROGRESS, JSON.stringify(studentProgress));
      await AsyncStorage.setItem(STORAGE.QUIZZES, JSON.stringify(updated));
      setQuizzes(updated);
      setQuizState((prev) => (prev ? { ...prev, finished: true, score } : prev));
      checkForNewBadge("quiz");
      Alert.alert(i18n.t('quizCompleted'), `${i18n.t('yourScore')}: ${score}%`);
    } catch (e) {
      console.warn("Failed to save quiz result:", e);
    }
  };

  // Render item card: opens inline detail now
  const renderCard = (item, type) => {
    const collection = item.collection ? collections[item.collection] : null;
    return (
      <AnimatedPressable
        key={item.id}
        style={{ marginTop: 12 }}
        onPress={() => {
          if (type === "videos") openVideoInline(item);
          if (type === "quizzes") openQuizInline(item.id);
        }}
      >
        <View style={styles.itemCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {type === "videos" ? "🎬 " : "❓ "}
              {item.title}
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>
                {type}
              </Text>
            </View>
          </View>
          {item.description ? (
            <Text style={styles.cardDesc} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          {collection && (
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", padding: 8, backgroundColor: "#F0FDF4", borderRadius: 8 }}>
              <Ionicons name="folder" size={16} color="#16A34A" />
              <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "600", color: "#16A34A" }}>
                📦 {collection.title}
              </Text>
            </View>
          )}
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
            {video.thumbnail ? (
              <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} resizeMode="cover" />
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

  // Card component for dashboard grid
  const DashboardCard = ({ title, subtitle, emoji, onPress }) => (
    <AnimatedPressable onPress={onPress} style={{
      width: isTablet ? "48%" : width < 400 ? "49%" : "48%",
      flexShrink: 1,
    }}>
      <View style={[
        styles.dashboardCard,
        {
          padding: isTablet ? 28 : isSmallScreen ? 12 : 16,
          minHeight: isTablet ? 150 : isSmallScreen ? 110 : 120
        }
      ]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={[
              styles.dashboardCardTitle,
              { fontSize: isTablet ? 24 : isSmallScreen ? 18 : 20 }
            ]}>
              {emoji} {title}
            </Text>
            {subtitle ? (
              <Text style={[
                styles.dashboardCardSubtitle,
                { fontSize: isTablet ? 17 : isSmallScreen ? 14 : 15 }
              ]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color="#666" />
        </View>
      </View>
    </AnimatedPressable>
  );
  // When loading content or child profile
  if (loading || loadingChild) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4c1d95" />
        <Text style={{ marginTop: 10, color: "#000" }}>
          {loadingChild ? "Loading child profile..." : i18n.t('loading')}
        </Text>
      </SafeAreaView>
    );
  }

  // If no child selected after loading, show message but stay on kids dashboard
  if (!selectedChild) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <Ionicons name="person-outline" size={64} color="#999" />
        <Text style={{ marginTop: 20, fontSize: 18, fontWeight: "600", color: "#000" }}>
          No Child Selected
        </Text>
        <Text style={{ marginTop: 10, color: "#000", textAlign: "center", paddingHorizontal: 40 }}>
          Please select a child from the parent dashboard to continue.
        </Text>
        <Text style={{ marginTop: 20, color: "#000", textAlign: "center", paddingHorizontal: 40, fontSize: 12 }}>
          You can use the back button or logout to return to the parent dashboard.
        </Text>
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
      {/* Header */}
      <View style={styles.header}>
        {/* Profile Icon - Top Left */}
        <TouchableOpacity
          onPress={pickProfilePhoto}
          accessibilityLabel={i18n.t('changeProfilePicture')}
          style={styles.profileIconContainer}
          activeOpacity={0.8}
        >
          {selectedChild?.avatarUrl && selectedChild.avatarUrl.trim() !== "" ? (
            <Image source={{ uri: selectedChild.avatarUrl }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.profilePhotoPlaceholder}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          )}
        </TouchableOpacity>

        {/* Empty space in center */}
        <View style={{ flex: 1 }} />

        {/* Language Switcher and Logout - Top Right */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {/* Language Switcher */}
          <TouchableOpacity 
            onPress={() => {
              const languages = ["en", "ti", "am"];
              const currentIndex = languages.indexOf(language);
              const nextIndex = (currentIndex + 1) % languages.length;
              changeLanguage(languages[nextIndex]);
            }}
            style={[styles.logoutBtn, { backgroundColor: "#f0f0f0" }]}
            accessibilityLabel={i18n.t('selectLanguage')}
          >
            <Ionicons name="language" size={20} color="#000" />
          </TouchableOpacity>
          
          {/* Logout Button */}
          <TouchableOpacity 
            onPress={handleLogout} 
            style={styles.logoutBtn} 
            accessibilityLabel={i18n.t('logout')}
          >
            <Ionicons name="log-out-outline" size={22} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Search Row (visible in dashboard/videos/quizzes) */}
      {showSearch && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#666" />
            <TextInput
            placeholder={i18n.t('searchVideosQuizzes')}
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      {/* Fullscreen Modal for detail view */}
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
          setDetail(null);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: detail?.type === "video" ? "#000" : "#FFF5F7" }}>
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
                  setDetail(null);
                }}
              >
                <Ionicons name="close" size={28} color={detail?.type === "video" ? "#fff" : "#000"} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {detail?.type === "video" && (
              <VideoPlayerWithControls video={detail.item} videoRef={videoRef} collections={collections} />
            )}

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
                          {idx + 1}. {q.question}
                        </Text>
                        
                        {q.type === "image" && q.imageUri && (
                          <Image 
                            source={{ uri: q.imageUri }} 
                            style={{
                              width: "100%",
                              height: isTablet ? 300 : 200,
                              marginTop: 12,
                              borderRadius: 8,
                              resizeMode: "contain"
                            }}
                          />
                        )}
                        
                        {q.type === "audio" && q.audioUri && (
                          <View style={{ marginTop: 12, backgroundColor: "#f0f0f0", padding: 12, borderRadius: 8, flexDirection: "row", alignItems: "center" }}>
                            <Ionicons name="musical-notes" size={24} color="#4c1d95" />
                            <Text style={{ marginLeft: 8, color: "#000" }}>{i18n.t('audioQuestion')}</Text>
                            <TouchableOpacity
                              onPress={async () => {
                                try {
                                  const { sound } = await Audio.Sound.createAsync({ uri: q.audioUri });
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
          </View>
        </SafeAreaView>
      </Modal>

      {/* Main Content - only show when detail is not active */}
      {!detail && (
        // MAIN CONTENT: Dashboard OR selected section (lists/progress)
        <>
          {selectedSection === "dashboard" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              {/* Dashboard Cards */}
              <View style={styles.gridRow}>
                <DashboardCard
                  title={i18n.t('recommendedForYou')}
                  subtitle={`${recommendedVideos.length} ${i18n.t('recommendations')}`}
                  emoji="✨"
                  onPress={() => setSelectedSection("recommended")}
                />
                <DashboardCard
                  title={i18n.t('videos')}
                  subtitle={`${videos.length} ${i18n.t('available')}`}
                  emoji="🎬"
                  onPress={() => setSelectedSection("videos")}
                />
              </View>
              <View style={styles.gridRow}>
                <DashboardCard
                  title="Collections"
                  subtitle={`${Object.keys(collections).length} ${i18n.t('available')}`}
                  emoji="📦"
                  onPress={() => {
                    setSelectedCollectionId(null);
                    setSelectedSection("collections");
                  }}
                />
                <DashboardCard
                  title="Quizzes"
                  subtitle={`${Object.keys(quizzes).length} ${i18n.t('available')}`}
                  emoji="❓"
                  onPress={() => setSelectedSection("quizzes")}
                />
              </View>
              <View style={styles.gridRow}>
                <DashboardCard
                  title={i18n.t('progress')}
                  subtitle="View progress"
                  emoji="🎯"
                  onPress={() => setSelectedSection("progress")}
                />
              </View>
            </ScrollView>
          )}

          {/* RECOMMENDED VIDEOS SECTION */}
          {selectedSection === "recommended" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setSelectedSection("dashboard")}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <View style={styles.recommendedSection}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="sparkles" size={20} color="#4c1d95" />
                    <Text style={styles.sectionTitle}>{i18n.t('recommendedForYou')}</Text>
                  </View>
                </View>
                {recommendedVideos.length > 0 ? (
                  <View style={styles.recommendedGrid}>
                    {recommendedVideos.map((video) => renderRecommendedVideoCard(video))}
                  </View>
                ) : (
                  <View style={styles.emptyBox}>
                    <Ionicons name="sparkles-outline" size={48} color="#999" />
                    <Text style={styles.emptyText}>{i18n.t('recommendationsComingSoon')}</Text>
                    <Text style={styles.emptySub}>
                      {i18n.t('recommendationsDescription')}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}

          {/* COLLECTIONS SECTION */}
          {selectedSection === "collections" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setSelectedSection("dashboard")}>
                  <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", marginBottom: 16 }}>Collections</Text>
              {Object.keys(collections).length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="folder-outline" size={48} color="#999" />
                  <Text style={styles.emptyText}>No collections available</Text>
                </View>
              ) : (
                Object.values(collections)
                  .filter(c => !search || c.title.toLowerCase().includes(search.toLowerCase()) || (c.description && c.description.toLowerCase().includes(search.toLowerCase())))
                  .map((collection) => renderCollectionCard(collection))
              )}
            </ScrollView>
          )}

          {/* VIDEOS LIST INLINE */}
          {selectedSection === "videos" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
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
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
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
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>

              <View style={styles.card}>
                <Text style={styles.smallTitle}>Videos Watched</Text>
                <Text style={{ marginTop: 6, color: "#000" }}>
                  {progress.videosCompleted.length} / {videos.length}
                </Text>
                <ProgressBar
                  progress={
                    videos.length === 0
                      ? 0
                      : Math.round((progress.videosCompleted.length / videos.length) * 100)
                  }
                />
              </View>
              <View style={styles.card}>
                <Text style={styles.smallTitle}>Quizzes Completed</Text>
                <Text style={{ marginTop: 6, color: "#000" }}>
                  {Object.values(quizzes).filter((q) => q.results?.length > 0).length} /{" "}
                  {Object.keys(quizzes).length}
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionTitle}>📊 Quiz History</Text>
                {Object.entries(quizzes).length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>You haven&apos;t added any quizzes yet.</Text>
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
  container: { flex: 1, backgroundColor: "#FFF5F7" }, // Soft pink background for kids
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    height: 100,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0,
    shadowColor: "#FF6B9D",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  profileIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FF6B9D",
  },
  profilePhoto: { 
    width: "100%", 
    height: "100%", 
    borderRadius: 20,
  },
  profilePhotoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#FF6B9D",
    justifyContent: "center",
    alignItems: "center",
  },
  headerHi: { color: "#000", fontWeight: "700", fontSize: 14 },
  headerName: { fontSize: 20, fontWeight: "900", color: "#000" },
  logoutBtn: { 
    padding: 8, 
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  welcomeBox: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    shadowColor: "#FF6B9D",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 2,
    borderColor: "#FFE5F1",
  },
  welcomeTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
  welcomeSubtitle: { marginTop: 8, color: "#000", fontSize: 15, fontWeight: "600" },
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
  contentScroll: {
    padding: 12,
    flexGrow: 1,
    paddingBottom: 36,
  },
  // Grid
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
    gap: 12,
    flexWrap: "nowrap",
  },
  dashboardCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FFE5F1",
    shadowColor: "#FF6B9D",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
    minHeight: 120,
    justifyContent: "center",
    flex: 1,
    minWidth: 0,
  },
  dashboardCardTitle: { fontSize: 20, fontWeight: "900", color: "#000" },
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
  sectionTitle: { fontSize: 20, fontWeight: "900", marginTop: 4, color: "#000" },
  smallTitle: { fontSize: 18, fontWeight: "900", color: "#000" },
  emptyBox: {
    marginTop: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { marginTop: 8, color: "#000", fontSize: 15, fontWeight: "600" },
  emptySub: { marginTop: 6, color: "#000", fontSize: 13 },
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
    padding: 18,
    marginTop: 14,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FFE5F1",
    shadowColor: "#FF6B9D",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
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
  sectionTitle: {
    fontSize: 18,
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
