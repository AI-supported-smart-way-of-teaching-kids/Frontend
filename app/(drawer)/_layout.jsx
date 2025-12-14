import React from "react";
import { Drawer } from "expo-router/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";


export default function DrawerLayout() {
  const { t } = useTranslation();

  return (
    <Drawer
      screenOptions={({ route }) => ({
        // hide header for kids & teacher dashboards
        headerShown: !["dashboard/kids", "dashboard/teacher"].includes(route.name),
      })}
    >
      {/* Home */}
      <Drawer.Screen
        name="index"
        options={{
          title: t("home"),
          drawerIcon: ({ color }) => <Ionicons name="home" size={28} color={color} />,
        }}
      />

      {/* Contacts */}
      <Drawer.Screen
        name="contacts"
        options={{
          title: t("contacts"),
          drawerIcon: ({ color }) => <Ionicons name="people" size={28} color={color} />,
        }}
      />

      {/* Settings */}
      <Drawer.Screen
        name="settings"
        options={{
          title: t("settings"),
          drawerIcon: ({ color }) => <Ionicons name="settings" size={28} color={color} />,
        }}
      />

      {/* About */}
      <Drawer.Screen
        name="about"
        options={{
          title: t("about"),
          drawerIcon: ({ color }) => <Ionicons name="information-circle" size={28} color={color} />,
        }}
      />
      {/* Login */}
      <Drawer.Screen
        name="login"
        options={{
          title: t("login"),
          drawerIcon: ({ color }) => <Ionicons name="log-in-outline" size={28} color={color} />,
        }}
      />

      {/* Exit */}
      <Drawer.Screen
        name="Exit"
        options={{
          title: t("exit"),
          drawerIcon: ({ color }) => <Ionicons name="exit-outline" size={28} color={color} />,
        }}
      />
    </Drawer>
  );
}
