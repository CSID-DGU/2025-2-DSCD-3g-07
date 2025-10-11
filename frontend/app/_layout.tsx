import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import 'react-native-reanimated';

import { Config } from '../config';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // 앱 시작시 API URL 자동 감지 및 초기화
  useEffect(() => {
    const initializeApi = async () => {
      try {
        console.log('🚀 Initializing API...');
        await Config.initializeApiUrl();
        console.log('✅ API initialized');
      } catch (error) {
        console.error('⚠️ API init failed:', error);
        // 실패해도 앱은 계속 실행
      }
    };
    
    initializeApi().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
