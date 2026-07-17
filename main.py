import asyncio
import threading
import json
import serial
import sys
import sqlite3
import os
import random
import requests
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.websockets import WebSocket, WebSocketDisconnect
import serial.tools.list_ports
from dotenv import load_dotenv

# โหลดค่าจากไฟล์ .env
load_dotenv()

# ==========================================
# 1. การตั้งค่าระบบ (Configuration)
# ==========================================
def auto_detect_serial_port():
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "ACM" in port.device or "USB" in port.device:
            return port.device
    return None

SERIAL_PORT = os.environ.get('SERIAL_PORT', auto_detect_serial_port())
BAUD_RATE = 115200
TARGET_DEVICE_ID = os.getenv('TARGET_DEVICE_ID', 'UNO_001')
DB_FILE = 'fishpond.db'
LINE_ACCESS_TOKEN = os.getenv('LINE_ACCESS_TOKEN')

app = FastAPI(
    docs_url=None, 
    redoc_url=None, 
    openapi_url=None,
    title="Biofloc API",
    description="Secure backend for Biofloc System"
)

# CORS Security
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

active_connections = set()  
ser = None
latest_data = {}
ENABLE_MOCK_DATA = False

last_line_alert_times = {"temp": 0, "ph": 0}
last_db_alert_times = {"temp": 0, "ph": 0}

main_loop = None  # สำหรับอ้างอิง Event Loop หลักเพื่อความปลอดภัยในการส่งข้าม Thread

# ==========================================
# 2. ฟังก์ชันจัดการฐานข้อมูลและ LINE
# ==========================================
def initialize_database():
    is_new_db = not os.path.exists(DB_FILE)
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    cursor = conn.cursor()
    
    if is_new_db:
        print("🛠️ ตรวจไม่พบไฟล์ฐานข้อมูล กำลังสร้างไฟล์และตารางใหม่...")
        if os.path.exists('init_db.sql'):
            with open('init_db.sql', 'r', encoding='utf-8') as f:
                sql_script = f.read()
            cursor.executescript(sql_script)
            conn.commit()
            
            cursor.execute("INSERT OR IGNORE INTO users (user_id, username, email, password_hash, line_user_id) VALUES (1, 'admin', 'admin@pond.com', 'hashed_pw', 'U124d694f83969b54c82290a893322fdd')")
            cursor.execute("INSERT OR IGNORE INTO devices (device_id, owner_id, pond_name, location) VALUES (?, 1, 'บ่อปลาคาร์ฟ 1', 'สวนหน้าบ้าน')", (TARGET_DEVICE_ID,))
            conn.commit()
            print("✅ สร้างตารางและข้อมูลเริ่มต้นสำเร็จ")
        else:
            print("❌ ไม่พบไฟล์ init_db.sql")
    return conn

def get_db_connection():
    return sqlite3.connect(DB_FILE, check_same_thread=False)

def send_line_alert(user_id, message):
    if not LINE_ACCESS_TOKEN or LINE_ACCESS_TOKEN == 'YOUR_CHANNEL_ACCESS_TOKEN_HERE':
        return
    url = 'https://api.line.me/v2/bot/message/push'
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {LINE_ACCESS_TOKEN}'
    }
    payload = {
        "to": user_id,
        "messages": [{"type": "text", "text": message}]
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=5)
        if response.status_code == 200:
            print(f"✅ ส่ง LINE สำเร็จ: {message}")
        else:
            print(f"❌ ส่ง LINE ล้มเหลว (Status {response.status_code}): {response.text}")
    except Exception as e:
        print(f"❌ เครือข่ายขัดข้องตอนส่ง LINE: {e}")

def process_sensor_data(data):
    global last_line_alert_times, last_db_alert_times
    try:
        temp_val = data.get('wat_t', data.get('temp'))
        ph_val = data.get('ph')
        do_val = data.get('do')
        ec_val = data.get('ec')
        turbidity_val = data.get('turbidity')
        level_val = data.get('level')
        humidity_val = data.get('humidity')

        temp = float(temp_val) if temp_val is not None else None
        ph = float(ph_val) if ph_val is not None else None
        do_level = float(do_val) if do_val is not None else None
        ec_level = float(ec_val) if ec_val is not None else None
        turbidity = float(turbidity_val) if turbidity_val is not None else None
        level = float(level_val) if level_val is not None else None
        humidity = float(humidity_val) if humidity_val is not None else None
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT u.line_user_id 
            FROM devices d
            JOIN users u ON d.owner_id = u.user_id
            WHERE d.device_id = ?
        ''', (TARGET_DEVICE_ID,))
        result = cursor.fetchone()
        line_user_id = result[0] if result and result[0] else None

        current_time = time.time()
        line_cooldown = 30 * 60
        db_cooldown = 60

        def trigger_alert(sensor_name, msg, event_type='WARNING'):
            if current_time - last_db_alert_times.get(sensor_name, 0) > db_cooldown:
                cursor.execute("INSERT INTO system_events (device_id, event_type, message) VALUES (?, ?, ?)", (TARGET_DEVICE_ID, event_type, msg))
                last_db_alert_times[sensor_name] = current_time
            
            if current_time - last_line_alert_times.get(sensor_name, 0) > line_cooldown:
                if line_user_id: 
                    send_line_alert(line_user_id, msg)
                last_line_alert_times[sensor_name] = current_time

        if temp is None:
            if current_time - last_db_alert_times.get("system_disconnect", 0) > 3600:
                trigger_alert("system_disconnect", "เตือนภัย! เซนเซอร์ขาดการเชื่อมต่อ กรุณาตรวจสอบอุปกรณ์", "ALERT")
        else:
            last_db_alert_times["system_disconnect"] = 0
            last_line_alert_times["system_disconnect"] = 0
            
            if temp > 0 and (temp < 20.0 or temp > 35.0):
                trigger_alert("temp", f"เตือนภัย! อุณหภูมิน้ำผิดปกติ ({temp:.1f}°C) - ควรอยู่ระหว่าง 20-35°C", "ALERT")
                
            if ph is not None and ph > 0 and (ph < 6.5 or ph > 8.5):
                trigger_alert("ph", f"เตือนภัย! ค่า pH ผิดปกติ ({ph:.1f}) - ควรอยู่ระหว่าง 6.5-8.5", "ALERT")
                
            if do_level is not None and do_level > 0 and do_level < 5.0:
                trigger_alert("do", f"เตือนภัย! ออกซิเจนในน้ำต่ำเกินไป ({do_level:.1f} mg/L)", "ALERT")
                
            if ec_level is not None and ec_level > 0 and (ec_level < 1.0 or ec_level > 2.0):
                trigger_alert("ec", f"เตือนภัย! ค่าความนำไฟฟ้า (EC) ผิดปกติ ({ec_level:.2f} mS/cm)", "ALERT")
                
            if turbidity is not None and turbidity > 0 and (turbidity < 100 or turbidity > 150):
                trigger_alert("turbidity", f"เตือนภัย! ความขุ่นผิดปกติ ({turbidity:.0f} NTU)", "ALERT")
                
            if level is not None and level > 0 and (level < 80 or level > 100):
                trigger_alert("level", f"เตือนภัย! ระดับน้ำผิดปกติ ({level:.0f} ซม.)", "ALERT")
                
            if humidity is not None and humidity > 0 and humidity > 70:
                trigger_alert("humidity", f"เตือนภัย! ความชื้นสูงเกินไป ({humidity:.0f} %)", "ALERT")

            cursor.execute('''
                INSERT INTO sensor_logs (device_id, temperature, ph_level, do_level, turbidity)
                VALUES (?, ?, ?, ?, ?)
            ''', (TARGET_DEVICE_ID, temp, ph, do_level, turbidity))

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ การบันทึก DB มีปัญหา: {e}")

# ==========================================
# 3. การเชื่อมต่อ Serial และ เธรดเบื้องหลัง
# ==========================================
def connect_serial():
    global ser
    if SERIAL_PORT is None:
        print("❌ ไม่พบพอร์ตเชื่อมต่อ Arduino ในระบบขณะนี้")
        ser = None
        return
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"✅ เชื่อมต่อสาย USB สำเร็จ พอร์ต: {SERIAL_PORT}")
    except Exception as e:
        print(f"❌ ไม่สามารถเชื่อมต่อพอร์ต {SERIAL_PORT} ได้: {e}")
        ser = None

connect_serial()

# ฟังก์ชันตัวกลางสำหรับใช้ส่งข้อมูลข้าม Thread ไปหา WebSocket clients อย่างปลอดภัย
def safe_broadcast_to_web(message_str):
    if main_loop and active_connections:
        async def send_all():
            for connection in list(active_connections):
                try:
                    await connection.send_text(message_str)
                except:
                    active_connections.remove(connection)
        asyncio.run_coroutine_threadsafe(send_all(), main_loop)

async def broadcast(data_dict):
    global latest_data
    latest_data = data_dict
    message = json.dumps({"type": "sensorData", "data": data_dict})
    
    # ประมวลผลและบันทึกลงฐานข้อมูลแยกเบื้องหลัง
    threading.Thread(target=process_sensor_data, args=(data_dict,), daemon=True).start()
    
    # ส่งสัญญาณหา Client ทุกคน
    for connection in list(active_connections):
        try:
            await connection.send_text(message)
        except:
            active_connections.remove(connection)

def serial_reader():
    global ser
    while True:
        try:
            # 1. ตรวจสอบและพยายามเชื่อมต่อบอร์ดใหม่เมื่อสายหลุด
            if ser is None or not ser.is_open:
                current_port = auto_detect_serial_port()
                if current_port is None:
                    time.sleep(2)
                    continue
                print(f"🔄 กำลังพยายามเชื่อมต่อใหม่ที่พอร์ต: {current_port} ...")
                try:
                    ser = serial.Serial(current_port, BAUD_RATE, timeout=1)
                    print(f"🟢 กู้คืนระบบสำเร็จ! เชื่อมต่อพอร์ตใหม่สำเร็จ: {current_port}")
                    
                    status_msg = json.dumps({"type": "serverStatus", "mockMode": False, "arduinoConnected": True})
                    safe_broadcast_to_web(status_msg)
                    time.sleep(2)
                except:
                    ser = None
                    time.sleep(2)
                    continue

            # 2. ตรวจสอบข้อมูลในบัฟเฟอร์แบบปลอดภัย
            has_data = False
            try:
                if ser and ser.is_open:
                    if ser.in_waiting > 0:
                        has_data = True
            except (serial.SerialException, OSError) as e:
                print(f"⚠️ บอร์ดหลุดจริง (.in_waiting พัง): {e}")
                has_data = False
                if ser:
                    try: ser.close()
                    except: pass
                ser = None
                
                status_msg = json.dumps({"type": "serverStatus", "mockMode": ENABLE_MOCK_DATA, "arduinoConnected": False})
                safe_broadcast_to_web(status_msg)
                
                if not ENABLE_MOCK_DATA:
                    zero_data = {
                        "temp": None, "ph": None, "do": None, "ec": None, "turbidity": None, "level": None, "humidity": None, "mock": False
                    }
                    zero_msg = json.dumps({"type": "sensorData", "data": zero_data})
                    safe_broadcast_to_web(zero_msg)
                    # บันทึกสถานะระบบลง DB
                    threading.Thread(target=process_sensor_data, args=(zero_data,), daemon=True).start()
                
                time.sleep(2)
                continue

            # 3. การอ่านสัญญาณจากบอร์ด
            if has_data:
                try:
                    ser.reset_input_buffer()
                    ser.readline()  # โยนบรรทัดที่ขาดทิ้งไป
                    
                    raw_line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if raw_line.startswith('{') and raw_line.endswith('}'):
                        data = json.loads(raw_line)
                        data["mock"] = False
                        
                        # ใช้หลัก Thread-safe ในการส่งข้อมูลข้ามไปยัง WebSocket Loop หลัก
                        if main_loop and active_connections:
                            asyncio.run_coroutine_threadsafe(broadcast(data), main_loop)
                except Exception as e:
                    print(f"⚠️ [Data Read Error]: {e}")
                
                time.sleep(1)
            else:
                time.sleep(0.1)
                
        except (serial.SerialException, OSError, Exception) as e:
            print(f"⚠️ [Serial Error] เกิดข้อผิดพลาดภาพรวม: {e}")
            if ser:
                try: ser.close()
                except: pass
                ser = None
            time.sleep(2)

threading.Thread(target=serial_reader, daemon=True).start()

# ==========================================
# 4. API และ WebSocket Endpoints (FastAPI)
# ==========================================
mock_device_state = {
    "airPump": 1,
    "waterPump": 1,
    "molassesDispenser": 0,
    "microbeDispenser": 0
}

async def mock_broadcaster():
    global ENABLE_MOCK_DATA, mock_device_state
    while True:
        if ser is None and ENABLE_MOCK_DATA:
            mock_data = {
                "temp": 28.5,      
                "ph": 4.5,         
                "do": 6.0,         
                "ec": 3.8,         
                "turbidity": 120,  
                "level": 90,       
                "humidity": 85,    
                "mock": True
            }
            mock_data.update(mock_device_state)
            if active_connections:
                await broadcast(mock_data)
        await asyncio.sleep(2)

from pydantic import BaseModel
class MockConfig(BaseModel):
    enabled: bool

@app.get("/api/settings/mock")
async def get_mock_setting():
    global ENABLE_MOCK_DATA
    return {"enabled": ENABLE_MOCK_DATA}

@app.post("/api/settings/mock")
async def set_mock_setting(config: MockConfig):
    global ENABLE_MOCK_DATA, last_line_alert_times, last_db_alert_times, ser, active_connections
    ENABLE_MOCK_DATA = config.enabled
    last_line_alert_times.clear()
    last_db_alert_times.clear()
    
    if not ENABLE_MOCK_DATA:
        if ser is None and active_connections:
            zero_data = {
                "temp": None, "ph": None, "do": None, "ec": None, "turbidity": None, "level": None, "humidity": None, "mock": False
            }
            await broadcast(zero_data)
    return {"enabled": ENABLE_MOCK_DATA}

@app.on_event("startup")
async def startup_event():
    global main_loop
    main_loop = asyncio.get_running_loop() # จับ Event Loop หลักของ FastAPI เก็บไว้
    initialize_database()
    asyncio.create_task(mock_broadcaster())

@app.get("/api/alerts")
async def get_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, event_type, message, timestamp FROM system_events ORDER BY timestamp DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    
    alerts = []
    for row in rows:
        alert_type = "critical" if row[1] == "ALERT" else "warning" if row[1] == "WARNING" else "info"
        alerts.append({
            "id": row[0],
            "type": alert_type,
            "title": "แจ้งเตือนระบบ",
            "message": row[2],
            "timestamp": row[3],
            "acknowledged": False
        })
    return alerts

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    
    is_arduino_active = ser is not None and ser.is_open
    
    await websocket.send_text(json.dumps({
        "type": "serverStatus", 
        "mockMode": ENABLE_MOCK_DATA,
        "arduinoConnected": is_arduino_active
    }))
    
    if latest_data:
        send_data = latest_data.copy()
        send_data["mock"] = not is_arduino_active
        await websocket.send_text(json.dumps({
            "type": "sensorData", 
            "data": send_data
        }))
        
    try:
        while True:
            data_from_web = await websocket.receive_text()
            try:
                web_json = json.loads(data_from_web)
                
                if web_json.get("action") == "controlDevice":
                    cmd_data = web_json.get("data", {})
                    
                    if ser:
                        if "buzzer" in cmd_data:
                            is_muted = cmd_data['buzzer']
                            serial_cmd = "MUTE_ON\n" if is_muted else "MUTE_OFF\n"
                        else:
                            serial_cmd = json.dumps(cmd_data) + "\n"
                        
                        ser.write(serial_cmd.encode('utf-8'))
                        print(f"📡 ส่งคำสั่งควบคุมไป Arduino: {serial_cmd.strip()}")
                        
                    elif ENABLE_MOCK_DATA:
                        device = cmd_data.get("device")
                        state = cmd_data.get("state")
                        if device in mock_device_state:
                            mock_device_state[device] = 1 if state else 0
                            print(f"📡 [Mock] เปลี่ยนสถานะ {device} เป็น {mock_device_state[device]}")
                        
            except Exception as e:
                print(f"Error parsing ws message: {e}")
                
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# ==========================================
# 5. การจัดการ Static Files & Router สำหรับ SPA React/Vue
# ==========================================
dist_dir = os.path.join(os.path.dirname(__file__), "dist")

if os.path.isdir(dist_dir):
    # ยึด Assets หลักก่อน
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    # สำหรับ Root Route (/) ส่งหน้าหลักตรง ๆ ป้องกันการซ้อนของ SPA Router 
    @app.get("/", response_class=FileResponse)
    async def serve_index():
        return FileResponse(
            os.path.join(dist_dir, "index.html"),
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
        )

    # สำหรับ Path อื่น ๆ (เช่น /dashboard, /settings) ให้ SPA Routing จัดการตัวเอง
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        possible_path = os.path.join(dist_dir, full_path)
        # ถ้ามีไฟล์นั้นจริง ๆ ใน dist (เช่น โลโก้ หรือรูปภาพ) ให้ส่งไฟล์นั้นไปเลย
        if os.path.isfile(possible_path):
            return FileResponse(possible_path)
        # ถ้าไม่เจอไฟล์ ให้เด้งกลับไปที่ index.html เพื่อให้ React/Vue Router จัดการต่อ
        return FileResponse(
            os.path.join(dist_dir, "index.html"),
            headers={"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
        )
else:
    @app.get("/")
    async def serve_warning():
        return HTMLResponse("<h1>Folder 'dist' not found. Please run 'npm run build' first.</h1>")