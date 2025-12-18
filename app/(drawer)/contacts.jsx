import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";

export default function ContactUs() {
  const contactMethods = [
    {
      title: "Phone",
      value: "+123 456 7890",
      icon: <Ionicons name="call-outline" size={28} color="#fff" />,
      onPress: () => Linking.openURL("tel:+1234567890"),
      gradient: ["#4facfe", "#00f2fe"],
    },
    {
      title: "Email",
      value: "info@yourcompany.com",
      icon: <Ionicons name="mail-outline" size={28} color="#fff" />,
      onPress: () => Linking.openURL("mailto:info@yourcompany.com"),
      gradient: ["#43e97b", "#38f9d7"],
    },
    {
      title: "Facebook",
      value: "facebook.com/yourcompany",
      icon: <FontAwesome name="facebook" size={28} color="#fff" />,
      onPress: () => Linking.openURL("https://www.facebook.com/yourcompany"),
      gradient: ["#4267B2", "#2a4b91"],
    },
    {
      title: "Instagram",
      value: "instagram.com/yourcompany",
      icon: <FontAwesome name="instagram" size={28} color="#fff" />,
      onPress: () =>
        Linking.openURL("https://www.instagram.com/yourcompany"),
      gradient: ["#feda75", "#d62976"],
    },
    {
      title: "Location",
      value: "123 Main Street, City, Country",
      icon: <Ionicons name="location-outline" size={28} color="#fff" />,
      onPress: () =>
        Linking.openURL(
          Platform.OS === "ios"
            ? "maps:0,0?q=123 Main Street, City, Country"
            : "geo:0,0?q=123 Main Street, City, Country"
        ),
      gradient: ["#ff7e5f", "#feb47b"],
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animatable.Text
        animation="fadeInDown"
        duration={1000}
        style={styles.header}
      >
        Contact Us
      </Animatable.Text>
      <Animatable.Text
        animation="fadeInDown"
        delay={200}
        duration={1000}
        style={styles.subHeader}
      >
        Reach out to us anytime via phone, email, social media, or visit us!
      </Animatable.Text>

      {contactMethods.map((method, index) => (
        <Animatable.View
          key={index}
          animation="fadeInUp"
          delay={index * 150}
          duration={1000}
        >
          <TouchableOpacity
            onPress={method.onPress}
            activeOpacity={0.8}
            style={{ marginBottom: 15 }}
          >
            <LinearGradient
              colors={method.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              {method.icon}
              <View style={styles.info}>
                <Text style={styles.title}>{method.title}</Text>
                <Text style={styles.value}>{method.value}</Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animatable.View>
      ))}

      <Animatable.View animation="fadeInUp" delay={700} duration={1000}>
        <Text style={styles.note}>
          We are available 24/7 to answer your questions. Feel free to contact
          us anytime!
        </Text>
      </Animatable.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f5f5f5",
    flexGrow: 1,
  },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
    color: "#333",
  },
  subHeader: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  info: {
    flex: 1,
    marginLeft: 15,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  value: {
    color: "#fff",
    fontSize: 14,
    marginTop: 4,
  },
  note: {
    textAlign: "center",
    fontSize: 14,
    color: "#666",
    marginTop: 20,
    lineHeight: 20,
  },
});
