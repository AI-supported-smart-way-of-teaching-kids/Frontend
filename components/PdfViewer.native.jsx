import React from "react";
import { View, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";

const styles = {
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

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












