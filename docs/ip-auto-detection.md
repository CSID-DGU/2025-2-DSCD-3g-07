# IP 주소 자동 감지 가이드

## 🔍 개요

PaceTry는 개발 중 백엔드 서버의 IP 주소를 **자동으로 감지**합니다.
더 이상 수동으로 IP 주소를 설정할 필요가 없습니다!

## 🚀 작동 방식

### 1. 자동 IP 감지 (우선순위)

```typescript
// utils/apiConfig.ts
1순위: 환경변수 (EXPO_PUBLIC_API_URL)
2순위: Expo 개발 서버의 IP 자동 감지
3순위: 플랫폼별 기본값
```

### 2. IP 감지 원리

Expo 개발 서버와 백엔드 서버가 **같은 PC**에서 실행 중이라면:
- Expo의 `hostUri`에서 IP 추출
- 예: Expo가 `192.168.1.100:8081`에서 실행 중
- 자동으로 백엔드를 `http://192.168.1.100:8000`으로 설정

## 📱 플랫폼별 동작

### Android 실제 기기 (Expo Go)
```
✅ 자동 감지됨!
PC와 같은 WiFi에 연결되어 있으면 자동으로 IP 감지
```

### Android 에뮬레이터
```
기본값: http://10.0.2.2:8000
(에뮬레이터의 호스트 머신 주소)
```

### iOS 시뮬레이터
```
기본값: http://localhost:8000
(시뮬레이터는 Mac과 네트워크 공유)
```

### 웹 브라우저
```
기본값: http://localhost:8000
```

## 🔧 수동 설정 (필요시)

### 방법 1: 환경 변수 사용

`.env` 파일에서:
```bash
# 자동 감지를 무시하고 이 URL 사용
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
```

### 방법 2: 개발자별 URL 설정

`utils/apiConfig.ts`에서:
```typescript
DEVELOPER_URLS: {
  member1: 'http://192.168.1.100:8000',
  member2: 'http://172.30.1.50:8000',
}
```

## 🐛 문제 해결

### IP가 자동 감지되지 않아요

1. **같은 WiFi 확인**
   ```bash
   # PC의 IP 확인
   ipconfig  # Windows
   ifconfig  # Mac/Linux
   
   # 핸드폰도 같은 WiFi에 연결되어 있는지 확인
   ```

2. **방화벽 확인**
   ```
   Windows Defender 방화벽에서 8000 포트 허용
   ```

3. **수동으로 IP 설정**
   ```bash
   # .env 파일 수정
   EXPO_PUBLIC_API_URL=http://당신의PC_IP:8000
   ```

### 연결이 계속 실패해요

1. **백엔드 서버가 실행 중인지 확인**
   ```bash
   cd backend
   venv\Scripts\activate
   python run.py
   
   # 다음과 같이 표시되어야 함:
   # INFO:     Uvicorn running on http://0.0.0.0:8000
   ```

2. **서버가 0.0.0.0에서 리스닝하는지 확인**
   ```python
   # backend/.env
   HOST=0.0.0.0  # ✅ 외부 접근 허용
   # HOST=127.0.0.1  # ❌ localhost만 허용
   ```

3. **포트 충돌 확인**
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Mac/Linux
   lsof -i :8000
   ```

## 📊 디버그 정보 확인

앱 실행 시 콘솔에 다음 정보가 표시됩니다:

```
=====================================
🌐 API Configuration
=====================================
Platform: android
Is Device: true
Base URL: http://192.168.1.100:8000
Expo Host: 192.168.1.100:8081
=====================================
```

이 정보로 현재 설정을 확인할 수 있습니다.

## 💡 Best Practices

### 개발 환경
1. PC와 핸드폰을 같은 WiFi에 연결
2. 백엔드 서버를 `0.0.0.0:8000`으로 실행
3. IP 자동 감지에 맡기기

### 팀 협업
1. 각자의 IP는 자동으로 감지됨
2. 문제 발생 시에만 `.env`에서 수동 설정
3. `.env` 파일은 Git에 커밋하지 않음

### 프로덕션
```bash
# .env.production
EXPO_PUBLIC_API_URL=https://api.pacetry.com
```

## 🔗 관련 파일

- `frontend/utils/apiConfig.ts` - IP 감지 로직
- `frontend/utils/networkUtils.ts` - 네트워크 유틸리티
- `frontend/utils/apiClient.ts` - API 클라이언트 (자동 재시도)
- `frontend/.env` - 환경 변수 설정

## 📚 추가 정보

### Expo 문서
- [Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Network Debugging](https://docs.expo.dev/guides/network-debugging/)

### 네트워크 디버깅 도구
```bash
# Android
adb shell ping 192.168.1.100

# iOS
ping 192.168.1.100
```
