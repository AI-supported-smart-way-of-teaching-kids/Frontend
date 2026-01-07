import React from "react";
import { View } from "react-native";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import CustomDrawerHeader from "../../components/CustomDrawerHeader";
import { DrawerItemList } from "@react-navigation/drawer";

export default function DrawerLayout(props) {
  const { t } = useTranslation();

  return (
    <Drawer
      drawerContent={(drawerProps) => (
        <View style={{ flex: 1 }}>
          <CustomDrawerHeader />
          <DrawerItemList {...drawerProps} />
        </View>
      )}
      screenOptions={({ route }) => {
        const isDashboardScreen = route.name?.startsWith("dashboard/");

        return {
          // Hide native header for all dashboard screens (kids, parent, teacher, etc.)
          headerShown: !isDashboardScreen,

          // Clean, minimal header for non-dashboard screens
          headerTitle: "",
          headerTransparent: true,
          headerTintColor: "#000",
          headerStyle: {
            backgroundColor: "transparent",
            elevation: 0,
            shadowOpacity: 0,
          },

          drawerActiveTintColor: "#2f322fff",
          drawerInactiveTintColor: "#333",
          drawerLabelStyle: { fontSize: 16, fontWeight: "500" },
        };
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: t("home"), // <--- THIS TEXT STAYS INSIDE THE MENU
          drawerIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="contacts"
        options={{
          drawerLabel: t("contacts"),
          drawerIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          drawerLabel: t("settings"),
          drawerIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="about"
        options={{
          drawerLabel: t("about"),
          drawerIcon: ({ color }) => <Ionicons name="information-circle" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="login"
        options={{
          drawerLabel: t("login"),
          drawerIcon: ({ color }) => <Ionicons name="log-in-outline" size={24} color={color} />,
        }}
      />
      <Drawer.Screen
        name="Exit"
        options={{
          drawerLabel: t("exit"),
          drawerIcon: ({ color }) => <Ionicons name="exit-outline" size={24} color={color} />,
        }}
      />
    </Drawer>
  );
}