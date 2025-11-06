# app/utils/dependencies.py
"""
FastAPI 의존성 함수 - 인증 미들웨어
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Users
from app.utils.auth_utils import verify_token

# Bearer 토큰 스키마
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Users:
    """
    현재 인증된 사용자 가져오기
    
    Authorization 헤더에서 JWT 토큰을 추출하고 검증하여 사용자 정보 반환
    
    Args:
        credentials: Bearer 토큰
        db: 데이터베이스 세션
        
    Returns:
        Users: 현재 사용자 객체
        
    Raises:
        HTTPException: 토큰이 유효하지 않거나 사용자를 찾을 수 없는 경우
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="인증 정보를 확인할 수 없습니다",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise credentials_exception
    
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    
    # 데이터베이스에서 사용자 조회
    user = db.query(Users).filter(Users.user_id == user_id).first()
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[Users]:
    """
    현재 사용자 가져오기 (선택적 인증)
    
    토큰이 있으면 검증하고, 없으면 None 반환
    로그인 여부와 관계없이 접근 가능한 엔드포인트에서 사용
    
    Args:
        credentials: Bearer 토큰 (선택)
        db: 데이터베이스 세션
        
    Returns:
        Optional[Users]: 사용자 객체 또는 None
    """
    if credentials is None:
        return None
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        return None
    
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        return None
    
    user = db.query(Users).filter(Users.user_id == user_id).first()
    return user
