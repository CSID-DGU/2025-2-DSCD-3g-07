// frontend/app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    // 입력 검증
    if (!email.trim() || !password.trim()) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요');
      return;
    }

    if (!authService.validateEmail(email)) {
      Alert.alert('입력 오류', '올바른 이메일 형식이 아닙니다');
      return;
    }

    setIsLoading(true);

    try {
      // 로그인 API 호출
      const response = await authService.login({ email, password });

      // Context에 저장 (AsyncStorage에도 자동 저장됨)
      await login(response.access_token, response.user);

      Alert.alert(
        '로그인 성공',
        `환영합니다, ${response.user.username}님!`,
        [
          {
            text: '확인',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message || '로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* 로고 영역 */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="walk" size={60} color="#007AFF" />
          </View>
          <Text style={styles.logoText}>PaceTry</Text>
          <Text style={styles.logoSubtext}>나만의 보행 속도 맞춤 경로</Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>로그인</Text>

          {/* 이메일 입력 */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="이메일"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* 비밀번호 입력 */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* 로그인 버튼 */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </TouchableOpacity>

          {/* 회원가입 링크 */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>계정이 없으신가요?</Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              disabled={isLoading}
            >
              <Text style={styles.registerLink}>회원가입</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 스킵 버튼 (개발용) */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)')}
          disabled={isLoading}
        >
          <Text style={styles.skipButtonText}>로그인 없이 둘러보기</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  registerLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 32,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'underline',
  },
});
