# 🤝 PaceTry 협업 가이드

## 🚀 빠른 시작

```bash
# 1. 프로젝트 클론
git clone <repository-url>
cd PaceTry

# 2. 의존성 설치
npm run install:all

# 3. 개발 서버 시작 (로컬)
npm run dev

# 4. 개발 서버 시작 (터널 - 협업용)
npm run dev:tunnel
```

## 🌐 네트워크 설정

### 📱 **Expo Go 사용 시**

#### 방법 1: 터널 모드 (추천)
```bash
npm run dev:tunnel
```
- ✅ **장점**: 어떤 네트워크에서든 접근 가능
- ✅ **장점**: IP 주소 변경에 영향받지 않음
- ❌ **단점**: 인터넷 연결 필요, 약간의 지연

#### 방법 2: 로컬 네트워크
```bash
npm run dev
```
- ✅ **장점**: 빠른 속도
- ❌ **단점**: 같은 Wi-Fi 필요
- ❌ **단점**: IP 변경 시 설정 수정 필요

### 🔧 **IP 주소 설정**

현재 IP를 확인하고 설정:

```bash
# Windows
ipconfig | findstr "IPv4"

# macOS/Linux  
ifconfig | grep "inet "
```

`frontend/utils/apiConfig.ts`에서 개발자별 URL 설정:

```typescript
DEVELOPER_URLS: {
  default: 'http://10.0.2.2:8000',
  member1: 'http://192.168.1.100:8000',  // 팀원1 IP
  member2: 'http://172.30.1.50:8000',    // 팀원2 IP
}
```

## 👥 **팀 협업 시나리오**

### 시나리오 1: 같은 사무실/집
```bash
# 서버 실행자
npm run dev

# 다른 팀원들
# QR 코드 스캔하여 Expo Go로 접근
```

### 시나리오 2: 원격 협업  
```bash
# 서버 실행자
npm run dev:tunnel

# 다른 팀원들  
# 터널 URL QR 코드 스캔하여 접근
```

### 시나리오 3: 각자 개발
```bash
# 각자 자신의 환경에서
npm run dev:local
```

## 🔍 **문제 해결**

### API 연결 실패
1. **백엔드 서버 확인**
   ```bash
   # 브라우저에서 확인
   http://localhost:8000/docs
   ```

2. **IP 주소 확인**
   ```bash
   ipconfig  # Windows
   ifconfig  # macOS/Linux
   ```

3. **방화벽 확인**
   - Windows: 방화벽에서 8000, 8081 포트 허용
   - 회사망: IT 팀에 포트 개방 요청

### 터널 연결 실패
```bash
# Expo 계정 로그인 확인
npx expo whoami

# 로그인이 안 되어 있으면
npx expo login
```

## 📋 **개발 명령어**

| 명령어 | 용도 | 네트워크 |
|--------|------|----------|
| `npm run dev` | 일반 개발 | 로컬 Wi-Fi |
| `npm run dev:tunnel` | 원격 협업 | 인터넷 |
| `npm run dev:local` | 로컬만 | localhost |

## 🎯 **권장 협업 방식**

1. **개발 초기**: `npm run dev:tunnel` 사용
2. **안정화 후**: `npm run dev` 사용  
3. **데모/발표**: `npm run dev:tunnel` 사용

## 💡 **팁**

- 🔄 **IP 변경 시**: `npm run dev`를 재시작하면 새 IP로 자동 업데이트
- 📱 **실제 기기**: Health Connect 테스트는 실제 Android 기기에서만 가능
- 🌐 **터널 모드**: 처음 실행 시 Expo 로그인 필요
- 🚀 **성능**: 로컬 네트워크가 터널보다 빠름