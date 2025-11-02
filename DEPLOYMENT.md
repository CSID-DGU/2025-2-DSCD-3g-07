# PaceTry 백엔드 배포 가이드

## 서버 정보
- **서버 IP**: 3.34.125.152 (EC2 시작할 때마다 변경될 수 있음)
- **API 포트**: 8000
- **API 문서**: http://3.34.125.152:8000/docs

---

## 🚀 개발 → 배포 워크플로우

### 백엔드 개발자
```bash
# 1. 로컬에서 개발
cd ~/ptRepo/backend
source fastapi-env/bin/activate
uvicorn app.main:app --reload

# 2. 코드 커밋 & 푸시
git add .
git commit -m "기능 추가/수정"
git push origin main

# 3. 배포 담당자에게 알림
"배포 부탁드립니다!"
```

### 배포 담당자 (나)
```bash
# 1. EC2 시작 (AWS 콘솔)
인스턴스 선택 → 인스턴스 시작

# 2. SSH 접속
ssh -i "key.pem" ubuntu@새로운IP

# 3. 배포
~/deploy.sh

# 4. 확인
브라우저: http://새로운IP:8000/docs

# 5. 팀원들에게 알림
"배포 완료! API: http://새로운IP:8000"
```

### 프론트엔드 개발자
```javascript
// .env 또는 config 파일에서 API URL만 업데이트
const API_URL = 'http://3.34.125.152:8000';

// 평소대로 개발
npm start
```

---

## 🔧 EC2 관리

### EC2 시작
```
AWS 콘솔 → EC2 → 인스턴스 선택 → 인스턴스 시작
→ 새 퍼블릭 IP 확인
```

### EC2 중지 (작업 끝나면)
```
AWS 콘솔 → EC2 → 인스턴스 선택 → 인스턴스 중지
```

### 빠른 명령어
```bash
pt-status    # 서버 상태 확인
pt-restart   # 서버 재시작
pt-logs      # 실시간 로그
pt-deploy    # 배포 실행
```

---

## 📋 서버 관리 명령어

### 서버 상태 확인
```bash
sudo systemctl status fastapi
```

### 서버 시작/중지/재시작
```bash
sudo systemctl start fastapi
sudo systemctl stop fastapi
sudo systemctl restart fastapi
```

### 실시간 로그 확인
```bash
sudo journalctl -u fastapi -f
# Ctrl+C로 종료
```

### 최근 로그 확인
```bash
sudo journalctl -u fastapi -n 50
```

### 환경변수 수정
```bash
nano ~/ptRepo/backend/.env
sudo systemctl restart fastapi
```

---

## 🌐 API 엔드포인트

### 테스트
- Health Check: `GET /api/routes/health`

### Routes
- Analyze Slope: `POST /api/routes/analyze-slope`

### Weather
- KMA Weather: `GET /api/weather/kma`
- Predict Speed: `POST /api/weather/speed/predict`
- Weather ETA: `POST /api/weather/speed/eta`

전체 API 문서: http://서버IP:8000/docs

---

## 🔍 문제 해결

### 서버가 응답하지 않을 때
```bash
# 1. 서버 상태 확인
sudo systemctl status fastapi

# 2. 로그 확인
sudo journalctl -u fastapi -n 50

# 3. 재시작
sudo systemctl restart fastapi
```

### "Connection refused" 에러
- EC2가 중지 상태인지 확인
- 보안 그룹 8000번 포트 확인
- IP 주소가 변경되었는지 확인

### 환경변수 오류
```bash
# .env 파일 확인
cat ~/ptRepo/backend/.env

# RDS 연결 테스트
psql -h RDS엔드포인트 -U postgres -d postgres
```

---

## 💰 비용 관리

### 평소 (개발 중)
- EC2 **중지** → 비용 거의 없음

### 테스트 기간
- EC2 **일시적 실행** → 프리티어 무료

### 실제 배포 시
- EC2 **24/7 실행** → 프리티어 종료 후 ~$8/월

---

## 📞 연락처
- 배포 담당: 박세희
- 문제 발생 시 연락 주세요!