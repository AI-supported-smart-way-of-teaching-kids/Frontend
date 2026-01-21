import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    TextInput,
    Image,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as lessonsApi from "../../../src/services/lessonsApi";
import i18n from "../../../i18n";
import { Video, ResizeMode } from "expo-av";

export default function CollectionDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [collection, setCollection] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showAddModal, setShowAddModal] = useState(false);
    const [videoTitle, setVideoTitle] = useState("");
    const [videoDescription, setVideoDescription] = useState("");
    const [videoUrl, setVideoUrl] = useState("");
    const [thumbnailUrl, setThumbnailUrl] = useState("");
    const [durationSeconds, setDurationSeconds] = useState("");
    const [videoDifficulty, setVideoDifficulty] = useState("easy");
    const [videoTags, setVideoTags] = useState("");
    const [videoIsPublished, setVideoIsPublished] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingVideoId, setEditingVideoId] = useState(null);
    const [selectedVideo, setSelectedVideo] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);

            // Load collection details
            const colData = await lessonsApi.getCollection(id);
            setCollection(colData);

            // Load videos for this collection
            const videosData = await lessonsApi.getLessons({ collection: id });
            const list = Array.isArray(videosData) ? videosData : videosData.results || [];
            setVideos(list);
        } catch (error) {
            console.warn("Failed to load collection data:", error);
            Alert.alert(i18n.t("error"), "Failed to load collection details.");
            router.back();
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadData();
    }, [id, loadData]);

    const pickVideo = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "video/*",
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setVideoUrl(result.assets[0].uri);
            } else if (result.type === "success") {
                setVideoUrl(result.uri);
            }
        } catch (e) {
            console.warn("Pick video error:", e);
            Alert.alert(i18n.t("error"), "Failed to pick video.");
        }
    };

    const pickThumbnail = async () => {
        try {
            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permission.granted) {
                Alert.alert(i18n.t("permissionRequired"), "Please allow gallery access.");
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
            console.warn("Pick thumbnail error:", e);
            Alert.alert(i18n.t("error"), "Failed to pick thumbnail.");
        }
    };

    const handleDeleteVideo = (videoId) => {
        Alert.alert(
            i18n.t("delete"),
            "Are you sure you want to delete this video?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await lessonsApi.deleteLesson(videoId);
                            setVideos((prev) => prev.filter((v) => v.id !== videoId));
                            Alert.alert("Deleted", "Video has been removed.");
                        } catch (error) {
                            console.error("Delete error:", error);
                            Alert.alert("Error", "Failed to delete video.");
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const handleEditVideo = (video) => {
        setEditingVideoId(video.id);
        setVideoTitle(video.title);
        setVideoDescription(video.description || "");
        setVideoUrl(video.video_url || video.video || "");
        setThumbnailUrl(video.thumbnail_url || video.thumbnail || "");
        setDurationSeconds(video.duration_seconds ? String(video.duration_seconds) : "");
        setVideoDifficulty(video.difficulty || "easy");
        setVideoTags(Array.isArray(video.tags) ? video.tags.join(", ") : video.tags || "");
        setVideoIsPublished(video.is_published !== false);
        setShowAddModal(true);
    };


    const uploadFile = async (uri, type) => {
        if (!uri) return null;

        // If it's already a remote URL, return it as is
        if (uri.startsWith('http') && !uri.startsWith('file') && !uri.startsWith('blob')) {
            return uri;
        }

        const formData = new FormData();
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1] : type === 'video' ? 'mp4' : 'jpg';

        formData.append('file', {
            uri: uri,
            name: `upload.${ext}`,
            type: type === 'video' ? `video/${ext}` : `image/${ext}`,
        });
        formData.append('title', 'Lesson Media');

        try {
            const response = await lessonsApi.createMediaUpload(formData);
            return response.file; // The backend returns the full URL in the 'file' field
        } catch (error) {
            console.error("Upload failed:", error);
            throw new Error("Media upload failed");
        }
    };

    const handleSaveVideo = async () => {
        if (!videoTitle.trim()) {
            Alert.alert(i18n.t("error"), "Title is required.");
            return;
        }
        if (!videoUrl.trim()) {
            Alert.alert(i18n.t("error"), "Video file/URL is required.");
            return;
        }

        try {
            setUploading(true);

            // 1. Upload Media First
            let finalVideoUrl = videoUrl;
            let finalThumbnailUrl = thumbnailUrl;

            if (videoUrl && !videoUrl.startsWith('http')) {
                finalVideoUrl = await uploadFile(videoUrl, 'video');
            }

            if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
                finalThumbnailUrl = await uploadFile(thumbnailUrl, 'image');
            }

            // 2. Create Lesson Payload
            const payload = {
                title: videoTitle.trim(),
                description: videoDescription.trim(),
                video_url: finalVideoUrl,
                thumbnail_url: finalThumbnailUrl || null,
                duration_seconds: durationSeconds ? parseInt(durationSeconds) : 0,
                difficulty: videoDifficulty,
                collection: parseInt(id),
                tags: videoTags.split(",").map((t) => t.trim()).filter((t) => t),
                is_published: videoIsPublished,
            };

            if (editingVideoId) {
                // UPDATE
                const updatedVideo = await lessonsApi.updateLesson(editingVideoId, payload);
                setVideos((prev) => prev.map((v) => (v.id === editingVideoId ? updatedVideo : v)));
                Alert.alert(i18n.t("success"), "Video updated successfully!");
            } else {
                // CREATE
                const newVideo = await lessonsApi.createLesson(payload);
                setVideos((prev) => [newVideo, ...prev]);
                Alert.alert(i18n.t("success"), "Video added successfully!");
            }

            // Reset form
            closeModal();
        } catch (error) {
            console.error("Save video error:", error);
            Alert.alert(i18n.t("error"), "Failed to save video. Please check your connection.");
        } finally {
            setUploading(false);
        }
    };

    const closeModal = () => {
        setEditingVideoId(null);
        setVideoTitle("");
        setVideoDescription("");
        setVideoUrl("");
        setThumbnailUrl("");
        setDurationSeconds("");
        setVideoDifficulty("easy");
        setVideoTags("");
        setVideoIsPublished(true);
        setShowAddModal(false);
    };

    const renderVideoItem = ({ item }) => {

        return (
            <View style={styles.videoCard}>
                <TouchableOpacity
                    style={styles.mediaContainer}
                    onPress={() => setSelectedVideo(item)}
                >
                    <Image
                        source={{ uri: item.thumbnail_url || item.thumbnail || "https://placehold.co/600x400/png?text=No+Thumbnail" }}
                        style={styles.thumbnail}
                    />
                    <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                    </View>
                </TouchableOpacity>

                <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.videoMeta} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.tagsRow}>
                        <View style={[styles.badge, { backgroundColor: item.difficulty === 'hard' ? '#FEE2E2' : item.difficulty === 'medium' ? '#FEF3C7' : '#DCFCE7' }]}>
                            <Text style={[styles.badgeText, { color: item.difficulty === 'hard' ? '#DC2626' : item.difficulty === 'medium' ? '#D97706' : '#16A34A' }]}>
                                {item.difficulty || 'easy'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity onPress={() => handleEditVideo(item)} style={styles.actionBtn}>
                            <Ionicons name="pencil" size={18} color="#2563EB" />
                            <Text style={styles.actionText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteVideo(item.id)} style={[styles.actionBtn, { marginLeft: 12 }]}>
                            <Ionicons name="trash" size={18} color="#EF4444" />
                            <Text style={[styles.actionText, { color: "#EF4444" }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.push("/dashboard/collections");
                        }
                    }}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={28} color="#0F172A" />
                </TouchableOpacity>
                <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{collection?.title || "Collection"}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
                    <Ionicons name="add" size={24} color="#2563EB" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={videos}
                    renderItem={renderVideoItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="videocam-off-outline" size={48} color="#94A3B8" />
                            <Text style={styles.emptyText}>No videos in this collection yet.</Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowAddModal(true)}>
                                <Text style={styles.emptyBtnText}>Add Video</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Add Video Modal */}
            <Modal
                visible={showAddModal}
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={{ flex: 1 }}
                    >
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={closeModal}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{editingVideoId ? "Edit Video" : "Add New Video"}</Text>
                            <TouchableOpacity onPress={handleSaveVideo} disabled={uploading}>
                                {uploading ? (
                                    <ActivityIndicator size="small" color="#2563EB" />
                                ) : (
                                    <Text style={styles.saveText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={[{ key: 'form' }]}
                            keyExtractor={(item) => item.key}
                            renderItem={() => (
                                <View style={styles.formContent}>
                                    <Text style={styles.label}>Title *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Lesson title"
                                        value={videoTitle}
                                        onChangeText={setVideoTitle}
                                    />

                                    <Text style={styles.label}>Description</Text>
                                    <TextInput
                                        style={[styles.input, styles.textArea]}
                                        placeholder="Describe this lesson..."
                                        value={videoDescription}
                                        onChangeText={setVideoDescription}
                                        multiline
                                        numberOfLines={3}
                                    />

                                    <Text style={styles.label}>Video File/URL *</Text>
                                    <View style={styles.fileRow}>
                                        <TextInput
                                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                            placeholder="Use picker or paste URL"
                                            value={videoUrl}
                                            onChangeText={setVideoUrl}
                                        />
                                        <TouchableOpacity style={styles.iconBtn} onPress={pickVideo}>
                                            <Ionicons name="folder-open-outline" size={24} color="#2563EB" />
                                        </TouchableOpacity>
                                    </View>

                                    <Text style={styles.label}>Thumbnail (Optional)</Text>
                                    <TouchableOpacity style={styles.uploadBox} onPress={pickThumbnail}>
                                        {thumbnailUrl ? (
                                            <Image source={{ uri: thumbnailUrl }} style={styles.previewImage} />
                                        ) : (
                                            <View style={styles.placeholderBox}>
                                                <Ionicons name="image-outline" size={24} color="#64748B" />
                                                <Text style={styles.placeholderText}>Pick Thumbnail</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.row}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.label}>Duration (sec)</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="0"
                                                keyboardType="numeric"
                                                value={durationSeconds}
                                                onChangeText={setDurationSeconds}
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={styles.label}>Difficulty</Text>
                                            <View style={styles.difficultyRow}>
                                                {['easy', 'medium', 'hard'].map((level) => (
                                                    <TouchableOpacity
                                                        key={level}
                                                        style={[
                                                            styles.diffBtn,
                                                            videoDifficulty === level && styles.diffBtnSelected,
                                                            { backgroundColor: videoDifficulty === level ? (level === 'hard' ? '#FEE2E2' : level === 'medium' ? '#FEF3C7' : '#DCFCE7') : '#F1F5F9' }
                                                        ]}
                                                        onPress={() => setVideoDifficulty(level)}
                                                    >
                                                        <Text style={{
                                                            fontSize: 12,
                                                            fontWeight: '600',
                                                            color: videoDifficulty === level ? (level === 'hard' ? '#DC2626' : level === 'medium' ? '#D97706' : '#16A34A') : '#64748B'
                                                        }}>
                                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    </View>

                                    <Text style={styles.label}>Tags (comma separated)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="math, colors, shapes"
                                        value={videoTags}
                                        onChangeText={setVideoTags}
                                    />

                                    <View style={styles.switchRow}>
                                        <Text style={styles.label}>Published</Text>
                                        <TouchableOpacity
                                            style={[styles.switch, videoIsPublished && styles.switchActive]}
                                            onPress={() => setVideoIsPublished(!videoIsPublished)}
                                        >
                                            <View style={[styles.switchThumb, videoIsPublished && styles.switchThumbActive]} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        />
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Modal>
            {/* Full Screen Video Modal */}
            <Modal
                visible={!!selectedVideo}
                animationType="fade"
                transparent={false}
                onRequestClose={() => setSelectedVideo(null)}
            >
                <SafeAreaView style={styles.fullScreenContainer}>
                    <View style={styles.fullScreenHeader}>
                        <TouchableOpacity
                            onPress={() => setSelectedVideo(null)}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.fullScreenTitle} numberOfLines={1}>
                            {selectedVideo?.title}
                        </Text>
                    </View>
                    <View style={styles.fullScreenVideoWrapper}>
                        {selectedVideo && (
                            <Video
                                source={{ uri: selectedVideo.video_url || selectedVideo.video }}
                                style={styles.fullScreenVideo}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay
                            />
                        )}
                    </View>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },
    backButton: {
        padding: 4,
    },
    addButton: {
        padding: 4,
    },
    listContent: {
        padding: 16,
    },
    videoCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    thumbnail: {
        width: 140,
        height: 90,
        borderRadius: 8,
        backgroundColor: "#E2E8F0",
    },
    mediaContainer: {
        width: 140,
        height: 90,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
    },
    videoPlayer: {
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
    },
    thumbnailContainer: {
        width: "100%",
        height: "100%",
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.2)",
    },
    videoInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'space-between',
    },
    actionRow: {
        flexDirection: "row",
        marginTop: 8,
        alignItems: "center",
    },
    actionBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: "#F1F5F9",
        borderRadius: 6,
    },
    actionText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#2563EB",
        marginLeft: 4,
    },
    videoTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0F172A",
        marginBottom: 4,
    },
    videoMeta: {
        fontSize: 13,
        color: "#64748B",
        marginBottom: 6,
    },
    tagsRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 4,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: "700",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyContainer: {
        alignItems: "center",
        marginTop: 60,
    },
    emptyText: {
        fontSize: 16,
        color: "#94A3B8",
        marginVertical: 16,
    },
    emptyBtn: {
        backgroundColor: "#2563EB",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    emptyBtnText: {
        color: "#fff",
        fontWeight: "600",
    },
    // Modal Styles
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    cancelText: {
        fontSize: 16,
        color: "#64748B",
    },
    saveText: {
        fontSize: 16,
        color: "#2563EB",
        fontWeight: "700",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    formContent: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: "#F1F5F9",
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: "#0F172A",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    textArea: {
        minHeight: 100,
        textAlignVertical: "top",
    },
    fileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    iconBtn: {
        backgroundColor: "#EFF6FF",
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#DBEAFE",
    },
    uploadBox: {
        height: 150,
        backgroundColor: "#F8FAFC",
        borderWidth: 2,
        borderColor: "#E2E8F0",
        borderStyle: "dashed",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    previewImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    placeholderBox: {
        alignItems: "center",
    },
    placeholderText: {
        marginTop: 8,
        color: "#64748B",
        fontSize: 14,
    },
    row: {
        flexDirection: "row",
    },
    difficultyRow: {
        flexDirection: "row",
        gap: 4,
    },
    diffBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: "center",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "transparent",
    },
    diffBtnSelected: {
        borderColor: "rgba(0,0,0,0.1)",
    },
    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 16,
        marginBottom: 30,
    },
    switch: {
        width: 50,
        height: 30,
        backgroundColor: "#E2E8F0",
        borderRadius: 15,
        padding: 2,
    },
    switchActive: {
        backgroundColor: "#22C55E",
    },
    switchThumb: {
        width: 26,
        height: 26,
        backgroundColor: "#fff",
        borderRadius: 13,
    },
    switchThumbActive: {
        transform: [{ translateX: 20 }],
    },
    // Full Screen Video Modal Styles
    fullScreenContainer: {
        flex: 1,
        backgroundColor: "#000",
    },
    fullScreenHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "rgba(0,0,0,0.5)",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    closeButton: {
        padding: 8,
    },
    fullScreenTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
        marginLeft: 12,
        flex: 1,
    },
    fullScreenVideoWrapper: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    fullScreenVideo: {
        width: "100%",
        height: "100%",
    },
});
