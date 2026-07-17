-- =======================================================================
-- ฐานข้อมูลระบบบ่อปลา IoT (Fish Pond Monitoring System)
-- =======================================================================

-- 1. ตารางผู้ใช้งาน (Users)
-- เก็บข้อมูลเจ้าของบ่อปลา รหัสผ่าน และการตั้งค่า LINE สำหรับรับแจ้งเตือน
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,               -- ชื่อผู้ใช้ (ห้ามซ้ำ)
    email TEXT UNIQUE NOT NULL,                  -- อีเมล (ห้ามซ้ำ)
    password_hash TEXT NOT NULL,                 -- รหัสผ่าน (ผ่านการเข้ารหัสแล้ว)
    line_user_id TEXT UNIQUE,                    -- LINE User ID สำหรับรับแจ้งเตือน
    is_line_notified BOOLEAN DEFAULT 1,          -- เปิด/ปิด การแจ้งเตือน LINE (1 = เปิด)
    role TEXT DEFAULT 'user',                    -- สิทธิ์การใช้งาน (เช่น 'admin', 'user')
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP-- วันที่สมัครสมาชิก
);

-- =======================================================================
-- 2. ตารางอุปกรณ์หรือจุดติดตั้ง (Devices / Ponds)
-- เก็บข้อมูลว่าอุปกรณ์/เซนเซอร์จุดนี้เป็นของใคร
CREATE TABLE IF NOT EXISTS devices (
    device_id TEXT PRIMARY KEY,                  -- รหัสบอร์ด (เช่น 'UNO_001')
    owner_id INTEGER,                            -- เจ้าของบอร์ด (เชื่อมไปตาราง users)
    pond_name TEXT,                              -- ชื่อบ่อปลา (เช่น 'บ่ออนุบาล')
    location TEXT,                               -- สถานที่ติดตั้ง
    FOREIGN KEY (owner_id) REFERENCES users (user_id) ON DELETE CASCADE
);

-- =======================================================================
-- 3. ตารางประวัติค่าเซนเซอร์ (Sensor Logs)
-- เก็บบันทึกข้อมูลทุกๆ ครั้งที่บอร์ด Uno ส่งค่าเข้ามา
CREATE TABLE IF NOT EXISTS sensor_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,-- วันเวลาที่บันทึก (ออโต้)
    device_id TEXT,                              -- บอร์ดไหนส่งมา
    temperature REAL,                            -- อุณหภูมิ
    ph_level REAL,                               -- ค่า pH
    do_level REAL,                               -- ค่าออกซิเจนในน้ำ (DO)
    turbidity REAL,                              -- ค่าความขุ่น
    water_level REAL,                            -- ระดับน้ำ (เพิ่มเผื่อไว้)
    FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
);

-- =======================================================================
-- 4. ตารางประวัติแจ้งเตือนและเหตุการณ์ (System Events)
-- บันทึกเหตุการณ์ผิดปกติ (เช่น น้ำร้อนเกิน, เครื่องตีน้ำทำงาน)
CREATE TABLE IF NOT EXISTS system_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_id TEXT,
    event_type TEXT,                             -- ประเภท (เช่น 'WARNING', 'ALERT', 'INFO')
    message TEXT,                                -- ข้อความรายละเอียด
    FOREIGN KEY (device_id) REFERENCES devices (device_id) ON DELETE CASCADE
);
