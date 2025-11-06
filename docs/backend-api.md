# Backend API 문서

## 🐍 FastAPI 서버 개요

PaceTry Backend는 FastAPI 기반의 RESTful API 서버로, 보행 속도 개인화를 위한 머신러닝 모델과 T맵 API 연동을 제공합니다.

## 📋 목차

- [서버 실행](#서버-실행)
- [API 엔드포인트](#api-엔드포인트)
- [데이터 모델](#데이터-모델)
- [환경 설정](#환경-설정)
- [개발 가이드](#개발-가이드)

## 🚀 서버 실행

### 빠른 실행
```bash
# 루트 디렉터리에서
npm run backend:dev
```

### 수동 실행
```bash
cd backend
set PYTHONPATH=D:\PaceTry\backend
D:\PaceTry\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 접속 URL
- **서버**: http://127.0.0.1:8000
- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

## 📡 API 엔드포인트

### 1. Health Check

**GET** `/health`

서버 상태를 확인합니다.

**응답 예제:**
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### 2. 루트 엔드포인트

**GET** `/`

기본 메시지를 반환합니다.

**응답 예제:**
```json
{
  "message": "Hello World"
}
```

### 3. 경로 검색 (개인화)

**GET** `/transit-route`

사용자 특성을 고려한 개인화된 대중교통 경로를 검색합니다.

#### 파라미터

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `start_x` | float | ✅ | - | 출발지 경도 |
| `start_y` | float | ✅ | - | 출발지 위도 |
| `end_x` | float | ✅ | - | 도착지 경도 |
| `end_y` | float | ✅ | - | 도착지 위도 |
| `user_age` | int | ❌ | 30 | 사용자 나이 |
| `fatigue_level` | int | ❌ | 3 | 피로도 (1-5) |
| `count` | int | ❌ | 1 | 경로 개수 |
| `lang` | int | ❌ | 0 | 언어 설정 |
| `format` | string | ❌ | "json" | 응답 형식 |
| `user_id` | string | ❌ | "default_user" | 사용자 ID |

#### 사용 예제

```bash
# 기본 경로 검색 (서울역 → 강남역)
curl "http://127.0.0.1:8000/transit-route?start_x=126.9706&start_y=37.5547&end_x=127.0276&end_y=37.4979"

# 개인화 파라미터 포함
curl "http://127.0.0.1:8000/transit-route?start_x=126.9706&start_y=37.5547&end_x=127.0.0&end_y=37.4979&user_age=25&fatigue_level=4"
```

#### 응답 형식

```json
{
  "original_data": { /* T맵 원본 데이터 */ },
  "total_time_minutes": 35.2,
  "total_walk_time_minutes": 12.5,
  "walk_ratio_percent": 35.5,
  "non_walk_time_minutes": 22.7,
  "walking_sections_count": 3,
  "walking_sections": [
    {
      "distance": 450,
      "estimated_time_seconds": 324,
      "personalized_time_seconds": 356,
      "description": "지하철역까지 도보"
    }
  ],
  "total_estimated_walk_time_minutes": 5.4,
  "total_personalized_walk_time_minutes": 5.9,
  "adjustment_factor": 1.1,
  "overall_accuracy_note": "Times are estimates; adjust for weather/terrain"
}
```

## 📊 데이터 모델

### 개인화 모델

머신러닝 모델은 다음 데이터를 기반으로 학습됩니다:

```csv
user_id,age,fatigue_level,actual_time,estimated_time
user1,25,1,120,100
user1,25,3,135,100
user2,35,2,140,110
```

**특성:**
- `age`: 사용자 나이
- `fatigue_level`: 피로도 (1-5, 1=매우 좋음, 5=매우 피곤)
- `actual_time`: 실제 소요 시간 (초)
- `estimated_time`: 예상 시간 (초)

### 조정 계수 계산

```python
def predict_adjustment(age, fatigue_level):
    # 나이별 기본 조정
    age_factor = 1.0 + (age - 30) * 0.005
    
    # 피로도별 조정  
    fatigue_factor = 1.0 + (fatigue_level - 1) * 0.1
    
    return age_factor * fatigue_factor
```

## ⚙️ 환경 설정

### 환경 변수 (.env)

```properties
# TMAP API 설정
TMAP_APPKEY=your_api_key_here
TMAP_API_URL=https://apis.openapi.sk.com/transit/routes

# 서버 설정
HOST=0.0.0.0
PORT=8000
DEBUG=True

# 데이터베이스 (향후 확장용)
DATABASE_URL=sqlite:///./app.db
```

### 의존성 관리

**운영 환경:**
```bash
pip install -r requirements.txt
```

**개발 환경:**
```bash
pip install -r requirements-dev.txt
```

## 🧪 테스트

### 테스트 실행

```bash
# 모든 테스트
npm run backend:test

# 특정 테스트 파일
cd backend
python -m pytest tests/test_main.py -v

# 커버리지 포함
python -m pytest --cov=app --cov-report=html
```

### 테스트 구조

```
tests/
├── __init__.py          # 테스트 패키지
├── conftest.py          # 공통 픽스처
├── test_main.py         # 기본 엔드포인트 테스트
└── test_transit_api.py  # 경로 검색 API 테스트
```

## 🔧 개발 가이드

### 코드 품질

```bash
# 린팅
flake8 app/

# 포맷팅
black app/ tests/
isort app/ tests/

# 타입 체크
mypy app/

# 보안 검사
bandit -r app/
```

### 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 앱 및 라우터
│   ├── models.py        # 데이터 모델
│   └── utils/
│       ├── api_helpers.py    # T맵 API 연동
│       └── ml_helpers.py     # 머신러닝 함수
├── tests/               # 테스트 파일
├── requirements.txt     # 운영 의존성
├── requirements-dev.txt # 개발 의존성
├── setup.cfg           # 도구 설정
└── pyproject.toml      # 프로젝트 메타데이터
```

### 새로운 엔드포인트 추가

1. **라우터 함수 정의** (`app/main.py`):
```python
@app.get("/new-endpoint", tags=["New"])
async def new_endpoint(param: str = Query(..., description="파라미터 설명")):
    """
    새로운 엔드포인트 설명
    """
    return {"result": param}
```

2. **테스트 작성** (`tests/test_new.py`):
```python
def test_new_endpoint(client):
    response = client.get("/new-endpoint?param=test")
    assert response.status_code == 200
    assert response.json()["result"] == "test"
```

3. **문서 업데이트**: 이 문서와 README에 새 엔드포인트 정보 추가

### 디버깅

VSCode에서 디버깅하려면:

1. `F5` 키를 누르거나 디버그 패널에서 "Python: FastAPI" 선택
2. 브레이크포인트 설정 후 API 호출
3. 변수 검사 및 단계별 실행

### 성능 최적화

- **비동기 처리**: `async`/`await` 사용
- **데이터베이스 연결 풀링** (향후 구현)
- **캐싱**: Redis 또는 메모리 캐시 (향후 구현)
- **요청 제한**: Rate limiting (향후 구현)

## 🚀 배포

### Docker (예정)

```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 클라우드 배포

**Heroku:**
```bash
git subtree push --prefix=backend heroku main
```

**AWS Lambda:**
- Mangum ASGI adapter 사용
- AWS SAM 또는 Serverless Framework

## 📚 참고 자료

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [T맵 API 가이드](https://tmapapi.sktelecom.com/)
- [Python 비동기 프로그래밍](https://docs.python.org/3/library/asyncio.html)
- [pytest 테스팅 가이드](https://docs.pytest.org/)