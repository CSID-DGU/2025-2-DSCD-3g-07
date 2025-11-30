import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tabIconSelected,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? 'light'].background,
          borderTopColor: Colors[colorScheme ?? 'light'].tabIconDefault,
          borderTopWidth: 0.5,
        },
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={26} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="course"
        options={{
          title: 'Course',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={26} name="explore" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          href: null, // hidden: old dummy MY screen
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="api-test"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="health-connect"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={26} name="favorite" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'MY',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={26} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
