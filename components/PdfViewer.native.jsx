import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

export default function PdfViewer({ source, onError, style }) {
  if (!source || !source.uri) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#4c1d95" />
      </View>
    );
  }
  return (
    <WebView
      source={{ uri: source.uri }}
      style={style || { flex: 1 }}
      onError={(syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error("WebView PDF Error:", nativeEvent);
        if (onError) onError(nativeEvent);
      }}
      startInLoadingState={true}
      renderLoading={() => (
        <View style={[styles.container, style]}>
          <ActivityIndicator size="large" color="#4c1d95" />
        </View>
      )}
    />
  );
}









