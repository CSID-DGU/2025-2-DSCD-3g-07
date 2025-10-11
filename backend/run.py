import uvicorn
import os
from dotenv import load_dotenv
from utils.network_utils import print_network_info, get_local_ip

load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"
    
    print(f"🚀 Starting PaceTry API Server...")
    print(f"📍 Host: {host} (listening on all interfaces)")
    print(f"🔌 Port: {port}")
    print(f"🔧 Debug Mode: {debug}")
    
    # 네트워크 정보 출력
    print_network_info()
    
    # 로컬 IP 기반 URL도 표시
    local_ip = get_local_ip()
    if local_ip:
        print(f"📱 For mobile/team access: http://{local_ip}:{port}")
        print(f"📚 API Docs: http://{local_ip}:{port}/docs")
        print(f"📖 ReDoc: http://{local_ip}:{port}/redoc")
    else:
        print(f"📚 API Docs: http://localhost:{port}/docs")
        print(f"📖 ReDoc: http://localhost:{port}/redoc")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=debug,
        log_level="info"
    )