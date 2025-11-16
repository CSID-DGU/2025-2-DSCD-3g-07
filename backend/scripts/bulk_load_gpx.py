"""
초기 GPX 파일들을 DB에 일괄 적재하는 스크립트
backend/scripts/bulk_load_gpx.py
"""

import sys
import os
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.utils.gpx_loader import GPXLoader


def load_all_gpx_files(gpx_directory: str, segment_length: int = 100):
    """
    디렉토리 내 모든 GPX 파일을 DB에 적재
    
    Args:
        gpx_directory: GPX 파일들이 있는 디렉토리 경로
        segment_length: 세그먼트 길이 (미터)
    """
    
    gpx_files = list(Path(gpx_directory).glob("*.gpx"))
    
    if not gpx_files:
        print(f"❌ {gpx_directory}에 GPX 파일이 없습니다.")
        return
    
    print(f"\n🔍 총 {len(gpx_files)}개의 GPX 파일을 찾았습니다.\n")
    
    # DB 세션 생성
    db = SessionLocal()
    loader = GPXLoader(db)
    
    success_count = 0
    fail_count = 0
    
    try:
        for gpx_file in gpx_files:
            print(f"{'='*60}")
            print(f"📁 처리 중: {gpx_file.name}")
            print(f"{'='*60}")
            
            try:
                result = loader.load_gpx_file(str(gpx_file), segment_length)
                
                print(f"✅ 성공!")
                print(f"   - Route ID: {result['route_id']}")
                print(f"   - 이름: {result['route_name']}")
                print(f"   - 거리: {result['distance_km']} km")
                print(f"   - 고도 상승: {result['elevation_gain_m']} m")
                print(f"   - 난이도: {result['difficulty']}")
                print(f"   - 세그먼트: {result['segments_count']}개\n")
                
                success_count += 1
                
            except Exception as e:
                print(f"❌ 실패: {str(e)}\n")
                fail_count += 1
                db.rollback()
                continue
        
        print(f"\n{'='*60}")
        print(f"📊 처리 완료!")
        print(f"✅ 성공: {success_count}개")
        print(f"❌ 실패: {fail_count}개")
        print(f"{'='*60}\n")
        
    finally:
        db.close()


if __name__ == "__main__":
    # GPX 파일이 있는 디렉토리 경로 설정
    # 예시: backend/data/gpx_files/
    
    if len(sys.argv) > 1:
        gpx_dir = sys.argv[1]
    else:
        # 기본 경로 설정
        gpx_dir = "./data/gpx_files"  # 또는 절대 경로
    
    if not os.path.exists(gpx_dir):
        print(f"❌ 디렉토리가 존재하지 않습니다: {gpx_dir}")
        print(f"💡 사용법: python bulk_load_gpx.py /path/to/gpx/files")
        sys.exit(1)
    
    load_all_gpx_files(gpx_dir)