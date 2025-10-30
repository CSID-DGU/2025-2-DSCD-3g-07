import socket
import subprocess
import platform
import re
from typing import Optional, List

def get_local_ip() -> Optional[str]:
    """
    로컬 네트워크 IP 주소를 자동으로 감지합니다.
    우선순위: 1) ipconfig (더 정확) 2) Socket 연결 (백업)
    
    Returns:
        str: 로컬 IP 주소 (예: 172.30.1.59)
        None: IP를 찾을 수 없는 경우
    """
    
    # 방법 1: Windows ipconfig 명령어 (우선순위)
    if platform.system() == "Windows":
        try:
            result = subprocess.run(['ipconfig'], capture_output=True, text=True)
            output = result.stdout
            
            # IPv4 주소 패턴 찾기 (사설 IP만)
            ipv4_pattern = r'IPv4.*?: (192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)'
            matches = re.findall(ipv4_pattern, output)
            
            if matches:
                local_ip = matches[0]
                print(f"🔍 Method 1 - Windows ipconfig: {local_ip}")
                return local_ip
                
        except Exception as e:
            print(f"⚠️ Method 1 (ipconfig) failed: {e}")
    
    # 방법 1-2: Linux/Mac 시스템 명령어
    else:
        try:
            result = subprocess.run(['hostname', '-I'], capture_output=True, text=True)
            if result.returncode == 0:
                ips = result.stdout.strip().split()
                for ip in ips:
                    if not ip.startswith('127.') and '.' in ip:
                        print(f"🔍 Method 1 - Unix hostname: {ip}")
                        return ip
                        
        except Exception as e:
            print(f"⚠️ Method 1 (hostname) failed: {e}")

    # 방법 2: Socket 연결 (백업)
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            # Google DNS에 연결 (실제로 데이터를 보내지는 않음)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            
            # 로컬호스트가 아닌 실제 네트워크 IP인지 확인
            if not local_ip.startswith('127.'):
                print(f"🔍 Method 2 - Socket connection: {local_ip}")
                return local_ip
                
    except Exception as e:
        print(f"⚠️ Method 2 (socket) failed: {e}")

    print("❌ Could not detect local IP address")
    return None

def get_network_interfaces() -> List[dict]:
    """
    모든 네트워크 인터페이스 정보를 반환합니다.
    """
    interfaces = []
    
    try:
        if platform.system() == "Windows":
            result = subprocess.run(['ipconfig', '/all'], capture_output=True, text=True)
            output = result.stdout
            
            # 간단한 파싱 (이더넷/WiFi 어댑터 찾기)
            lines = output.split('\n')
            current_adapter = None
            
            for line in lines:
                line = line.strip()
                
                # 어댑터 이름 감지
                if 'adapter' in line.lower() and ':' in line:
                    current_adapter = line
                    
                # IPv4 주소 감지
                elif 'IPv4' in line and current_adapter:
                    ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line)
                    if ip_match:
                        ip = ip_match.group(1)
                        if not ip.startswith('127.'):
                            interfaces.append({
                                'name': current_adapter,
                                'ip': ip,
                                'type': 'IPv4'
                            })
                            
    except Exception as e:
        print(f"⚠️ Failed to get network interfaces: {e}")
    
    return interfaces

def print_network_info():
    """
    네트워크 정보를 출력합니다.
    """
    print("\n" + "="*50)
    print("🌐 NETWORK INFORMATION")
    print("="*50)
    
    # 로컬 IP
    local_ip = get_local_ip()
    if local_ip:
        print(f"🔍 Detected Local IP: {local_ip}")
        print(f"📡 Backend accessible at: http://{local_ip}:8000")
        print(f"📚 API Docs: http://{local_ip}:8000/docs")
    else:
        print("❌ Could not detect local IP")
        
    # 네트워크 인터페이스
    interfaces = get_network_interfaces()
    if interfaces:
        print(f"\n📋 Available Network Interfaces:")
        for i, interface in enumerate(interfaces, 1):
            print(f"  {i}. {interface['name']}")
            print(f"     IP: {interface['ip']}")
            
    print("="*50 + "\n")

if __name__ == "__main__":
    print_network_info()
