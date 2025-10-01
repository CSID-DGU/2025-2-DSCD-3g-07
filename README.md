# 🏃 PaceTry

**개인 맞춤형 보행·러닝 길찾기 및 운동 코스 추천 서비스**

당신의 걸음에 맞춘 똑똑한 길안내와 운동 코스를 경험하세요.

[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

---

## 📌 프로젝트 소개

PaceTry는 **개인의 보행 속도, 신체 특성, 환경 조건**을 종합적으로 고려하여 정확한 이동 시간을 예측하고, 사용자 맞춤형 운동 코스를 추천하는 모바일 애플리케이션입니다.

기존 지도 서비스의 획일적인 평균 속도 기반 예측을 넘어, **나만의 보행 프로파일**을 구축하여 더 정확하고 신뢰할 수 있는 길안내를 제공합니다.

### 🎯 핵심 문제 해결

- ❌ **기존 문제**: 모든 사람에게 동일한 평균 속도(시속 4km) 적용
- ✅ **PaceTry 해결**: 개인의 보폭, 속도, 경사도, 날씨까지 반영한 정밀 예측

---

## ✨ 주요 기능

### 1. 🚶 개인 맞춤형 길찾기 (A→B Navigation)

- 사용자의 실제 보행 속도를 학습하여 정확한 도착 시간 예측
- 경사도, 날씨, 기온 등 환경 요소 실시간 반영
- 환승 지점에서의 정시 도착 확률 제공

### 2. 🏃 운동 코스 추천 (Loop & One-way Course)

- **"30분 동안 걷고 원점으로 돌아오기"** 같은 목표 기반 코스 자동 생성
- 거리, 시간, 난이도, 지형 선호도 맞춤 설정
- 대기질, 조도 등 안전 요소 고려한 경로 추천

### 3. 🌡️ 환경·안전 적응형 경로

- 실시간 기상 데이터 (온도, 강수, 미세먼지) 반영
- 야간 안전 경로 및 무장애 경로 옵션
- 과부하 위험 방지 알림

### 4. 📊 개인 보행 프로파일 관리

- 평균 보행 속도 및 러닝 속도 자동 분석
- 경사도·날씨별 속도 변화 패턴 학습
- 주간/월간 활동 요약 및 통계

---

## 🛠️ 기술 스택

### Frontend

- **React Native (Expo)**: 크로스 플랫폼 모바일 앱 개발
- **React Navigation**: 화면 전환 및 네비게이션
- **Axios**: REST API 통신

### Backend

- **FastAPI**: 고성능 Python 웹 프레임워크
- **SQLAlchemy**: ORM (Object-Relational Mapping)
- **PostgreSQL**: 관계형 데이터베이스
- **JWT**: 사용자 인증

### External APIs

- **Tmap 대중교통 API**: 경로 탐색 기본 데이터
- **카카오맵 API**: 지도 시각화
- **Google Elevation API**: 경로 고도 데이터
- **OpenRouteService API**: 운동 코스 생성
- **기상청 실시간 API**: 날씨 정보

### Infrastructure

- **AWS EC2**: 백엔드 서버 배포
- **AWS RDS**: PostgreSQL 호스팅
- **GitHub**: 버전 관리 및 협업

---

## 🏗️ 시스템 아키텍처

### 📱 Frontend

```
React Native Mobile App (iOS/Android)
         │
         │ REST API (Axios)
         ↓
```

### 🔧 Backend

```
FastAPI Server
    ├─→ PostgreSQL Database (사용자 데이터, 활동 기록)
    │
    └─→ External APIs
        ├─ Tmap 대중교통 API (경로 탐색)
        ├─ 카카오맵 API (지도 시각화)
        ├─ Google Elevation API (고도 데이터)
        ├─ OpenRouteService API (코스 생성)
        └─ 기상청 실시간 API (날씨 정보)
```

### 🔄 데이터 흐름

1. **사용자 입력** → React Native App
2. **API 요청** → FastAPI Backend
3. **데이터 처리** → PostgreSQL + External APIs
4. **응답 반환** → 개인화된 결과 제공

---

## 📱 주요 화면

### 1. 홈 화면

- 실시간 개인 맞춤형 길찾기
- 오늘의 추천 운동 코스

### 2. 경로 탐색 화면

- 지도 기반 경로 시각화
- 개인화된 예상 도착 시간
- 경사도·날씨 정보 표시

### 3. 코스 추천 화면

- 목표 시간/거리 입력
- 다양한 코스 옵션 제시
- 난이도 및 환경 정보

### 4. 프로필 화면

- 개인 보행 속도 통계
- 활동 이력 및 분석
- 설정 관리

---

## 🚀 설치 및 실행

### Prerequisites

- Node.js v18 이상
- Python 3.9 이상
- PostgreSQL 13 이상
- Expo CLI

### Frontend 실행

```bash
# 저장소 클론
git clone https://github.com/your-username/pacetry.git
cd pacetry/frontend

# 의존성 설치
npm install

# 개발 서버 실행
npx expo start
```

### Backend 실행

```bash
cd pacetry/backend

# 가상환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에 DB 정보 및 API 키 입력

# 데이터베이스 마이그레이션
alembic upgrade head

# 서버 실행
uvicorn main:app --reload
```

---

## 📈 개발 로드맵

### Phase 1: 기초 구축 (Week 1-4)

- [x] 프로젝트 환경 설정
- [x] AWS 인프라 구축
- [x] 기본 CRUD API 개발

### Phase 2: 핵심 기능 (Week 5-8)

- [x] 사용자 인증 시스템
- [x] 개인 맞춤형 ETA 알고리즘
- [ ] 경사도·날씨 반영 로직

### Phase 3: 코스 추천 (Week 9-12)

- [ ] OpenRouteService 연동
- [ ] 목표 기반 코스 생성
- [ ] UI/UX 개선

### Phase 4: 테스트 및 배포 (Week 13-15)

- [ ] 통합 테스트
- [ ] 성능 최적화
- [ ] 프로덕션 배포

---

## 👥 팀원

| 이름   | 역할          | 학과 |
|--------|---------------|--------|
| 한승민 | Frontend (팀장)     | 산업시스템공학과 |
| 김영현 | Frontend (팀원)      | 경영정보학과 |
| 박세희 | DevOps (팀원)        | 산업시스템공학과 |
| 오현식 | Backend (팀원)       | 경영정보학과 |

---

## 📊 성과 지표

- **ETA 정확도**: 평균 오차율 ≤ 10% 목표
- **코스 추천 만족도**: ≥ 80% 목표
- **API 응답 속도**: ≤ 3초
- **사용자 경험(SUS)**: ≥ 70점

---

## 📞 문의

프로젝트에 대한 문의사항이나 제안은 이슈를 통해 남겨주세요!

