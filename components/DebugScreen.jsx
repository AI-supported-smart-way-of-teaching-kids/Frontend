import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function DebugScreen({ title, data }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || 'Debug Info'}</Text>
      <ScrollView style={styles.scrollView}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>Data:</Text>
          <Text style={styles.dataText}>
            {typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  dataBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  dataText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});









