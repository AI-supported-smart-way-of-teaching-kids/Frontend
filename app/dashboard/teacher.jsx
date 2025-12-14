// Teacher.jsx
import React, { useEffect, useState, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const STORAGE = {
  LESSONS: "@app_lessons_v1",
  VIDEOS: "@app_videos_v1",
  QUIZZES: "@app_quizzes_v1",
  // progress for teachers - tracks per student
  PROGRESS: "@app_progress_v1",
  STUDENT_PROGRESS: "@app_student_progress_v1", // { studentId: { lessonsCompleted: [], videosCompleted: [], quizResults: [] } }
};

// small AnimatedPressable (copy of Kids style)
const AnimatedPressable = ({ children, onPress, style }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.timing(scale, {
      toValue: 0.98,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  const onPressOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function TeacherDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  // Data
  const [lessons, setLessons] = useState([]);
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState({}); // object keyed by id

  // Local UI state
  const [selectedSection, setSelectedSection] = useState("dashboard"); // dashboard | lessons | videos | quizzes | progress
  const [detail, setDetail] = useState(null); // optional inline detail like Kids

  // Lesson form / edit
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonCategory, setLessonCategory] = useState("");
  const [lessonPdfUri, setLessonPdfUri] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);

  // Video form / edit
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoUri, setVideoUri] = useState(null);
  const [editingVideoId, setEditingVideoId] = useState(null);

  // Quiz builder
  const [quizTitle, setQuizTitle] = useState("");
  const [quizQuestions, setQuizQuestions] = useState([]); // array of { question, options:[], answerIndex }
  // current question inputs
  const [qText, setQText] = useState("");
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qAnswerIndex, setQAnswerIndex] = useState(null);
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [editingQuizTitle, setEditingQuizTitle] = useState("");
  const [editingQuizQuestions, setEditingQuizQuestions] = useState([]);

  // progress (teacher view)
  const [progress, setProgress] = useState([]);
  const [studentProgress, setStudentProgress] = useState({}); // { studentId: { name, lessonsCompleted, videosCompleted, quizResults } }

  // load stored data
  useEffect(() => {
    (async () => {
      try {
        const [rawLessons, rawVideos, rawQuizzes, rawProgress, rawStudentProgress] = await Promise.all([
          AsyncStorage.getItem(STORAGE.LESSONS),
          AsyncStorage.getItem(STORAGE.VIDEOS),
          AsyncStorage.getItem(STORAGE.QUIZZES),
          AsyncStorage.getItem(STORAGE.PROGRESS),
          AsyncStorage.getItem(STORAGE.STUDENT_PROGRESS),
        ]);
        setLessons(rawLessons ? JSON.parse(rawLessons) : []);
        setVideos(rawVideos ? JSON.parse(rawVideos) : []);
        setQuizzes(rawQuizzes ? JSON.parse(rawQuizzes) : {});
        setProgress(rawProgress ? JSON.parse(rawProgress) : []);
        setStudentProgress(rawStudentProgress ? JSON.parse(rawStudentProgress) : {});
      } catch (e) {
        console.warn("Teacher: failed to load data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // generic save helpers
  const persist = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("Persist error", key, e);
    }
  };

  // ---------- LESSONS ----------
  const pickLessonPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      
      // expo-document-picker v14+ returns { canceled: boolean, assets: [...] }
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setLessonPdfUri(file.uri);
        Alert.alert("Success", `PDF "${file.name || 'file'}" selected successfully!`);
      } else if (result.type === "success") {
        // Fallback for older API format
        setLessonPdfUri(result.uri);
        Alert.alert("Success", `PDF "${result.name || 'file'}" selected successfully!`);
      }
    } catch (e) {
      console.warn("pickLessonPdf error", e);
      Alert.alert("Error", "Failed to pick PDF file. Please try again.");
    }
  };

  const addLesson = async () => {
    if (!lessonTitle.trim()) {
      Alert.alert("Please enter a lesson title.");
      return;
    }
    if (!lessonPdfUri) {
      Alert.alert("Please upload a PDF file for the lesson.");
      return;
    }
    const item = {
      id: Date.now().toString(),
      title: lessonTitle.trim(),
      description: lessonDescription.trim(),
      category: lessonCategory.trim(),
      pdfUri: lessonPdfUri,
      createdAt: new Date().toISOString(),
    };
    const updated = [item, ...lessons];
    setLessons(updated);
    await persist(STORAGE.LESSONS, updated);
    Alert.alert("Success", "Lesson uploaded successfully!");
    setLessonTitle("");
    setLessonDescription("");
    setLessonCategory("");
    setLessonPdfUri(null);
  };

  const startEditLesson = (id) => {
    const l = lessons.find((x) => x.id === id);
    if (!l) return;
    setEditingLessonId(id);
    setLessonTitle(l.title);
    setLessonDescription(l.description || "");
    setLessonCategory(l.category || "");
    setLessonPdfUri(l.pdfUri || null);
  };

  const saveEditLesson = async () => {
    if (!editingLessonId) return;
    const updated = lessons.map((l) =>
      l.id === editingLessonId ? { ...l, title: lessonTitle, description: lessonDescription, category: lessonCategory, pdfUri: lessonPdfUri || l.pdfUri } : l
    );
    setLessons(updated);
    await persist(STORAGE.LESSONS, updated);
    setEditingLessonId(null);
    setLessonTitle("");
    setLessonDescription("");
    setLessonCategory("");
    setLessonPdfUri(null);
  };

  const deleteLesson = (id) => {
    Alert.alert("Delete lesson", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = lessons.filter((l) => l.id !== id);
          setLessons(updated);
          await persist(STORAGE.LESSONS, updated);
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
        setVideoUri(file.uri);
        Alert.alert("Success", `Video "${file.name || 'file'}" selected successfully!`);
      } else if (result.type === "success") {
        // Fallback for older API format
        setVideoUri(result.uri);
        Alert.alert("Success", `Video "${result.name || 'file'}" selected successfully!`);
      }
    } catch (e) {
      console.warn("pickVideo error", e);
      Alert.alert("Error", "Failed to pick video file. Please try again.");
    }
  };

  const addVideo = async () => {
    if (!videoTitle.trim() || !videoUri) {
      Alert.alert("Please enter title and pick a video file.");
      return;
    }
    const item = {
      id: Date.now().toString(),
      title: videoTitle.trim(),
      description: videoDescription.trim(),
      uri: videoUri,
      createdAt: new Date().toISOString(),
    };
    const updated = [item, ...videos];
    setVideos(updated);
    await persist(STORAGE.VIDEOS, updated);
    Alert.alert("Success", "Video uploaded successfully!");
    setVideoTitle("");
    setVideoDescription("");
    setVideoUri(null);
  };

  const startEditVideo = (id) => {
    const v = videos.find((x) => x.id === id);
    if (!v) return;
    setEditingVideoId(id);
    setVideoTitle(v.title);
    setVideoDescription(v.description || "");
    setVideoUri(v.uri || null);
  };

  const saveEditVideo = async () => {
    if (!editingVideoId) return;
    const updated = videos.map((v) => (v.id === editingVideoId ? { ...v, title: videoTitle, description: videoDescription, uri: videoUri } : v));
    setVideos(updated);
    await persist(STORAGE.VIDEOS, updated);
    setEditingVideoId(null);
    setVideoTitle("");
    setVideoDescription("");
    setVideoUri(null);
  };

  const deleteVideo = (id) => {
    Alert.alert("Delete video", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
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
  // add a question to the current quiz being built
  const addQuestionToBuilder = () => {
    if (!qText.trim()) {
      Alert.alert("Enter question text");
      return;
    }
    if (qOptions.some((o) => !o.trim())) {
      Alert.alert("Fill all options");
      return;
    }
    if (qAnswerIndex === null || isNaN(qAnswerIndex) || qAnswerIndex < 0 || qAnswerIndex >= qOptions.length) {
      Alert.alert("Select valid correct option index");
      return;
    }
    const questionObj = {
      id: Date.now().toString(),
      question: qText.trim(),
      options: qOptions.map((o) => o.trim()),
      answerIndex: Number(qAnswerIndex),
    };
    setQuizQuestions([questionObj, ...quizQuestions]);
    setQText("");
    setQOptions(["", "", "", ""]);
    setQAnswerIndex(null);
  };

  const saveQuiz = async () => {
    if (!quizTitle.trim()) {
      Alert.alert("Enter quiz title");
      return;
    }
    if (quizQuestions.length === 0) {
      Alert.alert("Add at least one question");
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
      Alert.alert("Quiz title required");
      return;
    }
    if (!editingQuizQuestions || editingQuizQuestions.length === 0) {
      Alert.alert("Quiz must have at least one question");
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
    Alert.alert("Delete quiz", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
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
              {type === "lessons" ? "📘 " : type === "videos" ? "🎬 " : "❓ "}
              {item.title}
            </Text>
            <View style={styles.cardBadge}>
              <Text style={styles.cardBadgeText}>{type === "lessons" ? item.category || "Lesson" : type}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
        </View>
      </AnimatedPressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4c1d95" />
        <Text style={{ marginTop: 10, color: "#444" }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // Section toggles: dashboard / lessons / videos / quizzes / progress
  return (
    <SafeAreaView style={styles.container}>
      {/* header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Image 
            source={require("../../assets/images/kidsicon.jpg")} 
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }}
            resizeMode="cover"
          />
          <Text style={styles.headerText}>Teacher Dashboard</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.push("/profile")} style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={28} color="#4c1d95" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(drawer)/login")} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* dashboard or lists */}
      {detail ? (
        // Inline detail / preview
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, borderBottomWidth: 1, borderColor: "#eee" }}>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }} onPress={() => setDetail(null)}>
              <Ionicons name="arrow-back" size={22} color="#333" />
              <Text style={{ marginLeft: 8, fontWeight: "800" }}>Back</Text>
            </TouchableOpacity>
          </View>

          {detail.type === "lessons" && (
            <ScrollView contentContainerStyle={{ padding: 18 }}>
              <Text style={styles.lessonTitle}>{detail.item.title}</Text>
              <Text style={styles.lessonDesc}>{detail.item.description || "No description"}</Text>
              <Text style={{ marginTop: 12, color: "#666" }}>Category: {detail.item.category || "—"}</Text>
              {detail.item.pdfUri ? (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: "#f0f0f0", borderRadius: 8 }}>
                  <Ionicons name="document-text" size={24} color="#4c1d95" />
                  <Text style={{ marginTop: 4, color: "#666" }}>PDF uploaded</Text>
                </View>
              ) : (
                <Text style={{ marginTop: 12, color: "#999", fontStyle: "italic" }}>No PDF uploaded</Text>
              )}

              <View style={{ flexDirection: "row", marginTop: 18 }}>
                <TouchableOpacity
                  style={[styles.smallBtn, { marginRight: 12 }]}
                  onPress={() => {
                    // start editing this lesson
                    startEditLesson(detail.item.id);
                    setDetail(null);
                    setSelectedSection("lessons");
                  }}
                >
                  <Text style={styles.smallBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" }]}
                  onPress={() => deleteLesson(detail.item.id)}
                >
                  <Text style={[styles.smallBtnText, { color: "red" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {detail.type === "videos" && (
            <View style={{ flex: 1 }}>
              <View style={{ padding: 18 }}>
                <Text style={styles.lessonTitle}>{detail.item.title}</Text>
                <Text style={{ marginTop: 8 }}>{detail.item.description || "No description"}</Text>
                <Text style={{ marginTop: 8, color: "#666" }}>URI: {detail.item.uri}</Text>
              </View>

              <View style={{ padding: 18 }}>
                <TouchableOpacity
                  style={styles.smallBtn}
                  onPress={() => {
                    startEditVideo(detail.item.id);
                    setDetail(null);
                    setSelectedSection("videos");
                  }}
                >
                  <Text style={styles.smallBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {detail.type === "quizzes" && (
            <ScrollView contentContainerStyle={{ padding: 18 }}>
              <Text style={[styles.lessonTitle, { marginBottom: 12 }]}>{detail.item.title}</Text>
              {(detail.item.questions || []).map((q, i) => (
                <View key={q.id || i} style={{ marginBottom: 12 }}>
                  <Text style={{ fontWeight: "800" }}>{i + 1}. {q.question}</Text>
                  {q.options.map((o, j) => (
                    <Text key={j} style={{ marginLeft: 12, color: q.answerIndex === j ? "green" : "#111" }}>
                      • {o}
                    </Text>
                  ))}
                </View>
              ))}

              <View style={{ flexDirection: "row", marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.smallBtn, { marginRight: 12 }]}
                  onPress={() => {
                    startEditQuiz(detail.item.id);
                    setDetail(null);
                    setSelectedSection("quizzes");
                  }}
                >
                  <Text style={styles.smallBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd" }]} onPress={() => deleteQuiz(detail.item.id)}>
                  <Text style={[styles.smallBtnText, { color: "red" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      ) : (
        // Main content
        <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
          {/* Dashboard */}
          {selectedSection === "dashboard" && (
            <>
              {/* Active Students Count */}
              <View style={styles.statsCard}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={32} color="#4c1d95" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.statValue}>{Object.keys(studentProgress).length}</Text>
                    <Text style={styles.statLabel}>Active Students</Text>
                  </View>
                </View>
              </View>

              <View style={styles.gridRow}>
                <AnimatedPressable onPress={() => setSelectedSection("lessons")} style={{ width: "48%" }}>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardCardTitle}>📘 Lessons</Text>
                    <Text style={styles.dashboardCardSubtitle}>{lessons.length} available</Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable onPress={() => setSelectedSection("videos")} style={{ width: "48%" }}>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardCardTitle}>🎬 Videos</Text>
                    <Text style={styles.dashboardCardSubtitle}>{videos.length} available</Text>
                  </View>
                </AnimatedPressable>
              </View>

              <View style={styles.gridRow}>
                <AnimatedPressable onPress={() => setSelectedSection("quizzes")} style={{ width: "48%" }}>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardCardTitle}>❓ Quizzes</Text>
                    <Text style={styles.dashboardCardSubtitle}>{Object.keys(quizzes).length} available</Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable onPress={() => { setSelectedSection("progress"); refreshProgress(); }} style={{ width: "48%" }}>
                  <View style={styles.dashboardCard}>
                    <Text style={styles.dashboardCardTitle}>📊 Progress</Text>
                    <Text style={styles.dashboardCardSubtitle}>View Analytics</Text>
                  </View>
                </AnimatedPressable>
              </View>
            </>
          )}

          {/* LESSONS MANAGEMENT */}
          {selectedSection === "lessons" && (
            <View>
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>

              <View style={styles.card}>
                <Text style={styles.title}>➕ Add / Edit Lesson</Text>

                <TextInput style={styles.input} placeholder="Lesson title" value={lessonTitle} onChangeText={setLessonTitle} />
                <TextInput style={styles.input} placeholder="Description" value={lessonDescription} onChangeText={setLessonDescription} />
                <TextInput style={styles.input} placeholder="Category" value={lessonCategory} onChangeText={setLessonCategory} />

                <TouchableOpacity style={styles.fileBtn} onPress={pickLessonPdf}>
                  <Ionicons name="document-text-outline" size={20} color={lessonPdfUri ? "#4c1d95" : "#333"} />
                  <Text style={{ marginLeft: 8, color: lessonPdfUri ? "#4c1d95" : "#333", fontWeight: lessonPdfUri ? "700" : "400" }}>
                    {lessonPdfUri ? "✓ PDF selected" : "Pick PDF file"}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  {editingLessonId ? (
                    <>
                      <TouchableOpacity style={styles.btn} onPress={saveEditLesson}>
                        <Text style={styles.btnText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: "#ddd" }]} onPress={() => { setEditingLessonId(null); setLessonTitle(""); setLessonDescription(""); setLessonCategory(""); setLessonPdfUri(null); }}>
                        <Text>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.btn} onPress={addLesson}>
                      <Text style={styles.btnText}>Add Lesson</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={{ fontWeight: "900", marginTop: 8 }}>All Lessons</Text>
              {lessons.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>No lessons yet.</Text></View>
              ) : (
                lessons.map((l) => (
                  <View key={l.id} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{l.title}</Text>
                      {l.category ? <Text style={{ color: "#666", marginTop: 4 }}>{l.category}</Text> : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity onPress={() => startEditLesson(l.id)}><Ionicons name="pencil" size={20} color="#007AFF" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => { setDetail({ type: "lessons", item: l }); }}><Ionicons name="eye" size={20} color="#333" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteLesson(l.id)}><Ionicons name="trash" size={20} color="red" /></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* VIDEOS MANAGEMENT */}
          {selectedSection === "videos" && (
            <View>
              <TouchableOpacity onPress={() => setSelectedSection("dashboard")} style={{ marginBottom: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>

              <View style={styles.card}>
                <Text style={styles.title}>➕ Add / Edit Video</Text>

                <TextInput style={styles.input} placeholder="Video title" value={videoTitle} onChangeText={setVideoTitle} />
                <TextInput style={styles.input} placeholder="Description" value={videoDescription} onChangeText={setVideoDescription} />

                <TouchableOpacity style={styles.fileBtn} onPress={pickVideo}>
                  <Ionicons name="videocam-outline" size={20} color={videoUri ? "#4c1d95" : "#333"} />
                  <Text style={{ marginLeft: 8, color: videoUri ? "#4c1d95" : "#333", fontWeight: videoUri ? "700" : "400" }}>
                    {videoUri ? "✓ Video selected" : "Pick video file"}
                  </Text>
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 8 }}>
                  {editingVideoId ? (
                    <>
                      <TouchableOpacity style={styles.btn} onPress={saveEditVideo}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: "#ddd" }]} onPress={() => { setEditingVideoId(null); setVideoTitle(""); setVideoDescription(""); setVideoUri(null); }}>
                        <Text>Cancel</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.btn} onPress={addVideo}><Text style={styles.btnText}>Add Video</Text></TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={{ fontWeight: "900", marginTop: 8 }}>All Videos</Text>
              {videos.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyText}>No videos yet.</Text></View>
              ) : (
                videos.map((v) => (
                  <View key={v.id} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{v.title}</Text>
                      {v.description ? <Text style={{ color: "#666", marginTop: 4 }}>{v.description}</Text> : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity onPress={() => startEditVideo(v.id)}><Ionicons name="pencil" size={20} color="#007AFF" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => setDetail({ type: "videos", item: v })}><Ionicons name="eye" size={20} color="#333" /></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteVideo(v.id)}><Ionicons name="trash" size={20} color="red" /></TouchableOpacity>
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
                <Text style={styles.title}>{editingQuizId ? "✏️ Edit Quiz" : "➕ Create Quiz"}</Text>

                <TextInput style={styles.input} placeholder="Quiz title" value={editingQuizId ? editingQuizTitle : quizTitle} onChangeText={(t) => (editingQuizId ? setEditingQuizTitle(t) : setQuizTitle(t))} />

                {/* Builder area */}
                <Text style={{ fontWeight: "800", marginTop: 8 }}>{editingQuizId ? "Questions (editing)" : "Add question"}</Text>

                <TextInput style={styles.input} placeholder="Question text" value={qText} onChangeText={setQText} />
                {qOptions.map((opt, idx) => (
                  <TextInput key={idx} style={styles.input} placeholder={`Option ${idx + 1}`} value={opt} onChangeText={(t) => { const arr = [...qOptions]; arr[idx] = t; setQOptions(arr); }} />
                ))}

                <TextInput style={styles.input} placeholder="Correct option index (0-3)" keyboardType="number-pad" value={qAnswerIndex !== null ? String(qAnswerIndex) : ""} onChangeText={(t) => setQAnswerIndex(t === "" ? null : Number(t))} />

                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity style={styles.btn} onPress={addQuestionToBuilder}><Text style={styles.btnText}>Add Question</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: "#ddd" }]} onPress={() => { setQText(""); setQOptions(["", "", "", ""]); setQAnswerIndex(null); }}>
                    <Text>Clear</Text>
                  </TouchableOpacity>
                </View>

                {/* Preview added questions */}
                {quizQuestions.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontWeight: "800" }}>Preview Questions</Text>
                    {quizQuestions.map((qq, i) => (
                      <View key={qq.id} style={{ marginTop: 8 }}>
                        <Text style={{ fontWeight: "700" }}>{i + 1}. {qq.question}</Text>
                        {qq.options.map((o, j) => <Text key={j} style={{ marginLeft: 12, color: qq.answerIndex === j ? "green" : "#111" }}>• {o}</Text>)}
                      </View>
                    ))}
                  </View>
                )}

                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  {!editingQuizId ? (
                    <TouchableOpacity style={styles.btn} onPress={saveQuiz}><Text style={styles.btnText}>Save Quiz</Text></TouchableOpacity>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.btn} onPress={saveEditQuiz}><Text style={styles.btnText}>Save Changes</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.btn, { backgroundColor: "#ddd" }]} onPress={() => { setEditingQuizId(null); setEditingQuizTitle(""); setEditingQuizQuestions([]); }}>
                        <Text>Cancel</Text>
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
                <Text style={styles.cardTitle}>Overall Statistics</Text>
                <View style={styles.statRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{lessons.length}</Text>
                    <Text style={styles.statLabel}>Lessons</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{videos.length}</Text>
                    <Text style={styles.statLabel}>Videos</Text>
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
                  <Text style={styles.cardTitle}>📈 Overall Completion Rate</Text>
                  {Object.entries(studentProgress).map(([studentId, data]) => {
                    const lessonsProgress = lessons.length > 0 ? (data.lessonsCompleted?.length || 0) / lessons.length * 100 : 0;
                    const videosProgress = videos.length > 0 ? (data.videosCompleted?.length || 0) / videos.length * 100 : 0;
                    const quizzesProgress = Object.keys(quizzes).length > 0 ? (data.quizResults?.length || 0) / Object.keys(quizzes).length * 100 : 0;
                    const overallProgress = (lessonsProgress + videosProgress + quizzesProgress) / 3;
                    
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
                            <Text style={styles.progressLabel}>Lessons: {Math.round(lessonsProgress)}%</Text>
                            <View style={styles.miniProgressBar}>
                              <View style={[styles.miniProgressFill, { width: `${lessonsProgress}%`, backgroundColor: "#4c1d95" }]} />
                            </View>
                          </View>
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
                            <Text style={{ fontWeight: "700" }}>Student: {r.studentName || "Unknown"}</Text>
                            <Text style={{ marginTop: 4 }}>Date: {new Date(r.date).toLocaleDateString()}</Text>
                            <Text style={{ marginTop: 4, color: r.score >= 70 ? "green" : r.score >= 50 ? "orange" : "red", fontWeight: "700" }}>
                              Score: {r.score}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ marginTop: 6, fontStyle: "italic", color: "#999" }}>Not attempted yet</Text>
                    )}
                  </View>
                ))
              )}

              {/* Student Progress Summary */}
              <Text style={{ fontWeight: "900", marginTop: 16, marginBottom: 8 }}>Student Progress Summary</Text>
              {Object.keys(studentProgress).length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No student progress data available yet.</Text>
                </View>
              ) : (
                Object.entries(studentProgress).map(([studentId, data]) => (
                  <View key={studentId} style={[styles.card, { paddingVertical: 12 }]}>
                    <Text style={styles.cardTitle}>👤 {data.name || studentId}</Text>
                    <Text style={{ marginTop: 8 }}>Lessons Completed: {data.lessonsCompleted?.length || 0} / {lessons.length}</Text>
                    <Text style={{ marginTop: 4 }}>Videos Watched: {data.videosCompleted?.length || 0} / {videos.length}</Text>
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

// Styles (match Kids.jsx look & feel)
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
  headerText: { fontSize: 22, fontWeight: "900", color: "#111" },
  profileBtn: {
    padding: 6,
    borderRadius: 8,
  },
  logoutBtn: {
    backgroundColor: "#EF4444",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutText: { color: "#fff", fontWeight: "700" },
  contentScroll: { padding: 12, flexGrow: 1, paddingBottom: 36 },
  gridRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 12 },
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
  title: { fontSize: 18, fontWeight: "900", marginBottom: 8 },
  input: { backgroundColor: "#F3F3F3", padding: 10, borderRadius: 8, marginBottom: 10 },
  fileBtn: { backgroundColor: "#eee", padding: 10, borderRadius: 8, marginBottom: 10, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  btn: { backgroundColor: "#4c1d95", padding: 10, borderRadius: 8, marginBottom: 10, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "800" },
  item: { backgroundColor: "#fff", padding: 14, borderRadius: 10, marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemTitle: { fontWeight: "800" },
  emptyBox: { marginTop: 18, padding: 18, alignItems: "center", justifyContent: "center" },
  emptyText: { marginTop: 8, color: "#777", fontSize: 15, fontWeight: "600" },
  cardTitle: { fontWeight: "900", fontSize: 16 },
  lessonTitle: { fontSize: 22, fontWeight: "900" },
  lessonDesc: { marginTop: 10, fontSize: 16, lineHeight: 22, color: "#444" },
  smallBtn: { padding: 10, backgroundColor: "#4c1d95", borderRadius: 8 },
  smallBtnText: { color: "#fff", fontWeight: "800" },

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
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#4c1d95",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 12,
  },
  statBox: {
    alignItems: "center",
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
});
