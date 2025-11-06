// frontend/app/(tabs)/settings.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsScreen() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      '로그아웃',
      '정말 로그아웃 하시겠습니까?',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '로그아웃',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Alert.alert('로그아웃 완료', '로그아웃되었습니다', [
                {
                  text: '확인',
                  onPress: () => router.replace('/(auth)/login'),
                },
              ]);
            } catch (error) {
              Alert.alert('오류', '로그아웃에 실패했습니다');
            }
          },
        },
      ]
    );
  };

  const handleLogin = () => {
    router.push('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container}>
      {/* 프로필 섹션 */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#007AFF" />
        </View>
        {isAuthenticated && user ? (
          <>
            <Text style={styles.username}>{user.username}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={16} color="#34C759" />
              <Text style={styles.badgeText}>인증됨</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.username}>게스트</Text>
            <Text style={styles.guestText}>로그인하여 더 많은 기능을 이용하세요</Text>
          </>
        )}
      </View>

      {/* 설정 메뉴 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>계정</Text>

        {isAuthenticated ? (
          <>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="person-outline" size={24} color="#333" />
              <Text style={styles.menuText}>프로필 편집</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="heart-outline" size={24} color="#333" />
              <Text style={styles.menuText}>관심 경로</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="time-outline" size={24} color="#333" />
              <Text style={styles.menuText}>최근 검색</Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Ionicons name="log-in-outline" size={24} color="#007AFF" />
            <Text style={styles.loginButtonText}>로그인 / 회원가입</Text>
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* 앱 설정 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>앱 설정</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
          <Text style={styles.menuText}>알림</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="language-outline" size={24} color="#333" />
          <Text style={styles.menuText}>언어</Text>
          <Text style={styles.menuValue}>한국어</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="color-palette-outline" size={24} color="#333" />
          <Text style={styles.menuText}>테마</Text>
          <Text style={styles.menuValue}>라이트</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* 정보 */}
      <View style={styles.menuSection}>
        <Text style={styles.sectionTitle}>정보</Text>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="document-text-outline" size={24} color="#333" />
          <Text style={styles.menuText}>이용약관</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-outline" size={24} color="#333" />
          <Text style={styles.menuText}>개인정보 처리방침</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="information-circle-outline" size={24} color="#333" />
          <Text style={styles.menuText}>버전 정보</Text>
          <Text style={styles.menuValue}>1.0.0</Text>
        </TouchableOpacity>
      </View>

      {/* 로그아웃 버튼 */}
      {isAuthenticated && (
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2025 PaceTry. All rights reserved.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  guestText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 4,
    fontWeight: '600',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  menuValue: {
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  loginButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 16,
  },
  logoutSection: {
    backgroundColor: '#fff',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 12,
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
