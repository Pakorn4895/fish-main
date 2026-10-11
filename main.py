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
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.websockets import WebSocket, WebSocketDisconnect
import serial.tools.list_ports
from pydantic import BaseModel
from dotenv import load_dotenv

# โหลดค่าจากไฟล์ .env
load_dotenv()

# ==========================================
# 1. การตั้งค่าระบบ (Configuration)
# ==========================================
def auto_detect_serial_ports():
    ports = serial.tools.list_ports.comports()
    detected = []
    for port in ports:
        if "ACM" in port.device or "USB" in port.device:
            detected.append(port.device)
    return detected

SERIAL_PORT_ENV = os.environ.get('SERIAL_PORT')
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
        device_id = data.get('device_id', TARGET_DEVICE_ID)
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
        ''', (device_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.execute("INSERT OR IGNORE INTO devices (device_id, owner_id, pond_name, location) VALUES (?, 1, ?, 'ยังไม่ระบุ')", (device_id, f'บ่อ {device_id}'))
            cursor.execute('''
                SELECT u.line_user_id 
                FROM devices d
                JOIN users u ON d.owner_id = u.user_id
                WHERE d.device_id = ?
            ''', (device_id,))
            result = cursor.fetchone()
            
        line_user_id = result[0] if result and result[0] else None

        current_time = time.time()
        line_cooldown = 24 * 60 * 60  # 1 วัน
        db_cooldown = 60

        def trigger_alert(sensor_name, msg, event_type='WARNING'):
            db_key = f"{device_id}_{sensor_name}"
            if current_time - last_db_alert_times.get(db_key, 0) > db_cooldown:
                cursor.execute("INSERT INTO system_events (device_id, event_type, message) VALUES (?, ?, ?)", (device_id, event_type, msg))
                last_db_alert_times[db_key] = current_time
            
            if current_time - last_line_alert_times.get(db_key, 0) > line_cooldown:
                if line_user_id: 
                    send_line_alert(line_user_id, f"[{device_id}] {msg}")
                last_line_alert_times[db_key] = current_time

        if temp is None:
            if current_time - last_db_alert_times.get(f"{device_id}_system_disconnect", 0) > 3600:
                trigger_alert("system_disconnect", "เตือนภัย! เซนเซอร์ขาดการเชื่อมต่อ กรุณาตรวจสอบอุปกรณ์", "ALERT")
        else:
            last_db_alert_times[f"{device_id}_system_disconnect"] = 0
            last_line_alert_times[f"{device_id}_system_disconnect"] = 0
            
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
            ''', (device_id, temp, ph, do_level, turbidity))

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ การบันทึก DB มีปัญหา: {e}")

# ==========================================
# 3. การเชื่อมต่อ Serial และ เธรดเบื้องหลัง (Multi-Port)
# ==========================================
active_serials = {}

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
    
    threading.Thread(target=process_sensor_data, args=(data_dict,), daemon=True).start()
    
    for connection in list(active_connections):
        try:
            await connection.send_text(message)
        except:
            active_connections.remove(connection)

async def broadcast_raw(message: str):
    for connection in list(active_connections):
        try:
            await connection.send_text(message)
        except:
            active_connections.remove(connection)

def single_serial_reader(port_name):
    ser = active_serials.get(port_name)
    if not ser: return
    
    while True:
        try:
            if not ser.is_open:
                break
                
            if ser.in_waiting > 0:
                raw_line = ser.readline().decode('utf-8', errors='ignore').strip()
                if raw_line.startswith('{') and raw_line.endswith('}'):
                    data = json.loads(raw_line)
                    if "action" in data and data["action"] == "node_status":
                        node_id = str(data.get("node_id", ""))
                        status = data.get("status", "")
                        if status == "online":
                            node_last_seen[node_id] = time.time()
                            node_ui_offline_sent[node_id] = False
                            node_line_alert_sent[node_id] = False
                        if main_loop and active_connections:
                            payload = {"type": "nodeStatus", "nodeId": node_id, "status": status}
                            for k, v in data.items():
                                if k not in ["action", "node_id", "status"]:
                                    payload[k] = v
                            msg = json.dumps(payload)
                            asyncio.run_coroutine_threadsafe(broadcast_raw(msg), main_loop)
                    else:
                        data["mock"] = False
                        if main_loop and active_connections:
                            asyncio.run_coroutine_threadsafe(broadcast(data), main_loop)
            else:
                time.sleep(0.1)
                
        except (serial.SerialException, OSError, Exception) as e:
            print(f"⚠️ [Serial Error] พอร์ต {port_name} หลุด: {e}")
            break
            
    try: ser.close()
    except: pass
    active_serials[port_name] = None
    
    any_connected = any(s is not None and s.is_open for s in active_serials.values())
    if not any_connected:
        status_msg = json.dumps({"type": "serverStatus", "mockMode": ENABLE_MOCK_DATA, "arduinoConnected": False})
        safe_broadcast_to_web(status_msg)
        if not ENABLE_MOCK_DATA:
            zero_data = {
                "temp": None, "ph": None, "do": None, "ec": None, "turbidity": None, "level": None, "humidity": None, "mock": False
            }
            zero_msg = json.dumps({"type": "sensorData", "data": zero_data})
            safe_broadcast_to_web(zero_msg)
            threading.Thread(target=process_sensor_data, args=(zero_data,), daemon=True).start()

def port_manager():
    while True:
        current_ports = auto_detect_serial_ports()
        
        # ไม่ใช้ SERIAL_PORT_ENV เพื่อบังคับเปิดทุกพอร์ต USB ที่เจอ

        for p in current_ports:
            if p not in active_serials or active_serials[p] is None:
                try:
                    s = serial.Serial(p, BAUD_RATE, timeout=1)
                    active_serials[p] = s
                    print(f"🟢 เชื่อมต่อพอร์ตใหม่สำเร็จ: {p}")
                    status_msg = json.dumps({"type": "serverStatus", "mockMode": ENABLE_MOCK_DATA, "arduinoConnected": True})
                    safe_broadcast_to_web(status_msg)
                    threading.Thread(target=single_serial_reader, args=(p,), daemon=True).start()
                except Exception as e:
                    pass
        time.sleep(2)

threading.Thread(target=port_manager, daemon=True).start()

node_last_seen = {}
node_ui_offline_sent = {}
node_line_alert_sent = {}

def node_watchdog():
    while True:
        current_time = time.time()
        for node_id, last_time in list(node_last_seen.items()):
            time_offline = current_time - last_time
            
            # Update UI immediately after 25s
            if time_offline > 25 and not node_ui_offline_sent.get(node_id, False):
                if main_loop and active_connections:
                    msg = json.dumps({"type": "nodeStatus", "nodeId": node_id, "status": "offline"})
                    asyncio.run_coroutine_threadsafe(broadcast_raw(msg), main_loop)
                node_ui_offline_sent[node_id] = True
            
            # Send LINE alert after 1 day (86400 seconds)
            if time_offline > 86400 and not node_line_alert_sent.get(node_id, False):
                try:
                    with sqlite3.connect(DB_FILE, check_same_thread=False) as conn:
                        cursor = conn.cursor()
                        cursor.execute('SELECT line_user_id FROM users WHERE user_id = 1')
                        res = cursor.fetchone()
                        if res and res[0]:
                            send_line_alert(res[0], f"⚠️ แจ้งเตือน: เครื่องให้อาหารบ่อที่ {node_id} ขาดการเชื่อมต่อ!")
                except Exception as e:
                    print(f"Watchdog DB error: {e}")
                
                node_line_alert_sent[node_id] = True
                
        time.sleep(5)

threading.Thread(target=node_watchdog, daemon=True).start()

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
        any_connected = any(s is not None and s.is_open for s in active_serials.values())
        if not any_connected and ENABLE_MOCK_DATA:
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
    global ENABLE_MOCK_DATA, last_line_alert_times, last_db_alert_times, active_connections
    ENABLE_MOCK_DATA = config.enabled
    last_line_alert_times.clear()
    last_db_alert_times.clear()
    
    if not ENABLE_MOCK_DATA:
        any_connected = any(s is not None and s.is_open for s in active_serials.values())
        if not any_connected and active_connections:
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

@app.get("/api/analytics")
async def get_analytics(date: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if date:
        # SQLite CURRENT_TIMESTAMP is in UTC, use localtime to display correctly
        cursor.execute('''
            SELECT strftime('%H:%M', datetime(timestamp, 'localtime')), temperature, ph_level, do_level, turbidity
            FROM sensor_logs
            WHERE date(datetime(timestamp, 'localtime')) = ?
            ORDER BY timestamp ASC
        ''', (date,))
    else:
        cursor.execute('''
            SELECT strftime('%H:%M', datetime(timestamp, 'localtime')), temperature, ph_level, do_level, turbidity
            FROM sensor_logs
            ORDER BY timestamp DESC
            LIMIT 100
        ''')
        
    rows = cursor.fetchall()
    conn.close()
    
    result = []
    if not date:
        rows.reverse()
        
    for row in rows:
        result.append({
            "time": row[0],
            "temp": row[1],
            "pH": row[2],
            "DO": row[3],
            "turbidity": row[4],
            "ec": None # ec is not currently stored in the DB
        })
        
    return result

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)
    
    is_arduino_active = any(s is not None and s.is_open for s in active_serials.values())
    
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
                    
                    any_connected = any(s is not None and s.is_open for s in active_serials.values())
                    if any_connected:
                        if "buzzer" in cmd_data:
                            is_muted = cmd_data['buzzer']
                            serial_cmd = "MUTE_ON\n" if is_muted else "MUTE_OFF\n"
                        elif cmd_data.get("device") == "buzzer":
                            is_muted = cmd_data.get("state")
                            serial_cmd = "MUTE_ON\n" if is_muted else "MUTE_OFF\n"
                        elif cmd_data.get("device") == "scan":
                            serial_cmd = "scan\n"
                        else:
                            serial_cmd = json.dumps(cmd_data, separators=(',', ':')) + "\n"
                        
                        for p, s in active_serials.items():
                            if s and s.is_open:
                                try:
                                    s.write(serial_cmd.encode('utf-8'))
                                except Exception as e:
                                    print(f"⚠️ ส่งคำสั่งไปพอร์ต {p} ไม่สำเร็จ: {e}")
                        print(f"📡 ส่งคำสั่งควบคุมไปบอร์ดทั้งหมด: {serial_cmd.strip()}")
                        
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
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.isdir(assets_dir):
        # ยึด Assets หลักก่อน
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

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