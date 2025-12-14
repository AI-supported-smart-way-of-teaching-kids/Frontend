import React from "react";
import { View, Text,StyleSheet,TouchableOpacity, Alert,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
export default function Exit() {
  const { logout } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const handleExit = async () => {
    Alert.alert(t('exit'), t('exitMessage'), [
      { text: t('cancel') },
      {
        text: t('yes'),
        onPress: async () => {
          logout();
          await AsyncStorage.removeItem("role");
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconBox}>
        <Ionicons name="log-out-outline" size={60} color="#4A90E2" />
      </View>

      <Text style={styles.title}>Exit</Text>

      <Text style={styles.text}>
        Are you sure you want to exit? This will end your current session.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleExit}>
        <Text style={styles.buttonText}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  iconBox: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});


