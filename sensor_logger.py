import sqlite3
import os
import time
import random
import json

# ลอง import ไลบรารี pyserial สำหรับอ่านค่าจากสาย USB (ถ้ายังไม่ได้ลงให้อยู่ในโหมดจำลอง)
try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("⚠️ ยังไม่ได้ติดตั้ง 'pyserial' ระบบจะรันในโหมดจำลอง (Simulation Mode)")
    print("   หากต้องการต่อสาย Uno จริง ให้รันคำสั่ง: pip install pyserial\n")

DB_FILE = 'fishpond.db'
SQL_FILE = 'init_db.sql'
TARGET_DEVICE_ID = 'UNO_001'

def initialize_database():
    """ฟังก์ชันอ่านไฟล์ init_db.sql และสร้างไฟล์ฐานข้อมูล fishpond.db"""
    is_new_db = not os.path.exists(DB_FILE)
    
    # เชื่อมต่อ SQLite (ถ้าไม่มีไฟล์ มันจะสร้างให้ใหม่)
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    if is_new_db:
        print("🛠️ ตรวจไม่พบไฟล์ฐานข้อมูล กำลังสร้างไฟล์และตารางใหม่...")
        if os.path.exists(SQL_FILE):
            with open(SQL_FILE, 'r', encoding='utf-8') as f:
                sql_script = f.read()
            cursor.executescript(sql_script)
            conn.commit()
            print("✅ สร้างตารางจากไฟล์ init_db.sql สำเร็จ")
            
            # จำลองเพิ่มผู้ใช้และบอร์ดตั้งต้น เพื่อให้ระบบทำงานได้ (เพราะมี Foreign Key บังคับไว้)
            cursor.execute("INSERT OR IGNORE INTO users (user_id, username, email, password_hash) VALUES (1, 'admin', 'admin@pond.com', 'hashed_pw')")
            cursor.execute("INSERT OR IGNORE INTO devices (device_id, owner_id, pond_name, location) VALUES (?, 1, 'บ่อปลาคาร์ฟ 1', 'สวนหน้าบ้าน')", (TARGET_DEVICE_ID,))
            conn.commit()
            print(f"✅ ลงทะเบียนบอร์ด {TARGET_DEVICE_ID} เข้าระบบสำเร็จ\n")
        else:
            print(f"❌ ไม่พบไฟล์ {SQL_FILE} ในโฟลเดอร์ กรุณาตรวจสอบ!")
            
    return conn

def log_data(conn, device_id, temp, ph, do_level, turbidity):
    """บันทึกข้อมูลลงตาราง sensor_logs"""
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO sensor_logs (device_id, temperature, ph_level, do_level, turbidity)
            VALUES (?, ?, ?, ?, ?)
        ''', (device_id, temp, ph, do_level, turbidity))
        conn.commit()
        print(f"📊 [บันทึกสำเร็จ] อุณหภูมิ: {temp:.2f}°C, pH: {ph:.2f}")
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการบันทึก: {e}")

def check_conditions(conn, device_id, temp, ph):
    """ตรวจสอบค่าผิดปกติ ถ้ามีให้บันทึกลงตาราง system_events"""
    cursor = conn.cursor()
    
    if temp > 32.0:
        msg = f"อุณหภูมิน้ำสูงเกินไป ({temp:.2f}°C)"
        cursor.execute("INSERT INTO system_events (device_id, event_type, message) VALUES (?, 'WARNING', ?)", (device_id, msg))
        conn.commit()
        print(f"⚠️ [แจ้งเตือน] {msg}")
        # 💡 ในอนาคต เราสามารถเพิ่มโค้ดเรียก LINE API ตรงนี้ได้เลย
        
    if ph < 6.0:
        msg = f"น้ำมีค่าเป็นกรดมากเกินไป (pH {ph:.2f})"
        cursor.execute("INSERT INTO system_events (device_id, event_type, message) VALUES (?, 'ALERT', ?)", (device_id, msg))
        conn.commit()
        print(f"⚠️ [แจ้งเตือน] {msg}")


def start_logging(conn, use_simulation=True, serial_port='COM3', baudrate=9600):
    """ฟังก์ชันหลักสำหรับลูปรับค่า"""
    ser = None
    
    # ถ้าตั้งใจจะใช้ของจริง และมี pyserial ติดตั้งแล้ว
    if not use_simulation and SERIAL_AVAILABLE:
        try:
            ser = serial.Serial(serial_port, baudrate, timeout=1)
            print(f"🔌 เชื่อมต่อบอร์ด Uno ผ่านพอร์ต {serial_port} สำเร็จ")
            time.sleep(2) # รอ Arduino Reset ตัวเอง
        except Exception as e:
            print(f"❌ ไม่สามารถเปิดพอร์ต {serial_port} ได้ ระบบจะเปลี่ยนไปใช้ 'โหมดจำลอง' แทน ({e})")
            use_simulation = True

    print("\n🚀 เริ่มต้นระบบ Data Logger (กด Ctrl+C เพื่อหยุดการทำงาน)\n" + "-"*50)
    
    try:
        while True:
            if use_simulation:
                # ---------------- โหมดจำลองข้อมูล ----------------
                temp = round(random.uniform(28.0, 33.5), 2)
                ph = round(random.uniform(5.5, 8.0), 2)
                do_level = round(random.uniform(5.0, 7.5), 2)
                turbidity = round(random.uniform(10.0, 30.0), 2)
                time.sleep(3) # จำลองว่ารับค่ามาทุกๆ 3 วินาที
                
            else:
                # ---------------- โหมดรับค่าจากบอร์ดจริง ----------------
                if ser.in_waiting > 0:
                    line = ser.readline().decode('utf-8').strip()
                    # สมมติบอร์ดส่งมาเป็น JSON เช่น {"temp": 29.5, "ph": 7.0, "do": 6.5, "turbidity": 15.0}
                    try:
                        data = json.loads(line)
                        temp = float(data.get('temp', 0))
                        ph = float(data.get('ph', 0))
                        do_level = float(data.get('do', 0))
                        turbidity = float(data.get('turbidity', 0))
                    except json.JSONDecodeError:
                        print(f"⚠️ รูปแบบข้อมูลจาก Uno ไม่ถูกต้อง: {line}")
                        continue
                else:
                    time.sleep(0.5)
                    continue

            # 1. บันทึกข้อมูล
            log_data(conn, TARGET_DEVICE_ID, temp, ph, do_level, turbidity)
            
            # 2. ตรวจสอบความผิดปกติ
            check_conditions(conn, TARGET_DEVICE_ID, temp, ph)
            print("-" * 30)
            
    except KeyboardInterrupt:
        print("\n🛑 หยุดการทำงานของ Data Logger")
    finally:
        if ser:
            ser.close()
        conn.close()

if __name__ == '__main__':
    # 1. จัดการฐานข้อมูลก่อน
    db_connection = initialize_database()
    
    # 2. เริ่มทำงาน (สามารถเปลี่ยน use_simulation=False และแก้ serial_port ให้ตรงกับช่องเสียบ USB ได้)
    # สำหรับ Raspberry Pi พอร์ตมักจะเป็น '/dev/ttyACM0' หรือ '/dev/ttyUSB0'
    # สำหรับ Windows พอร์ตมักจะเป็น 'COM3', 'COM4'
    start_logging(db_connection, use_simulation=True, serial_port='COM3')
