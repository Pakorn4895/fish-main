import { useState } from "react";
import {
  Power,
  Zap,
  FlaskConical,
  Leaf,
  Wind,
  Droplets,
  Fish,
  Bluetooth,
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { toast } from "sonner";

type ChemicalType = "molasses" | "microbe";

import { useSensorData } from "../hooks/useSensorData";
import { Feeder } from "../App";

export default function DeviceControl({
  feeders,
  setFeeders,
}: {
  feeders: Feeder[],
  setFeeders: React.Dispatch<React.SetStateAction<Feeder[]>>,
}) {
  const { data: sensor, isConnected, isMockMode, sendCommand, nodeStatus } = useSensorData();
  const [autoMode, setAutoMode] = useState(false);

  // Mirror device states from live sensor data
  const devices = {
    airPump: sensor.airPump === 1,
    waterPump: sensor.waterPump === 1,
    molassesDispenser: sensor.molassesDispenser === 1,
    microbeDispenser: sensor.microbeDispenser === 1,
  };

  const [manualDose, setManualDose] = useState<Record<ChemicalType, string>>({
    molasses: "",
    microbe: "",
  });

  const toggleDevice = (device: keyof typeof devices) => {
    if (autoMode) return;
    const newState = !devices[device];
    sendCommand(device, newState);
    const label = deviceList.find(d => d.key === device)?.label || device;
    toast.success(`${label} ${newState ? "เปิด" : "ปิด"}แล้ว`);
  };

  const manualDoseConfig = {
    molasses: {
      label: "กากน้ำตาล",
      unit: "ลิตร",
      max: 2,
      step: "0.1",
      placeholder: "0.5",
      icon: FlaskConical,
      color: "amber",
    },
    microbe: {
      label: "จุลินทรีย์",
      unit: "มล.",
      max: 500,
      step: "10",
      placeholder: "100",
      icon: Leaf,
      color: "green",
    },
  } as const;

  const handleManualDose = (chemical: ChemicalType) => {
    if (autoMode) {
      toast.error("กรุณาปิดโหมดอัตโนมัติก่อนเติมสารเอง");
      return;
    }

    const config = manualDoseConfig[chemical];
    const amount = Number(manualDose[chemical]);

    if (Number.isNaN(amount) || amount <= 0) {
      toast.error(`กรุณาใส่ปริมาณ${config.label}ที่ถูกต้อง`);
      return;
    }

    if (amount > config.max) {
      toast.error(`เติม${config.label}เองได้สูงสุด ${config.max} ${config.unit} ต่อครั้ง`);
      return;
    }

    sendCommand("manualDose", true, {
      chemical,
      amount,
      unit: config.unit,
      mode: "manualOverride",
    });

    setManualDose({ ...manualDose, [chemical]: "" });
    toast.success(`ส่งคำสั่งเติม${config.label} ${amount} ${config.unit} แล้ว`);
  };

  const toggleFeeder = (id: string, currentState: boolean) => {
    if (autoMode) return;
    const newState = !currentState;
    setFeeders(prevFeeders => prevFeeders.map(f => {
      if (f.id === id) {
        sendCommand(`feeder_${f.id}`, newState);
        toast.success(`เครื่อง ${f.name} ${newState ? "เปิด" : "ปิด"}การทำงานแล้ว`);
        return { ...f, status: newState };
      }
      return f;
    }));
  };

  const deviceList = [
    { key: "airPump" as const, label: "ปั๊มลม", icon: Wind, description: "เพิ่มออกซิเจนในน้ำ", destructive: false },
    { key: "waterPump" as const, label: "ปั๊มน้ำ", icon: Droplets, description: "หมุนเวียนน้ำในบ่อ", destructive: false },
    { key: "molassesDispenser" as const, label: "เครื่องเติมกากน้ำตาล", icon: FlaskConical, description: "เครื่องเติมกากน้ำตาลเข้าระบบ", destructive: false },
    { key: "microbeDispenser" as const, label: "เครื่องเติมจุลินทรีย์", icon: Leaf, description: "เครื่องเติมจุลินทรีย์เข้าระบบ", destructive: false },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">ควบคุมอุปกรณ์</h2>
          <p className="text-slate-500 mt-1">จัดการอุปกรณ์และตั้งเวลาเติมสารเสริม</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2">
          <Zap className={`w-5 h-5 ${autoMode ? "text-amber-500" : "text-slate-400"}`} />
          <span className="font-medium text-slate-700">โหมดอัตโนมัติ</span>
          <Switch checked={autoMode} onCheckedChange={setAutoMode} />
          <Badge variant={autoMode ? "default" : "secondary"}>{autoMode ? "เปิด" : "ปิด"}</Badge>
        </div>
      </div>

      {autoMode && (
        <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-700 font-medium">ระบบกำลังทำงานแบบอัตโนมัติ — การควบคุมด้วยตนเองถูกปิดใช้งาน</span>
          </div>
        </Card>
      )}

      {/* Device Controls */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Power className="w-5 h-5" />
            สถานะอุปกรณ์
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {deviceList.map((device) => {
            const Icon = device.icon;
            const isOn = devices[device.key];
            return (
              <div key={device.key} className={`p-4 rounded-xl border-2 transition-all ${isOn
                ? device.destructive ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                : "bg-slate-50 border-slate-200"
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 rounded-lg ${isOn ? device.destructive ? "bg-red-100" : "bg-blue-100" : "bg-slate-100"}`}>
                    <Icon className={`w-5 h-5 ${isOn ? device.destructive ? "text-red-600" : "text-blue-600" : "text-slate-400"}`} />
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={() => toggleDevice(device.key)}
                    disabled={autoMode}
                  />
                </div>
                <p className="font-semibold text-slate-800">{device.label}</p>
                <p className="text-xs text-slate-500 mt-1">{device.description}</p>
                <Badge
                  variant={isOn ? "default" : "secondary"}
                  className={`mt-2 ${isOn && device.destructive ? "bg-red-600" : ""}`}
                >
                  {isOn ? "ON" : "OFF"}
                </Badge>
              </div>
            );
          })}

          {/* Humidity Sensor inside Device Controls Grid */}
          <div className="p-4 rounded-xl border-2 transition-all bg-indigo-50 border-indigo-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-indigo-100">
                  <Droplets className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <p className="font-semibold text-slate-800">ความชื้น</p>
              <p className="text-xs text-slate-500 mt-1">
                {sensor.humidity !== null ? (
                  <span className={`font-medium ${sensor.humidity > 70 ? 'text-red-600' : 'text-green-600'}`}>
                    {sensor.humidity > 70 ? 'ชื้นมากไป' : 'ชื้นปกติ'} ({sensor.humidity}%)
                  </span>
                ) : (
                  <span className="text-red-500 font-medium">ขาดการเชื่อมต่อ</span>
                )}
              </p>
            </div>
            {sensor.humidity !== null ? (
              <Badge variant="default" className={`mt-2 w-fit ${sensor.humidity > 70 ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
                {sensor.humidity > 70 ? "ผิดปกติ" : "ปกติ"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="mt-2 w-fit bg-red-100 text-red-700 hover:bg-red-100">
                ไม่มีข้อมูล
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Feeder Machines Status */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Fish className="w-5 h-5 text-blue-500" />
          สถานะเครื่องให้อาหาร
        </h3>
        {feeders.length === 0 ? (
          <div className="text-center py-6 text-slate-500 border border-dashed border-slate-200 rounded-lg">
            ยังไม่มีเครื่องให้อาหารในระบบ กรุณาเพิ่มเครื่องให้อาหารที่หน้า "การให้อาหาร"
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {feeders.map((feeder) => {
              const isOn = feeder.status;
              const percentage = (feeder.remainingFeed / feeder.capacity) * 100;
              return (
                <div key={feeder.id} className={`p-4 rounded-xl border-2 transition-all ${isOn ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-200"
                  }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${isOn ? "bg-blue-100" : "bg-slate-100"}`}>
                        <Fish className={`w-5 h-5 ${isOn ? "text-blue-600" : "text-slate-400"}`} />
                      </div>
                      <div className="flex items-center gap-1.5 ml-1">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${nodeStatus[feeder.id] ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs font-medium text-slate-600">
                          {nodeStatus[feeder.id] ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    <Switch
                      checked={isOn}
                      onCheckedChange={() => toggleFeeder(feeder.id, feeder.status)}
                      disabled={autoMode || !nodeStatus[feeder.id]}
                    />
                  </div>
                  <p className="font-semibold text-slate-800">Node {feeder.id}: {feeder.name}</p>
                  <div className="mt-2 mb-1">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                      <span>อาหารคงเหลือ</span>
                      <span>{feeder.remainingFeed.toFixed(1)} / {feeder.capacity.toFixed(1)} kg</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${percentage < 20 ? "bg-red-500" : percentage < 50 ? "bg-amber-500" : "bg-green-500"
                          }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <Badge
                    variant={isOn ? "default" : "secondary"}
                    className="mt-2"
                  >
                    {isOn ? "กำลังทำงาน" : "ปิดอยู่"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Manual Chemical Dosing */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-orange-500" />
              เติมสารเอง
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              ใช้เฉพาะกรณีทดสอบระบบหรือแก้ไขฉุกเฉิน ต้องปิดโหมดอัตโนมัติก่อนสั่งเติม
            </p>
          </div>
          <Badge variant={autoMode ? "secondary" : "default"}>
            {autoMode ? "ล็อกขณะอัตโนมัติ" : "พร้อมเติมเอง"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(manualDoseConfig) as ChemicalType[]).map((chemical) => {
            const config = manualDoseConfig[chemical];
            const Icon = config.icon;
            const colorClass =
              config.color === "amber"
                ? "border-amber-100 bg-amber-50 text-amber-700"
                : "border-green-100 bg-green-50 text-green-700";

            return (
              <div key={chemical} className={`rounded-lg border p-4 ${colorClass}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5" />
                  <div>
                    <p className="font-semibold text-slate-900">{config.label}</p>
                    <p className="text-xs text-slate-500">
                      สูงสุด {config.max} {config.unit} ต่อครั้ง
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    step={config.step}
                    placeholder={config.placeholder}
                    value={manualDose[chemical]}
                    onChange={(e) => setManualDose({ ...manualDose, [chemical]: e.target.value })}
                    disabled={autoMode}
                    className="bg-white"
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={autoMode || !manualDose[chemical]} className="whitespace-nowrap">
                        เติมเอง
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการเติม{config.label}เอง?</AlertDialogTitle>
                        <AlertDialogDescription>
                          ระบบจะสั่งเติม{config.label}จำนวน {manualDose[chemical] || "0"} {config.unit}
                          ทันที การเติมเองควรใช้เมื่อทดสอบระบบหรือแก้ไขเหตุฉุกเฉินเท่านั้น
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleManualDose(chemical)}>
                          ยืนยันเติม
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );
}