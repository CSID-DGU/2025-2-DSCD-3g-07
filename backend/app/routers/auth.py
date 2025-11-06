# app/routers/auth.py
"""
인증 관련 API 엔드포인트
- 회원가입
- 로그인
- 내 정보 조회
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import crud
from app.schemas import (
    UserRegisterRequest, 
    UserLoginRequest, 
    TokenResponse, 
    UserResponse
)
from app.utils.auth_utils import get_password_hash, verify_password, create_access_token
from app.utils.dependencies import get_current_user
from app.models import Users

router = APIRouter(prefix="/auth", tags=["인증"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    회원가입
    
    - username, email, password로 새 계정 생성
    - 이메일/사용자명 중복 검사
    - 비밀번호 해싱 후 저장
    - JWT 토큰 즉시 발급 (자동 로그인)
    """
    # 1. 이메일 중복 확인
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 이메일입니다"
        )
    
    # 2. 사용자명 중복 확인
    existing_username = crud.get_user_by_username(db, user_data.username)
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 사용 중인 사용자명입니다"
        )
    
    # 3. 비밀번호 해싱
    hashed_password = get_password_hash(user_data.password)
    
    # 4. 사용자 생성
    new_user = crud.create_user(
        db=db,
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        auth_provider="local"
    )
    
    # 5. 로그인 시간 업데이트
    crud.update_last_login(db, new_user.user_id)
    
    # 6. JWT 토큰 생성
    access_token = create_access_token(data={"sub": new_user.user_id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: UserLoginRequest,
    db: Session = Depends(get_db)
):
    """
    로그인
    
    - 이메일/비밀번호로 인증
    - JWT 토큰 발급
    """
    # 1. 사용자 조회
    user = crud.get_user_by_email(db, login_data.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )
    
    # 2. 소셜 로그인 계정인 경우
    if user.auth_provider != "local":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{user.auth_provider} 계정입니다. 소셜 로그인을 이용해주세요"
        )
    
    # 3. 비밀번호 검증
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다"
        )
    
    # 4. 로그인 시간 업데이트
    crud.update_last_login(db, user.user_id)
    
    # 5. JWT 토큰 생성
    access_token = create_access_token(data={"sub": user.user_id})
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Users = Depends(get_current_user)
):
    """
    현재 로그인한 사용자 정보 조회
    
    - Authorization 헤더에 Bearer 토큰 필요
    - 토큰에서 사용자 정보 추출하여 반환
    """
    return UserResponse.model_validate(current_user)


@router.get("/protected-example")
async def protected_route_example(
    current_user: Users = Depends(get_current_user)
):
    """
    보호된 라우트 예시
    
    - 로그인한 사용자만 접근 가능
    - 다른 엔드포인트에서 get_current_user를 의존성으로 추가하면 인증 필요
    """
    return {
        "message": f"안녕하세요, {current_user.username}님!",
        "user_id": current_user.user_id,
        "email": current_user.email
    }
