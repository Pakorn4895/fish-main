import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface SensorData {
  temp: number | null;
  ph: number | null;
  turbidity: number | null;
  level: number | null;
  humidity: number | null;
  do: number | null;
  ec: number | null;
  filter: number;    // 1 = ON, 0 = OFF
  airPump: number;
  waterPump: number;
  molassesDispenser: number; // 1 = ON, 0 = OFF
  microbeDispenser: number;  // 1 = ON, 0 = OFF
  mock?: boolean;
}

interface SensorContextValue {
  data: SensorData;
  isConnected: boolean;       // สถานะการเชื่อมต่อกับหลังบ้าน FastAPI
  isArduinoConnected: boolean; // 🌟 สถานะฮาร์ดแวร์บอร์ด Arduino Mega จริง
  isMockMode: boolean;
  sendCommand: (device: string, state: boolean | number, payload?: any) => void;
}

// ─── Default Values ───────────────────────────────────────────────────────────
const defaultData: SensorData = {
  temp: null, ph: null, turbidity: null, level: null, humidity: null, do: null, ec: null,
  filter: 1, airPump: 1, waterPump: 1,
  molassesDispenser: 0, microbeDispenser: 0, mock: true,
};

const SensorContext = createContext<SensorContextValue>({
  data: defaultData,
  isConnected: false,
  isArduinoConnected: false, // 🌟 ค่าเริ่มต้น
  isMockMode: true,
  sendCommand: () => { },
});

// ─── Backend URL ──────────────────────────────────────────────────────────// รองรับการใช้งานผ่าน LAN โดยให้ดึง Host อัตโนมัติจากเบราว์เซอร์
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const SOCKET_URL = import.meta.env.DEV
  ? `${protocol}//${window.location.host}/ws` // จะถูก Vite Proxy ส่งไปที่ backend
  : `${protocol}//${window.location.host}/ws`; // เมื่อ Build แล้วจะเรียก FastAPI ตรงๆ

// ─── Provider ────────────────────────────────────────────────────────────────
export function SensorProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SensorData>(defaultData);
  const [isConnected, setIsConnected] = useState(false);
  const [isArduinoConnected, setIsArduinoConnected] = useState(false); // 🌟 State เก็บสถานะบอร์ดจริง
  const [isMockMode, setIsMockMode] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    const connectWebSocket = () => {
      const ws = new WebSocket(SOCKET_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to FastAPI backend');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // 1. ตรวจสอบสถานะ Server และสถานะบอร์ด Arduino จริงจาก FastAPI (เชื่อมั่นตรงนี้ตัวเดียว!)
          if (payload.type === 'serverStatus') {
            setIsMockMode(payload.mockMode);
            setIsArduinoConnected(payload.arduinoConnected ?? false);
          }
          // 2. ตรวจสอบพัสดุข้อมูลเซนเซอร์
          else if (payload.type === 'sensorData' || payload.wat_t !== undefined || payload.temp !== undefined) {
            const sensorData = payload.type === 'sensorData' ? payload.data : payload;

            const parseVal = (val: any) => (val === undefined || val === null) ? null : Number(val);

            const mappedData: SensorData = {
              temp: parseVal(sensorData.wat_t ?? sensorData.temp),
              ph: parseVal(sensorData.ph),
              turbidity: parseVal(sensorData.turbidity),
              level: parseVal(sensorData.level),
              humidity: parseVal(sensorData.hum ?? sensorData.humidity),
              do: parseVal(sensorData.do),
              ec: parseVal(sensorData.ec),
              filter: sensorData.filter ?? 1,
              airPump: sensorData.airPump ?? 1,
              waterPump: sensorData.waterPump ?? 1,
              molassesDispenser: sensorData.molassesDispenser ?? 0,
              microbeDispenser: sensorData.microbeDispenser ?? 0,
              mock: sensorData.mock ?? false
            };

            setData(mappedData);

            // 🛠️ แก้ไขจุดนี้: ถ้าข้อมููลบอกว่าเป็นโหมด Mock หรือบังคับสเตตัสมาให้ ให้ใช้ตามนั้น
            if (sensorData.mock !== undefined) {
              setIsMockMode(sensorData.mock);
              // ห้ามสั่งเซ็ต `setIsArduinoConnected` มั่วซั่วตรงนี้ เพื่อป้องกันข้อมูลเก่าค้างจากเซิร์ฟเวอร์
            }
          }
        } catch (error) {
          console.error('Error parsing websocket message:', error);
        }
      };

      ws.onclose = () => {
        console.warn('❌ Disconnected from backend');
        setIsConnected(false);
        setIsArduinoConnected(false); // 🌟 เมื่อท่อหลุด ให้เซ็ตสถานะบอร์ดเป็นเท็จรอไว้เลย

        reconnectTimer = setTimeout(() => {
          console.log('⏳ Attempting to reconnect...');
          connectWebSocket();
        }, 2000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendCommand = (device: string, state: boolean, extra?: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const command = {
        action: 'controlDevice',
        data: { device, state, ...extra }
      };
      wsRef.current.send(JSON.stringify(command));
    } else {
      console.warn('WebSocket not connected, cannot send command');
    }
  };

  return (
    <SensorContext.Provider value={{ data, isConnected, isArduinoConnected, isMockMode, sendCommand }}>
      {children}
    </SensorContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSensorData() {
  return useContext(SensorContext);
}