import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const STORAGE_PROFILE = "@app_profile_v1";

export default function Profile({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photo, setPhoto] = useState(null);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    (async () => {
      // load saved data
      const stored = await AsyncStorage.getItem(STORAGE_PROFILE);
      if (stored) {
        const data = JSON.parse(stored);
        setName(data.name || "");
        setEmail(data.email || "");
        setPhoto(data.photo || null);
        setPassword(data.password || "");
      }

      // permission for gallery
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Please allow access to gallery.");
      }
    })();
  }, []);

  const saveProfile = async () => {
    if (newPassword && newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    const data = {
      name,
      email,
      photo,
      password: newPassword ? newPassword : password,
    };

    await AsyncStorage.setItem(STORAGE_PROFILE, JSON.stringify(data));
    setPassword(data.password);
    setNewPassword("");
    Alert.alert("Success", "Profile updated successfully!");
  };

  // ✅ UPDATE ONLY PHOTO — KEEP NAME, EMAIL, PASSWORD
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newPhoto = result.assets[0].uri;
      setPhoto(newPhoto);

      // get existing profile
      const stored = await AsyncStorage.getItem(STORAGE_PROFILE);
      let data = stored ? JSON.parse(stored) : {};

      // only change photo
      const updatedProfile = {
        ...data,
        photo: newPhoto,
      };

      await AsyncStorage.setItem(
        STORAGE_PROFILE,
        JSON.stringify(updatedProfile)
      );

      Alert.alert("Success", "Profile photo updated!");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickPhoto} style={styles.photoWrapper}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <Text style={styles.noPhotoText}>No Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.name}>{name || "Your Name"}</Text>
      <Text style={styles.email}>{email || "your.email@example.com"}</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Current Password"
        value={password}
        secureTextEntry
        editable={false}
      />

      <TextInput
        style={styles.input}
        placeholder="New Password"
        value={newPassword}
        secureTextEntry
        onChangeText={setNewPassword}
      />

      <TouchableOpacity style={styles.btn} onPress={saveProfile}>
        <Text style={styles.btnText}>Save Changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f0f0f5",
    alignItems: "center",
  },
  photoWrapper: {
    marginBottom: 16,
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "#4c1d95",
  },
  noPhoto: {
    backgroundColor: "#6c63ff",
    justifyContent: "center",
    alignItems: "center",
  },
  noPhotoText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  btn: {
    backgroundColor: "#4c1d95",
    padding: 14,
    borderRadius: 8,
    width: "100%",
    marginTop: 10,
  },
  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
  },
});
