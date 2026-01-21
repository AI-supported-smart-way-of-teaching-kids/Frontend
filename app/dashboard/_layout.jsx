import { Stack } from 'expo-router';
import React from 'react';

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // hide header for all dashboard pages
      }}
    >
      <Stack.Screen 
        name="kids"
        options={{
          title: 'Kids Dashboard',
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="parent"
        options={{
          title: 'Parent Dashboard',
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="teacher"
        options={{
          title: 'Teacher Dashboard',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
