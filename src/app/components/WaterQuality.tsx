import { useState } from "react";
import {
  Thermometer,
  Droplet,
  Wind,
  Gauge,
  Settings,
  Waves,
  Info
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

// Simple Tooltip component
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      {children}
      {show && (
        <>
          {/* Mobile Tooltip (Fixed at bottom) */}
          <div className="fixed sm:hidden z-50 bottom-20 left-1/2 -translate-x-1/2 px-4 py-3 bg-slate-900 text-white text-xs rounded-xl shadow-2xl w-[90vw] text-center border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
            {content}
          </div>
          {/* Desktop Tooltip (Absolute) */}
          <div className="hidden sm:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg w-64 text-center">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
          </div>
        </>
      )}
    </div>
  );
}

import { useSensorData } from "../hooks/useSensorData";

export default function WaterQuality() {
  const { data: sensor, isConnected, isMockMode } = useSensorData();
  const [thresholds, setThresholds] = useState({
    tempMin: 26, tempMax: 30, phMin: 7.0, phMax: 8.0, doMin: 5.0
  });

  const getStatus = (value: number | null, min: number, max: number) => {
    if (value === null) return 'disconnected';
    if (value === 0) return 'warning'; // When missing/0, treat as warning instead of critical for simplicity
    if (value < min * 0.9 || value > max * 1.1) return 'critical';
    if (value < min || value > max) return 'warning';
    return 'normal';
  };

  const getTurbidityText = (val: number | null) => {
    if (val === null) return null;
    if (val === 0) return "0";
    if (val < 100) return "ขุ่นน้อย";
    if (val <= 150) return "ปกติ";
    return "ขุ่นมาก";
  };

  const getEcText = (val: number | null) => {
    if (val === null) return null;
    if (val > 2.0) return "น้ำสกปรก";
    return "ปกติ";
  };

  const getDoText = (val: number | null) => {
    if (val === null) return null;
    if (val < 5.0) return "อากาศในน้ำน้อย";
    return "ปกติ";
  };

  const waterParams = [
    {
      id: "temperature",
      name: "อุณหภูมิน้ำ",
      icon: Thermometer,
      value: sensor.temp,
      unit: "°C",
      status: getStatus(sensor.temp, thresholds.tempMin, thresholds.tempMax),
      range: `${thresholds.tempMin}-${thresholds.tempMax}°C`,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
      tooltip: "อุณหภูมิที่เหมาะสมสำหรับปลา Biofloc คือ 26-30°C อุณหภูมิสูงกว่า 32°C จะลดการละลายออกซิเจนและเร่งการเจริญของแบคทีเรียที่เป็นอันตราย",
      lastUpdated: (isConnected && sensor.temp !== null) ? "เรียลไทม์" : "ออฟไลน์"
    },
    {
      id: "ph",
      name: "ค่า pH",
      icon: Droplet,
      value: sensor.ph,
      unit: "",
      status: getStatus(sensor.ph, thresholds.phMin, thresholds.phMax),
      range: `${thresholds.phMin}-${thresholds.phMax}`,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
      tooltip: "ค่า pH ที่เหมาะสมสำหรับระบบ Biofloc คือ 7.0-8.0 pH ต่ำกว่า 6.5 เป็นอันตรายต่อสัตว์น้ำ",
      lastUpdated: (isConnected && sensor.ph !== null) ? "เรียลไทม์" : "ออฟไลน์"
    },
    {
      id: "do",
      name: "ออกซิเจนในน้ำ (DO)",
      icon: Wind,
      value: getDoText(sensor.do),
      unit: "",
      status: getStatus(sensor.do, thresholds.doMin, 10),
      range: "> 5 mg/L",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50",
      tooltip: "Dissolved Oxygen (DO) คือปริมาณออกซิเจนที่ละลายในน้ำ ค่าต่ำกว่า 5 mg/L จะส่งผลต่อการเจริญเติบโตของปลา ต่ำกว่า 3 mg/L อาจทำให้ปลาตาย",
      lastUpdated: (isConnected && sensor.do !== null) ? "เรียลไทม์" : "ออฟไลน์"
    },
    {
      id: "turbidity",
      name: "ความขุ่นของน้ำ",
      icon: Gauge,
      value: getTurbidityText(sensor.turbidity),
      unit: "",
      status: getStatus(sensor.turbidity, 100, 150),
      range: "100-150 NTU",
      color: "text-teal-500",
      bgColor: "bg-teal-50",
      tooltip: "ความขุ่น (Turbidity) ในระบบ Biofloc บ่งบอกความหนาแน่นของฟล็อก ค่า 100-150 NTU เป็นระดับที่เหมาะสม หากขุ่นมากเกินไปควรเปลี่ยนถ่ายน้ำบางส่วน",
      lastUpdated: (isConnected && sensor.turbidity !== null) ? "เรียลไทม์" : "ออฟไลน์"
    },
    {
      id: "ec",
      name: "ค่าความนำไฟฟ้า (EC)",
      icon: Gauge,
      value: getEcText(sensor.ec),
      unit: "",
      status: getStatus(sensor.ec, 1.0, 2.0),
      range: "1.0-2.0 mS/cm",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
      tooltip: "Electrical Conductivity (EC) วัดปริมาณแร่ธาตุและเกลือในน้ำ ค่าสูงเกินไปบ่งบอกว่ามีของเสียสะสม ค่าต่ำเกินไปแร่ธาตุไม่เพียงพอ",
      lastUpdated: (isConnected && sensor.ec !== null) ? "เรียลไทม์" : "ออฟไลน์"
    },
    {
      id: "waterLevel",
      name: "ความสูงของน้ำ",
      icon: Waves,
      value: sensor.level,
      unit: "ซม.",
      status: getStatus(sensor.level, 80, 100),
      range: "80-100 ซม.",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
      tooltip: "ระดับความสูงของน้ำในบ่อ ควรอยู่ระหว่าง 80-100 ซม. น้ำลึกเพียงพอช่วยให้ระบบ Biofloc ทำงานได้เต็มประสิทธิภาพ",
      lastUpdated: (isConnected && sensor.level !== null) ? "เรียลไทม์" : "ออฟไลน์"
    }
  ];

  const getStatusBadge = (status: string) => {
    if (status === "normal") return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">ปกติ</Badge>;
    if (status === "warning") return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">เตือน</Badge>;
    if (status === "disconnected") return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">ไม่มีข้อมูล</Badge>;
    return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">อันตราย</Badge>;
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">คุณภาพน้ำแบบละเอียด</h2>
          <p className="text-slate-500 mt-1">ตรวจสอบและควบคุมพารามิเตอร์คุณภาพน้ำ</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              ตั้งค่าเกณฑ์
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ตั้งค่าเกณฑ์การแจ้งเตือน</DialogTitle>
              <DialogDescription>กำหนดค่าขั้นต่ำและสูงสุดสำหรับการแจ้งเตือน</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>อุณหภูมิต่ำสุด (°C)</Label>
                  <Input type="number" value={thresholds.tempMin} onChange={(e) => setThresholds({ ...thresholds, tempMin: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>อุณหภูมิสูงสุด (°C)</Label>
                  <Input type="number" value={thresholds.tempMax} onChange={(e) => setThresholds({ ...thresholds, tempMax: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>pH ต่ำสุด</Label>
                  <Input type="number" step="0.1" value={thresholds.phMin} onChange={(e) => setThresholds({ ...thresholds, phMin: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>pH สูงสุด</Label>
                  <Input type="number" step="0.1" value={thresholds.phMax} onChange={(e) => setThresholds({ ...thresholds, phMax: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>DO ต่ำสุด (mg/L)</Label>
                <Input type="number" step="0.1" value={thresholds.doMin} onChange={(e) => setThresholds({ ...thresholds, doMin: Number(e.target.value) })} />
              </div>
              <Button className="w-full">บันทึกการตั้งค่า</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Water Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {waterParams.map((param) => {
          const Icon = param.icon;
          return (
            <Card key={param.id} className={`p-6 hover:shadow-md transition-all border-2 ${
              (param.status === 'warning' || param.status === 'critical') 
                ? 'bg-red-50 border-red-300' 
                : 'bg-white border-transparent'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${param.bgColor}`}>
                    <Icon className={`w-5 h-5 ${param.color}`} />
                  </div>
                  <h3 className="font-semibold text-slate-700">{param.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusBadge(param.status)}
                  <Tooltip content={param.tooltip}>
                    <Info className="w-4 h-4 text-slate-400 cursor-help ml-1" />
                  </Tooltip>
                </div>
              </div>
              <div className="mb-3">
                {param.value === null ? (
                  <span className="text-[17px] font-semibold text-red-500 leading-tight">เซนเซอร์ขาดการเชื่อมต่อ</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-slate-900">{param.value}</span>
                    <span className="text-lg text-slate-500 ml-1">{param.unit}</span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-3">
                <span className="text-slate-500">ช่วงเหมาะสม: <span className="font-medium text-slate-700">{param.range}</span></span>
                <span className="text-xs text-slate-400">{param.lastUpdated}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
