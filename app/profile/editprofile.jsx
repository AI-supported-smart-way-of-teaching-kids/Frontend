import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../contexts/ThemeContext";
import { useUser } from "../../contexts/UserContext";

export default function EditProfile() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, updateProfile } = useUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      // Load from UserContext first, then fallback to AsyncStorage
      if (user) {
        setName(user.name || "");
        setEmail(user.email || "");
        setUsername(user.username || "");
        setPhoto(user.profilePicture || null);
      } else {
        const savedName = await AsyncStorage.getItem("name");
        const savedEmail = await AsyncStorage.getItem("email");
        const savedUsername = await AsyncStorage.getItem("username");
        const savedPhoto = await AsyncStorage.getItem("profilePhoto");
        if (savedName) setName(savedName);
        if (savedEmail) setEmail(savedEmail);
        if (savedUsername) setUsername(savedUsername);
        if (savedPhoto) setPhoto(savedPhoto);
      }
    };
    loadData();
  }, [user]);

  const pickImage = async () => {
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
      if (!result.canceled) setPhoto(result.assets[0].uri);
    } catch (e) {
      console.warn("Image picker error", e);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty");
      return;
    }
    
    // Update UserContext
    if (updateProfile) {
      updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        username: username.trim() || undefined,
        profilePicture: photo || undefined,
      });
    }
    
    // Also save to AsyncStorage for backward compatibility
    await AsyncStorage.setItem("name", name.trim());
    if (email.trim()) await AsyncStorage.setItem("email", email.trim());
    if (username.trim()) await AsyncStorage.setItem("username", username.trim());
    if (photo) await AsyncStorage.setItem("profilePhoto", photo);

    Alert.alert("Saved", "Profile updated successfully", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Profile Photo</Text>
      <TouchableOpacity onPress={pickImage} style={styles.avatar}>
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={40} color="#999" />
          </View>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={pickImage} style={styles.changePhotoBtn}>
        <Text style={styles.changePhotoText}>Change Photo</Text>
      </TouchableOpacity>

      <Text style={[styles.label, { color: colors.text }]}>Name *</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        value={name}
        onChangeText={setName}
        placeholder="Enter your name"
      />

      <Text style={[styles.label, { color: colors.text }]}>Username</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        value={username}
        onChangeText={setUsername}
        placeholder="Enter username"
        autoCapitalize="none"
      />

      <Text style={[styles.label, { color: colors.text }]}>Email</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        value={email}
        onChangeText={setEmail}
        placeholder="Enter email"
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TouchableOpacity onPress={handleSave} style={[styles.btn, { backgroundColor: colors.primary }]}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Save Profile</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, marginTop: 8 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 10, alignSelf: "center", justifyContent: "center", alignItems: "center", backgroundColor: "#f0f0f0", overflow: "hidden", borderWidth: 3, borderColor: "#e0e0e0" },
  avatarPlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center", backgroundColor: "#e0e0e0" },
  changePhotoBtn: { alignSelf: "center", marginBottom: 20 },
  changePhotoText: { color: "#4c1d95", fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 16 },
  btn: { padding: 16, borderRadius: 12, alignItems: "center", marginTop: 20, marginBottom: 20 },
});
