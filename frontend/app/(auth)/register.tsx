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
import {
  requestHealthConnectPermissions,
  checkHealthConnectAvailability
} from '../../health';
import { healthConnectService } from '../../services/healthConnect';
import { apiService } from '../../services/api';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    // 입력 검증
    if (
      !username.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert('입력 오류', '모든 필드를 입력해주세요');
      return;
    }

    // 사용자명 검증
    const usernameValidation = authService.validateUsername(username);
    if (!usernameValidation.isValid) {
      Alert.alert('입력 오류', usernameValidation.message);
      return;
    }

    // 이메일 검증
    if (!authService.validateEmail(email)) {
      Alert.alert('입력 오류', '올바른 이메일 형식이 아닙니다');
      return;
    }

    // 비밀번호 검증
    const passwordValidation = authService.validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert('입력 오류', passwordValidation.message);
      return;
    }

    // 비밀번호 확인
    if (password !== confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다');
      return;
    }

    setIsLoading(true);

    try {
      // 1. 회원가입 API 호출
      const response = await authService.register({
        username,
        email,
        password,
      });

      // 2. Context에 저장 (AsyncStorage에도 자동 저장됨)
      await register(response.access_token, response.user);

      // 3. 헬스 커넥트 연동 시도 (토큰 전달)
      await setupHealthConnect(response.user.user_id, response.access_token);

    } catch (error: any) {
      Alert.alert('회원가입 실패', error.message || '회원가입에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 헬스 커넥트 연동 프로세스
   */
  const setupHealthConnect = async (userId: number, token: string) => {
    try {
      // 1. 헬스 커넥트 사용 가능 여부 확인
      const availability = await checkHealthConnectAvailability();

      if (!availability.available) {
        // 헬스 커넥트를 사용할 수 없으면 기본 속도(4km/h)로 설정하고 완료
        console.log('ℹ️ 헬스 커넥트 사용 불가:', availability.error);
        Alert.alert(
          '회원가입 완료',
          `환영합니다, ${username}님!\n\n기본 보행 속도 4km/h로 설정되었습니다.\n경로 안내를 사용하면 자동으로 속도가 조정됩니다.`,
          [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }

      // 2. 헬스 커넥트 권한 요청
      Alert.alert(
        '헬스 커넥트 연결',
        '더 정확한 보행 속도 예측을 위해\n헬스 데이터 접근 권한이 필요합니다.',
        [
          {
            text: '나중에',
            style: 'cancel',
            onPress: () => {
              Alert.alert(
                '회원가입 완료',
                `환영합니다, ${username}님!\n\n기본 보행 속도 4km/h로 설정되었습니다.\n경로 안내를 사용하면 자동으로 속도가 조정됩니다.`,
                [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
              );
            }
          },
          {
            text: '권한 허용',
            onPress: async () => {
              await requestHealthPermissionsAndSync(userId, token);
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ 헬스 커넥트 연동 오류:', error);
      // 오류가 발생해도 회원가입은 완료된 상태이므로 홈으로 이동
      Alert.alert(
        '회원가입 완료',
        `환영합니다, ${username}님!\n\n기본 보행 속도 4km/h로 설정되었습니다.`,
        [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
      );
    }
  };

  /**
   * 헬스 커넥트 권한 요청 및 데이터 동기화
   */
  const requestHealthPermissionsAndSync = async (userId: number, token: string) => {
    try {
      // 1. 권한 요청
      const permissionResult = await requestHealthConnectPermissions();

      if (!permissionResult.success) {
        console.log('⚠️ 헬스 커넥트 권한 거부됨');
        Alert.alert(
          '회원가입 완료',
          `환영합니다, ${username}님!\n\n기본 보행 속도 4km/h로 설정되었습니다.\n설정에서 언제든지 헬스 커넥트를 연결할 수 있습니다.`,
          [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }

      // 2. 권한이 허용되었으면 전체 기간 데이터 읽기 시도
      console.log('✅ 헬스 커넥트 권한 허용됨');

      // 전체 기간(10년) 보행 속도 데이터 가져오기
      const speedData = await healthConnectService.getAllTimeAverageSpeeds();

      console.log('📊 헬스 속도 데이터 결과:', {
        speedCase1: speedData.speedCase1,
        speedCase2: speedData.speedCase2,
        maxSpeed: speedData.maxSpeed,
        totalRecords: speedData.totalRecords,
        error: speedData.error,
      });

      if (speedData.error || !speedData.speedCase1) {
        // 권한은 있지만 데이터가 없는 경우
        // Case1이 없으면 Case2도 없음 (Case2 ⊃ Case1)
        console.log('ℹ️ 헬스 데이터가 없음, 기본 속도 유지');
        Alert.alert(
          '회원가입 완료',
          `환영합니다, ${username}님!\n\n헬스 커넥트에 보행 데이터가 없어\n기본 보행 속도 4km/h로 설정되었습니다.\n\n경로 안내를 사용하면 자동으로 속도가 조정됩니다.`,
          [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
        );
        return;
      }

      // 3. 헬스 데이터가 있으면 서버에 업데이트
      // 백엔드에서 이미 기본값(4.0, 3.2)으로 생성했으므로
      // 헬스 데이터가 있으면 이를 덮어쓰기
      const walkingSpeedCase1 = speedData.speedCase1;  // 경로 안내용
      const walkingSpeedCase2 = speedData.speedCase2;  // 코스 추천용

      console.log('📊 헬스 데이터 발견:');
      console.log(`   - Case 1 (≥2.5km/h): ${speedData.speedCase1} km/h (경로 안내용)`);
      console.log(`   - Case 2 (≥1.5km/h): ${speedData.speedCase2} km/h (코스 추천용)`);
      console.log(`   - 총 레코드: ${speedData.totalRecords}개`);

      try {
        // updateSpeedProfile로 기본값 덮어쓰기
        await apiService.updateSpeedProfile(
          {
            activity_type: 'walking',
            speed_case1: walkingSpeedCase1,
            speed_case2: walkingSpeedCase2,
          },
          token
        );

        Alert.alert(
          '회원가입 완료',
          `환영합니다, ${username}님!\n\n헬스 커넥트에서 보행 속도를 가져왔습니다.\n경로 안내: ${walkingSpeedCase1.toFixed(1)} km/h\n코스 추천: ${walkingSpeedCase2.toFixed(1)} km/h`,
          [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
        );
      } catch (updateError) {
        console.error('❌ 속도 프로필 업데이트 실패:', updateError);
        // 업데이트 실패해도 회원가입은 완료
        Alert.alert(
          '회원가입 완료',
          `환영합니다, ${username}님!\n\n기본 보행 속도 4km/h로 설정되었습니다.`,
          [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
        );
      }

    } catch (error) {
      console.error('❌ 헬스 커넥트 권한 요청 오류:', error);
      Alert.alert(
        '회원가입 완료',
        `환영합니다, ${username}님!\n\n기본 보행 속도 4km/h로 설정되었습니다.`,
        [{ text: '확인', onPress: () => router.replace('/(tabs)') }]
      );
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
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>회원가입</Text>
        </View>

        {/* 로고 */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="person-add" size={40} color="#007AFF" />
          </View>
          <Text style={styles.welcomeText}>
            PaceTry에 오신 것을 환영합니다!
          </Text>
        </View>

        {/* 입력 폼 */}
        <View style={styles.formContainer}>
          {/* 사용자명 입력 */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="사용자명 (3-50자)"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* 이메일 입력 */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
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
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호 (6자 이상)"
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

          {/* 비밀번호 확인 입력 */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
              disabled={isLoading}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* 회원가입 버튼 */}
          <TouchableOpacity
            style={[
              styles.registerButton,
              isLoading && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>회원가입</Text>
            )}
          </TouchableOpacity>

          {/* 로그인 링크 */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.loginLink}>로그인</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 안내 문구 */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={16} color="#666" />
          <Text style={styles.infoText}>
            회원가입 시 PaceTry의 이용약관 및{'\n'}개인정보 처리방침에 동의하게
            됩니다.
          </Text>
        </View>
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
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
  registerButton: {
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
  registerButtonDisabled: {
    backgroundColor: '#999',
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  loginLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    paddingHorizontal: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    lineHeight: 18,
  },
});
