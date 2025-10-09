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
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: '코스',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="map" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'MY',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="person" color={color} />,
        }}
      />
      <Tabs.Screen
        name="api-test"
        options={{
          title: 'API',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="api" color={color} />,
        }}
      />
      <Tabs.Screen
        name="health-connect"
        options={{
          title: 'Health',
          tabBarIcon: ({ color }) => <MaterialIcons size={26} name="favorite" color={color} />,
        }}
      />
    </Tabs>
  );
}
