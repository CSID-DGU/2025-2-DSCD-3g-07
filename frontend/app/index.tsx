// frontend/app/index.tsx
import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

/**
 * 앱 진입점
 * 로그인 상태에 따라 적절한 화면으로 리다이렉트
 */
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // 로그인 안 되어 있으면 로그인 화면으로
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // 이미 로그인되어 있는데 auth 화면에 있으면 메인으로
      router.replace('/(tabs)');
    } else if (!isAuthenticated && inAuthGroup) {
      // 로그인 안 되어있고 이미 auth 화면이면 그대로
      return;
    } else {
      // 로그인 되어있으면 메인 화면으로
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  // 로딩 중 표시
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
