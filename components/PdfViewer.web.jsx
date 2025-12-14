import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function PdfViewer({ source, onError, style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.webFallback}>
        <Ionicons name="document-text-outline" size={64} color="#4c1d95" />
        <Text style={styles.title}>PDF Viewer</Text>
        <Text style={styles.message}>
          PDF viewing is available on mobile devices. Please use the app on iOS or Android to view PDFs.
        </Text>
        {typeof window !== "undefined" && source?.uri && (
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => {
              window.open(source.uri, "_blank");
            }}
          >
            <Text style={styles.buttonText}>Open PDF in Browser</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  message: {
    marginTop: 8,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
    fontSize: 14,
  },
  openButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#4c1d95",
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});









