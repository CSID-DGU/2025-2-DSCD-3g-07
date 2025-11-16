"""
GPX 파일을 파싱하여 PostgreSQL DB의 routes 및 route_segments 테이블에 적재하는 유틸리티
app/database.py의 DB 연결을 사용
"""

import xml.etree.ElementTree as ET
import json
import math
from pathlib import Path
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import text


class GPXLoader:
    """GPX 파일을 DB에 적재하는 클래스"""
    
    def __init__(self, db: Session):
        """
        Args:
            db: SQLAlchemy Session (FastAPI의 Depends로 주입받음)
        """
        self.db = db
    
    def parse_gpx(self, gpx_file_path: str) -> Dict:
        """
        GPX 파일 파싱
        
        Returns:
            route_data: 경로 정보 딕셔너리
        """
        tree = ET.parse(gpx_file_path)
        root = tree.getroot()
        
        # XML 네임스페이스 처리
        ns = {'gpx': 'http://www.topografix.com/GPX/1/1'}
        
        # 트랙 포인트 추출
        track_points = []
        for trkpt in root.findall('.//gpx:trkpt', ns):
            lat = float(trkpt.get('lat'))
            lon = float(trkpt.get('lon'))
            
            # 고도 정보
            ele_elem = trkpt.find('gpx:ele', ns)
            ele = float(ele_elem.text) if ele_elem is not None else None
            
            # 시간 정보
            time_elem = trkpt.find('gpx:time', ns)
            timestamp = time_elem.text if time_elem is not None else None
            
            track_points.append({
                'lat': lat,
                'lon': lon,
                'ele': ele,
                'time': timestamp
            })
        
        # 경로 이름 추출
        name_elem = root.find('.//gpx:trk/gpx:name', ns) or root.find('.//gpx:name', ns)
        route_name = name_elem.text if name_elem is not None else Path(gpx_file_path).stem
        
        # 파일명에서 정보 추출
        filename = Path(gpx_file_path).stem
        route_type = self._infer_route_type(route_name, filename)
        
        return {
            'route_name': route_name,
            'route_type': route_type,
            'track_points': track_points,
            'source_file': filename
        }
    
    def _infer_route_type(self, route_name: str, filename: str) -> str:
        """경로 타입 추론 (walking/running/mixed)"""
        running_keywords = ['run', '러닝', 'running', 'jog', '조깅']
        walking_keywords = ['walk', '산책', '둘레길', 'trail', 'park', '공원', '산', '산책로']
        
        text = f"{route_name} {filename}".lower()
        
        if any(keyword in text for keyword in running_keywords):
            return 'running'
        elif any(keyword in text for keyword in walking_keywords):
            return 'walking'
        else:
            return 'mixed'
    
    def calculate_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        두 GPS 좌표 간 거리 계산 (Haversine formula)
        
        Returns:
            거리 (미터)
        """
        R = 6371000  # 지구 반지름 (미터)
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = math.sin(delta_phi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c
    
    def calculate_route_stats(self, track_points: List[Dict]) -> Dict:
        """
        경로 통계 계산
        
        Returns:
            통계 정보 딕셔너리
        """
        if not track_points or len(track_points) < 2:
            return None
        
        total_distance = 0.0
        elevation_gain = 0.0
        elevation_loss = 0.0
        elevations = [pt['ele'] for pt in track_points if pt['ele'] is not None]
        
        # 거리 및 고도 변화 계산
        for i in range(1, len(track_points)):
            prev_pt = track_points[i-1]
            curr_pt = track_points[i]
            
            # 거리 누적
            dist = self.calculate_distance(
                prev_pt['lat'], prev_pt['lon'],
                curr_pt['lat'], curr_pt['lon']
            )
            total_distance += dist
            
            # 고도 변화 계산
            if prev_pt['ele'] is not None and curr_pt['ele'] is not None:
                ele_diff = curr_pt['ele'] - prev_pt['ele']
                if ele_diff > 0:
                    elevation_gain += ele_diff
                else:
                    elevation_loss += abs(ele_diff)
        
        # 난이도 판정
        distance_km = total_distance / 1000
        difficulty = self._calculate_difficulty(distance_km, elevation_gain)
        
        # 예상 소요 시간 (분) - 평균 속도 기반
        base_time = (distance_km / 5.0) * 60  # 분
        elevation_time = (elevation_gain / 100) * 10  # 100m 당 10분 추가
        estimated_duration = int(base_time + elevation_time)
        
        return {
            'distance_km': round(distance_km, 2),
            'total_elevation_gain_m': round(elevation_gain, 2),
            'total_elevation_loss_m': round(elevation_loss, 2),
            'max_elevation_m': round(max(elevations), 2) if elevations else None,
            'min_elevation_m': round(min(elevations), 2) if elevations else None,
            'difficulty_level': difficulty,
            'estimated_duration_minutes': estimated_duration
        }
    
    def _calculate_difficulty(self, distance_km: float, elevation_gain: float) -> str:
        """난이도 계산"""
        score = distance_km + (elevation_gain / 100)
        
        if score < 3:
            return 'easy'
        elif score < 7:
            return 'moderate'
        else:
            return 'hard'
    
    def create_segments(self, track_points: List[Dict], segment_length: int = 100) -> List[Dict]:
        """
        경로를 세그먼트로 분할
        
        Args:
            track_points: GPS 트랙 포인트 리스트
            segment_length: 세그먼트 길이 (미터), 기본값 100m
            
        Returns:
            세그먼트 리스트
        """
        segments = []
        current_segment_distance = 0
        segment_start_idx = 0
        
        for i in range(1, len(track_points)):
            prev_pt = track_points[i-1]
            curr_pt = track_points[i]
            
            dist = self.calculate_distance(
                prev_pt['lat'], prev_pt['lon'],
                curr_pt['lat'], curr_pt['lon']
            )
            current_segment_distance += dist
            
            # 세그먼트 길이에 도달하거나 마지막 포인트인 경우
            if current_segment_distance >= segment_length or i == len(track_points) - 1:
                start_pt = track_points[segment_start_idx]
                end_pt = track_points[i]
                
                # 경사도 계산
                grade_percent = None
                elevation_change = None
                terrain_type = 'flat'
                
                if start_pt['ele'] is not None and end_pt['ele'] is not None:
                    elevation_change = end_pt['ele'] - start_pt['ele']
                    if current_segment_distance > 0:
                        grade_percent = (elevation_change / current_segment_distance) * 100
                        
                        # 지형 타입 결정
                        if grade_percent > 3:
                            terrain_type = 'uphill'
                        elif grade_percent < -3:
                            terrain_type = 'downhill'
                        else:
                            terrain_type = 'flat'
                
                segments.append({
                    'segment_order': len(segments) + 1,
                    'start_lat': start_pt['lat'],
                    'start_lon': start_pt['lon'],
                    'end_lat': end_pt['lat'],
                    'end_lon': end_pt['lon'],
                    'segment_distance_m': round(current_segment_distance, 2),
                    'segment_grade_percent': round(grade_percent, 2) if grade_percent is not None else None,
                    'elevation_change_m': round(elevation_change, 2) if elevation_change is not None else None,
                    'start_elevation_m': round(start_pt['ele'], 2) if start_pt['ele'] is not None else None,
                    'end_elevation_m': round(end_pt['ele'], 2) if end_pt['ele'] is not None else None,
                    'terrain_type': terrain_type
                })
                
                # 다음 세그먼트 시작
                segment_start_idx = i
                current_segment_distance = 0
        
        return segments
    
    def insert_route(self, route_data: Dict, stats: Dict) -> int:
        """
        routes 테이블에 경로 삽입
        
        Returns:
            삽입된 route_id
        """
        # GeoJSON LineString 형식으로 좌표 변환
        coordinates = [[pt['lon'], pt['lat']] for pt in route_data['track_points']]
        route_coordinates = json.dumps({
            "type": "LineString",
            "coordinates": coordinates
        })
        
        # 태그 생성
        tags = json.dumps(['gpx_import', route_data['source_file']])
        
        # Raw SQL 실행
        insert_query = text("""
        INSERT INTO routes (
            route_name, route_type, distance_km, estimated_duration_minutes,
            total_elevation_gain_m, total_elevation_loss_m, max_elevation_m, min_elevation_m,
            difficulty_level, route_coordinates, source, external_id, tags
        ) VALUES (
            :route_name, :route_type, :distance_km, :estimated_duration_minutes,
            :total_elevation_gain_m, :total_elevation_loss_m, :max_elevation_m, :min_elevation_m,
            :difficulty_level, :route_coordinates, :source, :external_id, :tags
        ) RETURNING route_id
        """)
        
        result = self.db.execute(
            insert_query,
            {
                'route_name': route_data['route_name'],
                'route_type': route_data['route_type'],
                'distance_km': stats['distance_km'],
                'estimated_duration_minutes': stats['estimated_duration_minutes'],
                'total_elevation_gain_m': stats['total_elevation_gain_m'],
                'total_elevation_loss_m': stats['total_elevation_loss_m'],
                'max_elevation_m': stats['max_elevation_m'],
                'min_elevation_m': stats['min_elevation_m'],
                'difficulty_level': stats['difficulty_level'],
                'route_coordinates': route_coordinates,
                'source': 'strava',
                'external_id': route_data['source_file'],
                'tags': tags
            }
        )
        
        route_id = result.fetchone()[0]
        self.db.commit()
        
        return route_id
    
    def insert_segments(self, route_id: int, segments: List[Dict]):
        """route_segments 테이블에 세그먼트 삽입"""
        
        for seg in segments:
            insert_query = text("""
            INSERT INTO route_segments (
                route_id, segment_order, start_lat, start_lon, end_lat, end_lon,
                segment_distance_m, segment_grade_percent, elevation_change_m,
                start_elevation_m, end_elevation_m, terrain_type
            ) VALUES (
                :route_id, :segment_order, :start_lat, :start_lon, :end_lat, :end_lon,
                :segment_distance_m, :segment_grade_percent, :elevation_change_m,
                :start_elevation_m, :end_elevation_m, :terrain_type
            )
            """)
            
            self.db.execute(insert_query, {
                'route_id': route_id,
                'segment_order': seg['segment_order'],
                'start_lat': seg['start_lat'],
                'start_lon': seg['start_lon'],
                'end_lat': seg['end_lat'],
                'end_lon': seg['end_lon'],
                'segment_distance_m': seg['segment_distance_m'],
                'segment_grade_percent': seg['segment_grade_percent'],
                'elevation_change_m': seg['elevation_change_m'],
                'start_elevation_m': seg['start_elevation_m'],
                'end_elevation_m': seg['end_elevation_m'],
                'terrain_type': seg['terrain_type']
            })
        
        self.db.commit()
    
    def load_gpx_file(self, gpx_file_path: str, segment_length: int = 100) -> Dict:
        """
        GPX 파일 하나를 DB에 적재
        
        Args:
            gpx_file_path: GPX 파일 경로
            segment_length: 세그먼트 길이 (미터)
            
        Returns:
            결과 딕셔너리
        """
        # 1. GPX 파일 파싱
        route_data = self.parse_gpx(gpx_file_path)
        
        # 2. 경로 통계 계산
        stats = self.calculate_route_stats(route_data['track_points'])
        if not stats:
            raise ValueError("유효하지 않은 GPX 파일입니다.")
        
        # 3. Routes 테이블에 삽입
        route_id = self.insert_route(route_data, stats)
        
        # 4. 세그먼트 생성 및 삽입
        segments = self.create_segments(route_data['track_points'], segment_length)
        if segments:
            self.insert_segments(route_id, segments)
        
        return {
            'route_id': route_id,
            'route_name': route_data['route_name'],
            'distance_km': stats['distance_km'],
            'elevation_gain_m': stats['total_elevation_gain_m'],
            'difficulty': stats['difficulty_level'],
            'segments_count': len(segments)
        }