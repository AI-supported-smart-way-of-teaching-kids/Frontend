import { Stack } from 'expo-router';
import React from 'react';

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // hide header for all dashboard pages
      }}
    >
      <Stack.Screen name="kids" />
      <Stack.Screen name="teacher" />
      {/* Add parent dashboard if needed */}
    </Stack>
  );
}
