import { useState } from "react";
import {
  Thermometer,
  Droplet,
  Wind,
  Wifi,
  WifiOff,
  Power,
  TrendingDown,
  Fish,
  Gauge,
  Waves,
  Zap,
  Database,
  Settings,
  Info,
  FlaskConical,
  Leaf,
  AlertTriangle,
  Bluetooth
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Pond, Reservoir, Feeder } from "../App";

interface OverviewProps {
  pond: Pond;
  reservoir: Reservoir;
  feeders: Feeder[];
}

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

export default function Overview({ pond, reservoir, feeders }: OverviewProps) {
  const { data: sensorData, isConnected } = useSensorData();

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

  const waterQuality = {
    temperature: sensorData.temp ?? null,
    dissolvedOxygen: sensorData.do ?? null,
    turbidity: sensorData.turbidity ?? null,
    ec: sensorData.ec ?? null,
    waterLevel: sensorData.level ?? null,
    ph: sensorData.ph ?? null
  };

  const systemStatus = { power: true, iotConnection: isConnected };

  const getSensorStatus = (value: number | null, min: number, max: number) => {
    if (value === null) return 'disconnected';
    if (value < min || value > max) return 'warning';
    return 'normal';
  };

  const alerts: { type: string, message: string }[] = [];
  if (sensorData.ph !== null && (sensorData.ph < 6.5 || sensorData.ph > 8.5)) {
    alerts.push({ type: "warning", message: `ค่า pH ผิดปกติ (${sensorData.ph.toFixed(2)})` });
  }
  if (sensorData.temp !== null && (sensorData.temp < 20 || sensorData.temp > 35)) {
    alerts.push({ type: "warning", message: `อุณหภูมิน้ำผิดปกติ (${sensorData.temp.toFixed(1)} °C)` });
  }
  if (sensorData.do !== null && sensorData.do < 5) {
    alerts.push({ type: "warning", message: `ออกซิเจนในน้ำต่ำเกินไป (${sensorData.do.toFixed(1)} mg/L)` });
  }
  if (sensorData.ec !== null && (sensorData.ec < 1.0 || sensorData.ec > 2.0)) {
    alerts.push({ type: "warning", message: `ค่าความนำไฟฟ้า (EC) ผิดปกติ (${sensorData.ec.toFixed(2)} mS/cm)` });
  }
  if (sensorData.turbidity !== null && (sensorData.turbidity < 100 || sensorData.turbidity > 150)) {
    alerts.push({ type: "warning", message: `ความขุ่นผิดปกติ (${sensorData.turbidity} NTU)` });
  }
  if (sensorData.level !== null && (sensorData.level < 80 || sensorData.level > 100)) {
    alerts.push({ type: "warning", message: `ระดับน้ำผิดปกติ (${sensorData.level} ซม.)` });
  }
  if (sensorData.humidity !== null && sensorData.humidity > 70) {
    alerts.push({ type: "warning", message: `ความชื้นสูงเกินไป (${sensorData.humidity} %)` });
  }

  const waterParams = [
    {
      label: "อุณหภูมิน้ำ",
      value: waterQuality.temperature,
      unit: "°C",
      icon: Thermometer,
      color: "text-orange-500",
      bg: "bg-orange-50",
      status: getSensorStatus(waterQuality.temperature, 26, 30),
      tooltip: "อุณหภูมิที่เหมาะสมสำหรับปลา Biofloc อยู่ระหว่าง 26-30°C อุณหภูมิสูงเกินไปจะลดออกซิเจนในน้ำ",
      range: "26-30°C"
    },
    {
      label: "ออกซิเจนในน้ำ (DO)",
      value: getDoText(waterQuality.dissolvedOxygen),
      unit: "",
      icon: Wind,
      color: "text-cyan-500",
      bg: "bg-cyan-50",
      status: getSensorStatus(waterQuality.dissolvedOxygen, 5, 10),
      tooltip: "ระดับออกซิเจนละลายน้ำ (Dissolved Oxygen) ควรมากกว่า 5 mg/L หากต่ำกว่า 4 mg/L ปลาจะขาดอากาศ",
      range: "> 5 mg/L"
    },
    {
      label: "ความขุ่น",
      value: getTurbidityText(waterQuality.turbidity),
      unit: "",
      icon: Droplet,
      color: "text-teal-500",
      bg: "bg-teal-50",
      status: getSensorStatus(waterQuality.turbidity, 100, 150),
      tooltip: "ความขุ่นในระบบ Biofloc คือตัวบ่งบอกความหนาแน่นของจุลินทรีย์ ค่า 100-150 NTU เหมาะสมที่สุด",
      range: "100-150 NTU"
    },
    {
      label: "ค่าความนำไฟฟ้า (EC)",
      value: getEcText(waterQuality.ec),
      unit: "",
      icon: Gauge,
      color: "text-purple-500",
      bg: "bg-purple-50",
      status: getSensorStatus(waterQuality.ec, 1.0, 2.0),
      tooltip: "Electrical Conductivity บอกถึงปริมาณแร่ธาตุในน้ำ ค่าที่เหมาะสมคือ 1.0-2.0 mS/cm",
      range: "1.0-2.0 mS/cm"
    },
    {
      label: "ระดับน้ำ",
      value: waterQuality.waterLevel,
      unit: "ซม.",
      icon: Waves,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
      status: getSensorStatus(waterQuality.waterLevel, 80, 100),
      tooltip: "ความลึกของน้ำในบ่อ ควรอยู่ระหว่าง 80-100 ซม. เพื่อให้จุลินทรีย์และปลาเติบโตได้ดี",
      range: "80-100 ซม."
    },
    {
      label: "ค่า pH",
      value: waterQuality.ph,
      unit: "",
      icon: FlaskConical,
      color: "text-green-500",
      bg: "bg-green-50",
      status: getSensorStatus(waterQuality.ph, 6.5, 8.5),
      tooltip: "ค่า pH ที่เหมาะสมสำหรับปลาควรอยู่ระหว่าง 6.5 - 8.5",
      range: "6.5-8.5"
    }
  ];

  return (
    <div className="p-4 md:p-6">
      {/* Header with settings top-right */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ภาพรวมระบบ</h2>
          <p className="text-slate-500 mt-1">สรุปข้อมูลบ่อเลี้ยงปลา Biofloc</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs sm:text-sm text-slate-500">
            อัพเดทล่าสุด: {new Date().toLocaleTimeString('th-TH')}
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {alerts.length > 0 && (
        <Card className="mb-4 md:mb-6 p-4 md:p-5 border-red-300 bg-red-50 shadow-sm w-full">
          <div className="flex items-center gap-3 mb-3 border-b border-red-200 pb-3">
            <AlertTriangle className="w-6 h-6 text-red-600 animate-pulse" />
            <h3 className="text-lg font-bold text-red-700">การแจ้งเตือนระบบ</h3>
          </div>
          <div className="flex flex-col gap-2">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-red-500 mt-0.5">•</span>
                <span className="text-red-700 font-medium">
                  {alert.message}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Status Bar */}
      <Card className="p-4 mb-4 md:mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6">
          <div className="flex flex-1 items-center justify-center gap-2">
            {systemStatus.iotConnection ? (
              <><Wifi className="w-5 h-5 text-green-600" /><span className="text-green-700 font-medium text-xs sm:text-sm">Online</span></>
            ) : (
              <><WifiOff className="w-5 h-5 text-red-600" /><span className="text-red-700 font-medium text-xs sm:text-sm">Offline</span></>
            )}
          </div>
          <div className="hidden sm:block h-5 w-px bg-slate-300" />
          <div className="flex flex-1 items-center justify-center gap-2 border-l border-slate-300 sm:border-none pl-3 sm:pl-0">
            <Power className={`w-5 h-5 ${systemStatus.power ? "text-green-600" : "text-red-600"}`} />
            <span className="text-slate-700 text-xs sm:text-sm">ไฟ: {systemStatus.power ? "ปกติ" : "ขัดข้อง"}</span>
          </div>
        </div>
      </Card>

      {/* Pond Info Card */}
      <Card className="p-5 bg-gradient-to-br from-blue-600 to-cyan-600 text-white mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Fish className="w-5 h-5" />
          <h3 className="font-semibold">{pond.name}</h3>
        </div>
        <div className="space-y-3 md:space-y-0 md:flex md:gap-8">
          <div className="flex justify-between items-center md:flex-col md:items-start">
            <span className="text-blue-100 text-sm">อายุการเลี้ยง</span>
            <span className="text-2xl font-bold">{pond.ageInDays} <span className="text-base font-normal">วัน</span></span>
          </div>
          <div className="flex justify-between items-center md:flex-col md:items-start">
            <span className="text-blue-100 text-sm">ขนาดบ่อ</span>
            <span className="text-xl font-bold">{pond.size.toLocaleString()} <span className="text-sm font-normal">ลิตร</span></span>
          </div>
        </div>
      </Card>

      {/* Water Quality Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        {waterParams.map((param) => {
          const bgMap: Record<string, string> = {
            "text-orange-500": "bg-orange-500",
            "text-cyan-500": "bg-cyan-500",
            "text-teal-500": "bg-teal-500",
            "text-purple-500": "bg-purple-500",
            "text-indigo-500": "bg-indigo-500",
            "text-blue-500": "bg-blue-500",
            "text-green-500": "bg-green-500",
          };
          const dotColorClass = bgMap[param.color] || "bg-slate-500";
          const isWarning = param.status === "warning" || param.status === "critical";
          const cardClass = isWarning 
            ? "bg-red-50 border-red-300 hover:border-red-400" 
            : "bg-white border-transparent hover:border-slate-300";

          return (
            <Card key={param.label} className={`p-4 flex flex-col justify-between transition-all border-2 ${cardClass}`}>
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className={`w-3 h-3 rounded-full ${dotColorClass}`} />
                  <div className="flex items-center gap-1.5">
                    {param.status === "disconnected" ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-slate-50 text-slate-500 border-slate-200">ไม่มีข้อมูล</Badge>
                    ) : param.status !== "normal" && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-red-50 text-red-700 border-red-200">อันตราย</Badge>
                    )}
                    <Tooltip content={param.tooltip}>
                      <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    </Tooltip>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mb-1 line-clamp-1">{param.label}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  {param.value === null ? (
                    <span className="text-[13px] font-semibold text-red-500 leading-tight">เซนเซอร์ขาดการเชื่อมต่อ</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-slate-900 leading-none">{param.value}</span>
                      <span className="text-[11px] font-normal text-slate-500 leading-none">{param.unit}</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 truncate pt-3 border-t border-slate-100">
                ค่าปกติ: {param.range}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Bottom section: Reservoir + Molasses + Microbe + Feeders */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Reservoir */}
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            {reservoir.name}
            <Tooltip content="บ่อพักน้ำสำหรับเตรียมน้ำก่อนเติมเข้าบ่อเลี้ยง ควรปรับค่า pH ให้เหมาะสมก่อนใช้งาน">
              <Info className="w-4 h-4 text-slate-400 cursor-help" />
            </Tooltip>
          </h3>
          <div className="p-4 bg-blue-50 rounded-lg text-center">
            <p className="text-sm text-slate-600 mb-1">ความจุทั้งหมด</p>
            <p className="text-3xl font-bold text-slate-900">{reservoir.capacity.toLocaleString()}</p>
            <p className="text-slate-500 text-sm">ลิตร</p>
          </div>
          <div className="mt-3 p-3 bg-slate-50 rounded-lg flex justify-between items-center">
            <span className="text-sm text-slate-600 flex items-center gap-1">
              <Droplet className="w-4 h-4 text-blue-400" /> pH น้ำ
            </span>
            <span className="font-semibold text-slate-900">7.2</span>
          </div>
        </Card>

        {/* Molasses Card */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-amber-500" />
              กากน้ำตาล
              <Tooltip content="กากน้ำตาล (Molasses) เป็นแหล่งคาร์บอนสำหรับจุลินทรีย์ในระบบ Biofloc ช่วยรักษาสมดุล C:N ratio ในน้ำ">
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
              </Tooltip>
            </h3>
            <div className="mb-3">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-slate-600">ปริมาณคงเหลือ</span>
                <span className="text-sm font-medium text-amber-700">65%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all" style={{ width: "65%" }} />
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg flex justify-between items-center">
              <span className="text-sm text-slate-600">คงเหลือ</span>
              <span className="text-xl font-bold text-slate-900">32.5 <span className="text-sm font-normal text-slate-500">ลิตร</span></span>
            </div>
            <p className="text-xs text-slate-400 mt-2">ความจุทั้งหมด 50 ลิตร</p>
          </div>
          <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
            <span className="text-slate-600">เครื่องเติมสาร</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${sensorData.molassesDispenser === 1 ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{sensorData.molassesDispenser === 1 ? 'กำลังจ่ายสาร' : 'ปิดอยู่'}</span>
            </div>
          </div>
        </Card>

        {/* Microbe Card */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-500" />
              รำละเอียด / จุลินทรีย์
              <Tooltip content="รำละเอียดและจุลินทรีย์ใช้เสริมระบบ Biofloc เพื่อเพิ่มประสิทธิภาพการย่อยสลายของเสียและเพิ่มโปรตีนในน้ำ">
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
              </Tooltip>
            </h3>
            <div className="mb-3">
              <div className="flex justify-between items-end mb-1">
                <span className="text-sm text-slate-600">รำละเอียดคงเหลือ</span>
                <span className="text-sm font-medium text-green-700">42%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" style={{ width: "42%" }} />
              </div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg flex justify-between items-center">
              <span className="text-sm text-slate-600">คงเหลือ</span>
              <span className="text-xl font-bold text-slate-900">21 <span className="text-sm font-normal text-slate-500">กก.</span></span>
            </div>
            <p className="text-xs text-slate-400 mt-2">ความจุทั้งหมด 50 กก.</p>
          </div>
          <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center text-xs">
            <span className="text-slate-600">เครื่องเติมสาร</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className={`w-2.5 h-2.5 rounded-full ${sensorData.microbeDispenser === 1 ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>{sensorData.microbeDispenser === 1 ? 'กำลังจ่ายสาร' : 'ปิดอยู่'}</span>
            </div>
          </div>
        </Card>

        {/* Feeders Card */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Fish className="w-5 h-5 text-blue-500" />
              เครื่องให้อาหาร
              <Tooltip content="รายการเครื่องให้อาหารปลาในบ่อเลี้ยง แสดงสถานะเปิด/ปิดและปริมาณอาหารคงเหลือเฉลี่ย">
                <Info className="w-4 h-4 text-slate-400 cursor-help" />
              </Tooltip>
            </h3>

            {feeders.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                ยังไม่มีเครื่องให้อาหาร
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[140px] overflow-y-auto pr-1">
                {feeders.map(feeder => {
                  const percentage = (feeder.remainingFeed / feeder.capacity) * 100;
                  return (
                    <div key={feeder.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${feeder.status ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="font-medium text-slate-700 truncate">{feeder.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0 ml-2">
                        เหลือ {percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {(feeders.length > 0) && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
              <span>รวม {feeders.length} เครื่อง</span>
              <span>ทำงานอยู่ {feeders.filter(f => f.status).length} เครื่อง</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
