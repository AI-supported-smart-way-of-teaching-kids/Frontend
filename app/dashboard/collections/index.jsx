import React, { useState, useCallback } from "react";

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
    Dimensions,
    Platform,
    KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as lessonsApi from "../../../src/services/lessonsApi";
import i18n from "../../../i18n";

const { width } = Dimensions.get("window");
// Calculate column width for 2-column grid
const COLUMN_WIDTH = (width - 48) / 2; // 48 = paddingHorizontal (16) * 2 + gap (16)

export default function CollectionsList() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [collections, setCollections] = useState([]);

    // Create Collection State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [creating, setCreating] = useState(false);

    const loadCollections = async () => {
        try {
            setLoading(true);
            const data = await lessonsApi.getCollections();
            // Handle different response structures (array or paginated results)
            const list = Array.isArray(data) ? data : data.results || [];
            setCollections(list);
        } catch (error) {
            console.warn("Failed to load collections:", error);
            Alert.alert(i18n.t("error"), "Failed to load collections.");
        } finally {
            setLoading(false);
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCollections();
        }, [])
    );

    const handleCreateCollection = async () => {
        if (!newTitle.trim()) {
            Alert.alert(i18n.t("error"), i18n.t("titleRequired"));
            return;
        }

        try {
            setCreating(true);
            const payload = {
                title: newTitle.trim(),
                description: newDescription.trim(),
            };
            const newCollection = await lessonsApi.createCollection(payload);

            // Update local state immediately
            setCollections((prev) => [newCollection, ...prev]);

            // Reset and close modal
            setNewTitle("");
            setNewDescription("");
            setShowCreateModal(false);
            Alert.alert(i18n.t("success"), i18n.t("collectionCreated"));
        } catch (error) {
            console.error("Create collection error:", error);
            Alert.alert(i18n.t("error"), i18n.t("failedToCreateCollection"));
        } finally {
            setCreating(false);
        }
    };

    const renderItem = ({ item }) => {
        // Check if it's the special "Add" card
        if (item.id === "add_new") {
            return (
                <TouchableOpacity
                    style={[styles.card, styles.addCard]}
                    onPress={() => setShowCreateModal(true)}
                >
                    <View style={styles.addIconContainer}>
                        <Ionicons name="add" size={40} color="#2563EB" />
                    </View>
                    <Text style={styles.addText}>{i18n.t("createCollection")}</Text>
                </TouchableOpacity>
            );
        }

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/dashboard/collections/${item.id}`)}
            >
                <View style={styles.folderIconContainer}>
                    <Ionicons name="folder" size={32} color="#F59E0B" />
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                </Text>
                <Text style={styles.cardSubtitle}>
                    {(item.lesson_count || 0) + " " + (item.lesson_count === 1 ? i18n.t("lessonCount") : i18n.t("lessonsCount"))}
                </Text>
            </TouchableOpacity>
        );
    };

    // Combine the "Add New" placeholder with actual data
    const data = [{ id: "add_new" }, ...collections];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (router.canGoBack()) {
                            router.back();
                        } else {
                            router.push("/dashboard/teacher");
                        }
                    }}
                    style={styles.backButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="arrow-back" size={28} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{i18n.t("myCollections")}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Grid */}
            {loading && collections.length === 0 ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    numColumns={2}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Create Modal */}
            <Modal
                visible={showCreateModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCreateModal(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{i18n.t("newCollection")}</Text>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>{i18n.t("collectionTitle")} *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Math Basics"
                                value={newTitle}
                                onChangeText={setNewTitle}
                                autoFocus
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.label}>{i18n.t("collectionDescription")}</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Collection description..."
                                value={newDescription}
                                onChangeText={setNewDescription}
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, creating && styles.disabledBtn]}
                            onPress={handleCreateCollection}
                            disabled={creating}
                        >
                            {creating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>{i18n.t("create")}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
    },
    listContent: {
        padding: 16,
    },
    columnWrapper: {
        justifyContent: "space-between",
        marginBottom: 16,
    },
    card: {
        width: COLUMN_WIDTH,
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        height: 160,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#64748B",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    addCard: {
        borderWidth: 2,
        borderColor: "#CBD5E1",
        borderStyle: "dashed",
        backgroundColor: "transparent",
        elevation: 0,
    },
    addIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    addText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#2563EB",
        textAlign: "center",
    },
    folderIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#FFFBEB",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        textAlign: "center",
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#64748B",
        textAlign: "center",
    },
    centered: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        minHeight: 400,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
    },
    formGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#334155",
        marginBottom: 8,
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
    submitBtn: {
        backgroundColor: "#2563EB",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
        marginTop: 8,
    },
    submitBtnText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    disabledBtn: {
        opacity: 0.7,
    },
});
