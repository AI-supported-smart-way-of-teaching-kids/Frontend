// Kids.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Video } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "../../contexts/UserContext";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import PdfViewer from "../../components/PdfViewer";
const STORAGE = {
  LESSONS: "@app_lessons_v1",
  VIDEOS: "@app_videos_v1",
  QUIZZES: "@app_quizzes_v1",
  PHOTO: "@profile_photo",
  STUDENT_PROGRESS: "@app_student_progress_v1",
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
export default function Kids() {
  const { user: contextUser, logout } = useUser();
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [photo, setPhoto] = useState(null);
  // Which top section is active on the page
  const [selectedSection, setSelectedSection] = useState("dashboard");
  // "dashboard" | "lessons" | "videos" | "quizzes" | "progress"
  // Inline detail view state (replaces modals)
  // { type: 'video'|'lesson'|'quiz', item: object | id } or null
  const [detail, setDetail] = useState(null);
  const videoRef = useRef(null);
  // Track completed items for progress
  const [progress, setProgress] = useState({
    lessonsCompleted: [],
    videosCompleted: [],
  });

  // Save progress to student progress storage
  const saveStudentProgress = async () => {
    try {
      const studentName = contextUser?.name || "Unknown Student";
      const studentId = contextUser?.id || Date.now().toString();
      
      const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
      const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};
      
      if (!studentProgress[studentId]) {
        studentProgress[studentId] = {
          name: studentName,
          lessonsCompleted: [],
          videosCompleted: [],
          quizResults: [],
        };
      }
      
      studentProgress[studentId].lessonsCompleted = progress.lessonsCompleted;
      studentProgress[studentId].videosCompleted = progress.videosCompleted;
      studentProgress[studentId].name = studentName; // Update name in case it changed
      
      await AsyncStorage.setItem(STORAGE.STUDENT_PROGRESS, JSON.stringify(studentProgress));
    } catch (e) {
      console.warn("Failed to save student progress:", e);
    }
  };

  // Save progress whenever it changes
  useEffect(() => {
    saveStudentProgress();
  }, [progress.lessonsCompleted.length, progress.videosCompleted.length]);
  // Quiz-taking state when viewing a quiz detail
  const [quizState, setQuizState] = useState(null);
  // Load profile photo
  useEffect(() => {
    const loadPhoto = async () => {
      try {
        const savedPhoto = await AsyncStorage.getItem(STORAGE.PHOTO);
        if (savedPhoto) setPhoto(savedPhoto);
      } catch (e) {
        console.warn("Error loading photo:", e);
      }
    };
    loadPhoto();
  }, []);
  // Load content
  useEffect(() => {
    (async () => {
      try {
        const [rawLessons, rawVideos, rawQuizzes] = await Promise.all([
          AsyncStorage.getItem(STORAGE.LESSONS),
          AsyncStorage.getItem(STORAGE.VIDEOS),
          AsyncStorage.getItem(STORAGE.QUIZZES),
        ]);
        setLessons(rawLessons ? JSON.parse(rawLessons) : []);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
        setQuizzes(rawQuizzes ? JSON.parse(rawQuizzes) : {});
      } catch (e) {
        console.warn("Failed to load stored content", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
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
  // Pick profile photo
  const pickProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow gallery access.");
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
        setPhoto(uri);
        await AsyncStorage.setItem(STORAGE.PHOTO, uri);
      }
    } catch (e) {
      console.log(e);
    }
  };
  // Search helpers
  const normalize = (s = "") => s.toLowerCase().trim();
  const filterLessons = (q) =>
    lessons.filter(
      (l) =>
        normalize(l.title).includes(q) ||
        normalize(l.description).includes(q) ||
        normalize(l.category).includes(q)
    );
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
    lessons: q ? filterLessons(q) : lessons,
    videos: q ? filterVideos(q) : videos,
    quizzes: q
      ? filterQuizzes(q)
      : Object.entries(quizzes).map(([id, quiz]) => ({ id, ...quiz })),
  };
  // === Inline open item functions (no modal) ===
  const openVideoInline = (video) => {
    setDetail({ type: "video", item: video });
    // Mark watched
    setProgress((prev) => ({
      ...prev,
      videosCompleted: prev.videosCompleted.includes(video.id)
        ? prev.videosCompleted
        : [...prev.videosCompleted, video.id],
    }));
  };
  const openLessonInline = (lesson) => {
    setDetail({ type: "lesson", item: lesson });
    // Mark completed
    setProgress((prev) => ({
      ...prev,
      lessonsCompleted: prev.lessonsCompleted.includes(lesson.id)
        ? prev.lessonsCompleted
        : [...prev.lessonsCompleted, lesson.id],
    }));
  };
  const openQuizInline = (quizId) => {
    const quiz = quizzes[quizId];
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      Alert.alert("No questions", "This quiz has no questions.");
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
    const studentName = contextUser?.name || "Unknown Student";
    const studentId = contextUser?.id || Date.now().toString();
    
    // Update quiz results with student info
    const updated = { ...quizzes };
    const item = updated[quizId] || {};
    item.results = item.results || [];
    item.results.unshift({ 
      score, 
      date: new Date().toISOString(),
      studentId,
      studentName,
    });
    updated[quizId] = { ...quiz, ...item };
    
    // Update student progress
    try {
      const rawStudentProgress = await AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS);
      const studentProgress = rawStudentProgress ? JSON.parse(rawStudentProgress) : {};
      
      if (!studentProgress[studentId]) {
        studentProgress[studentId] = {
          name: studentName,
          lessonsCompleted: [],
          videosCompleted: [],
          quizResults: [],
        };
      }
      
      // Add quiz result to student progress
      const existingResult = studentProgress[studentId].quizResults.find(r => r.quizId === quizId);
      if (!existingResult) {
        studentProgress[studentId].quizResults.push({
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
      
      // Update lessons and videos completed
      studentProgress[studentId].lessonsCompleted = progress.lessonsCompleted;
      studentProgress[studentId].videosCompleted = progress.videosCompleted;
      
      await AsyncStorage.setItem(STORAGE.STUDENT_PROGRESS, JSON.stringify(studentProgress));
      await AsyncStorage.setItem(STORAGE.QUIZZES, JSON.stringify(updated));
      setQuizzes(updated);
      setQuizState((prev) => (prev ? { ...prev, finished: true, score } : prev));
      Alert.alert("Quiz completed", `Your score: ${score}%`);
    } catch (e) {
      console.warn("Failed to save quiz result:", e);
    }
  };

  // Render item card: opens inline detail now
  const renderCard = (item, type) => (
    <AnimatedPressable
      key={item.id}
      style={{ marginTop: 12 }}
      onPress={() => {
        if (type === "lessons") openLessonInline(item);
        if (type === "videos") openVideoInline(item);
        if (type === "quizzes") openQuizInline(item.id);
      }}
    >
      <View style={styles.itemCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            {type === "lessons" ? "📘 " : type === "videos" ? "🎬 " : "❓ "}
            {item.title}
          </Text>
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>
              {type === "lessons" ? item.category || "Lesson" : type}
            </Text>
          </View>
        </View>
        {item.description ? (
          <Text style={styles.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </AnimatedPressable>
  );
  // Card component for dashboard grid
  const DashboardCard = ({ title, subtitle, emoji, onPress }) => (
    <AnimatedPressable onPress={onPress} style={{ width: "48%" }}>
      <View style={styles.dashboardCard}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text style={styles.dashboardCardTitle}>
              {emoji} {title}
            </Text>
            {subtitle ? (
              <Text style={styles.dashboardCardSubtitle}>{subtitle}</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={22} color="#666" />
        </View>
      </View>
    </AnimatedPressable>
  );
  // When loading
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4c1d95" />
        <Text style={{ marginTop: 10, color: "#444" }}>Loading...</Text>
      </SafeAreaView>
    );
  }
  // Search visibility: show for dashboard, lessons, videos, quizzes.
  const showSearch =
    selectedSection === "dashboard" ||
    selectedSection === "lessons" ||
    selectedSection === "videos" ||
    selectedSection === "quizzes";
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Image 
            source={require("../../assets/images/kidsicon.jpg")} 
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
            resizeMode="cover"
          />
          <TouchableOpacity onPress={pickProfilePhoto} accessibilityLabel="Profile photo" style={{ marginRight: 10 }}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.profilePhoto} />
            ) : (
              <Ionicons name="person-circle-outline" size={44} color="#4c1d95" />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerHi}>Hello 👋</Text>
            <Text style={styles.headerName}>{contextUser?.name || "Kid"}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} accessibilityLabel="Logout">
          <Ionicons name="log-out-outline" size={22} color="#333" />
        </TouchableOpacity>
      </View>
      {/* Welcome */}
      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeTitle}>Ready to explore today?</Text>
        <Text style={styles.welcomeSubtitle}>Tap a card to open the section.</Text>
      </View>
      {/* Search Row (visible in dashboard/lessons/videos/quizzes) */}
      {showSearch && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#666" />
            <TextInput
              placeholder="Search lessons, videos or quizzes"
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
      {/* If detail view is active (lesson/video/quiz), show detail full-screen inside same page */}
      {detail ? (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center" }}
              onPress={() => {
                // Close detail: return to the section the user was in
                setDetail(null);
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#333" />
              <Text style={{ marginLeft: 8, fontWeight: "800" }}>Back</Text>
            </TouchableOpacity>
          </View>
          {detail.type === "video" && (
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <Video
                source={{ uri: detail.item.uri }}
                ref={videoRef}
                style={{ flex: 1 }}
                useNativeControls
                resizeMode="contain"
                shouldPlay
              />
              <View style={{ padding: 12 }}>
                <Text style={{ fontWeight: "800", fontSize: 18, color: "#fff" }}>
                  {detail.item.title}
                </Text>
                {detail.item.description ? (
                  <Text style={{ marginTop: 8, color: "#ddd" }}>{detail.item.description}</Text>
                ) : null}
              </View>
            </View>
          )}

          {detail.type === "lesson" && (
            <View style={{ flex: 1 }}>
              <View style={{ padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#eee" }}>
                <Text style={styles.lessonTitle}>{detail.item.title}</Text>
                <Text style={styles.lessonDesc}>
                  {detail.item.description || "No description"}
                </Text>
                {detail.item.category && (
                  <Text style={{ marginTop: 8, color: "#666" }}>Category: {detail.item.category}</Text>
                )}
              </View>
              {detail.item.pdfUri ? (
                <PdfViewer
                  source={{ uri: detail.item.pdfUri, cache: true }}
                  onError={(error) => {
                    console.error("PDF Error:", error);
                    Alert.alert("Error", "Failed to load PDF");
                  }}
                  style={{ flex: 1 }}
                />
              ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
                  <Ionicons name="document-text-outline" size={64} color="#ccc" />
                  <Text style={{ marginTop: 12, color: "#999" }}>No PDF available for this lesson</Text>
                </View>
              )}
              <View style={{ padding: 12, backgroundColor: "#fff" }}>
                <TouchableOpacity
                  onPress={() => setDetail(null)}
                  style={styles.primaryBtn}
                >
                  <Text style={styles.primaryBtnText}>Close Lesson</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {detail.type === "quiz" && quizState && quizState.quizId === detail.item && (
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1 }}
            >
              <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36, flexGrow: 1 }}>
                {quizzes[quizState.quizId] ? (
                  quizzes[quizState.quizId].questions.map((q, idx) => (
                    <View key={idx} style={{ marginBottom: 20 }}>
                      <Text style={styles.questionText}>{q.question}</Text>
                      {q.options.map((opt, i) => (
                        <TouchableOpacity
                          key={i}
                          onPress={() => chooseOption(idx, i)}
                          style={[
                            styles.optionBtn,
                            quizState.answers[idx] === i && styles.optionBtnSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              quizState.answers[idx] === i && styles.optionTextSelected,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>Quiz not found.</Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => (quizState ? submitQuiz(quizState.quizId, quizState.answers) : null)}
                  style={[styles.primaryBtn, { marginBottom: 12 }]}
                >
                  <Text style={styles.primaryBtnText}>Submit Quiz</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </View>
      ) : (
        // MAIN CONTENT: Dashboard OR selected section (lists/progress)
        <>
          {selectedSection === "dashboard" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.gridRow}>
                <DashboardCard
                  title="Lessons"
                  subtitle={`${lessons.length} available`}
                  emoji="📘"
                  onPress={() => setSelectedSection("lessons")}
                />
                <DashboardCard
                  title="Videos"
                  subtitle={`${videos.length} available`}
                  emoji="🎬"
                  onPress={() => setSelectedSection("videos")}
                />
              </View>
              <View style={styles.gridRow}>
                <DashboardCard
                  title="Quizzes"
                  subtitle={`${Object.keys(quizzes).length} available`}
                  emoji="❓"
                  onPress={() => setSelectedSection("quizzes")}
                />
                <DashboardCard
                  title="Progress"
                  subtitle={`Lessons ${progress.lessonsCompleted.length}/${lessons.length}`}
                  emoji="🎯"
                  onPress={() => setSelectedSection("progress")}
                />
              </View>
            </ScrollView>
          )}
          {/* LESSONS LIST INLINE */}
          {selectedSection === "lessons" && (
            <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              {results.lessons.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No lessons found</Text>
                </View>
              ) : (
                results.lessons.map((l) => renderCard(l, "lessons"))
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
                <Text style={styles.smallTitle}>Lessons Completed</Text>
                <Text style={{ marginTop: 6 }}>
                  {progress.lessonsCompleted.length} / {lessons.length}
                </Text>
                <ProgressBar
                  progress={
                    lessons.length === 0
                      ? 0
                      : Math.round((progress.lessonsCompleted.length / lessons.length) * 100)
                  }
                />
              </View>
              <View style={styles.card}>
                <Text style={styles.smallTitle}>Videos Watched</Text>
                <Text style={{ marginTop: 6 }}>
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
                <Text style={{ marginTop: 6 }}>
                  {Object.values(quizzes).filter((q) => q.results?.length > 0).length} /{" "}
                  {Object.keys(quizzes).length}
                </Text>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionTitle}>📊 Quiz History</Text>
                {Object.entries(quizzes).length === 0 && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>You have not added any quizzes yet.</Text>
                  </View>
                )}
                {Object.entries(quizzes).map(([id, quiz]) => (
                  <View key={id} style={[styles.card, { paddingVertical: 12 }]}>
                    <Text style={styles.cardTitle}>{quiz.title}</Text>
                    {quiz.results?.length > 0 ? (
                      quiz.results.map((r, idx) => (
                        <Text key={idx} style={{ marginTop: 6 }}>
                          {new Date(r.date).toLocaleDateString()} - Score: {r.score}%
                        </Text>
                      ))
                    ) : (
                      <Text style={{ marginTop: 6, fontStyle: "italic" }}>Not attempted yet</Text>
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
  container: { flex: 1, backgroundColor: "#f7f8fb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    height: 86,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  profilePhoto: { width: 44, height: 44, borderRadius: 22 },
  headerHi: { color: "#4c1d95", fontWeight: "600" },
  headerName: { fontSize: 16, fontWeight: "900", color: "#111" },
  logoutBtn: { padding: 6, borderRadius: 8 },
  welcomeBox: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  welcomeTitle: { fontSize: 16, fontWeight: "800", color: "#222" },
  welcomeSubtitle: { marginTop: 6, color: "#666" },
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
  },
  dashboardCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 100,
    justifyContent: "center",
  },
  dashboardCardTitle: { fontSize: 16, fontWeight: "900", color: "#111" },
  dashboardCardSubtitle: { marginTop: 6, color: "#666", fontSize: 13 },
  // item cards (list inside sections)
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
    alignSelf: "center",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontWeight: "800", fontSize: 15, color: "#111", flexShrink: 1 },
  cardDesc: { marginTop: 8, color: "#666" },
  cardBadge: {
    backgroundColor: "#f1f4ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  cardBadgeText: { color: "#4c1d95", fontWeight: "700", fontSize: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "900", marginTop: 4, color: "#111" },
  smallTitle: { fontSize: 15, fontWeight: "800" },
  emptyBox: {
    marginTop: 18,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { marginTop: 8, color: "#777", fontSize: 15, fontWeight: "600" },
  emptySub: { marginTop: 6, color: "#999", fontSize: 13 },
  emptyEmoji: { fontSize: 36 },

  // Progress
  progressWrap: {
    marginTop: 8,
    height: 16,
    backgroundColor: "#f0eef8",
    borderRadius: 20,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4c1d95",
    borderRadius: 20,
    width: "0%",
  },

  // Lesson / general
  lessonTitle: { fontSize: 22, fontWeight: "900" },
  lessonDesc: { marginTop: 10, fontSize: 16, lineHeight: 22, color: "#444" },
  primaryBtn: {
    padding: 14,
    backgroundColor: "#4c1d95",
    borderRadius: 12,
    marginTop: 22,
    alignItems: "center",
    marginHorizontal: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800" },

  // Quiz
  questionText: { fontWeight: "800", fontSize: 16, marginBottom: 8 },
  optionBtn: {
    padding: 12,
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#f6f6f7",
  },
  optionBtnSelected: { backgroundColor: "#4c1d95" },
  optionText: { color: "#111" },
  optionTextSelected: { color: "#fff", fontWeight: "700" },

  // small card style used in some places
  card: {
    backgroundColor: "#fff",
    padding: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
});
