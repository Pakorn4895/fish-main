import { useState } from "react";
import { 
  Settings,
  Save,
  Fish,
  Droplet
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { PondData, WaterData } from "../App";
import { toast } from "sonner";

interface MobileSettingsProps {
  pondData: PondData;
  setPondData: (data: PondData) => void;
  waterData: WaterData;
  setWaterData: (data: WaterData) => void;
}

export default function MobileSettings({ 
  pondData, 
  setPondData,
  waterData,
  setWaterData 
}: MobileSettingsProps) {
  const [localPondData, setLocalPondData] = useState(pondData);
  const [localWaterData, setLocalWaterData] = useState(waterData);

  const handleSavePondData = () => {
    setPondData(localPondData);
    toast.success("บันทึกข้อมูลบ่อสำเร็จ");
  };

  const handleSaveWaterData = () => {
    // อัปเดตสถานะความขุ่นอัตโนมัติ
    let turbidityStatus: "ปกติ" | "ขุ่นเกินไป" | "ใสเกินไป" = "ปกติ";
    if (localWaterData.turbidity > 150) {
      turbidityStatus = "ขุ่นเกินไป";
    } else if (localWaterData.turbidity < 80) {
      turbidityStatus = "ใสเกินไป";
    }

    setWaterData({
      ...localWaterData,
      turbidityStatus
    });
    toast.success("บันทึกข้อมูลคุณภาพน้ำสำเร็จ");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-6 pb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">ตั้งค่า</h1>
            <p className="text-slate-200 text-sm">ปรับแต่งข้อมูลบ่อและคุณภาพน้ำ</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 pb-6 space-y-4">
        {/* ข้อมูลบ่อ */}
        <Card className="p-5 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Fish className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">ข้อมูลบ่อและปลา</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="pondName">ชื่อบ่อ</Label>
              <Input
                id="pondName"
                value={localPondData.pondName}
                onChange={(e) => setLocalPondData({ ...localPondData, pondName: e.target.value })}
                placeholder="บ่อที่ 1"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pondSize">ขนาดบ่อ (ลิตร)</Label>
              <Input
                id="pondSize"
                type="number"
                value={localPondData.pondSize}
                onChange={(e) => setLocalPondData({ ...localPondData, pondSize: Number(e.target.value) })}
                placeholder="1000"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="fishCount">จำนวนปลา (ตัว)</Label>
              <Input
                id="fishCount"
                type="number"
                value={localPondData.fishCount}
                onChange={(e) => setLocalPondData({ ...localPondData, fishCount: Number(e.target.value) })}
                placeholder="500"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="averageWeight">น้ำหนักเฉลี่ย (กรัม)</Label>
              <Input
                id="averageWeight"
                type="number"
                value={localPondData.averageWeight}
                onChange={(e) => setLocalPondData({ ...localPondData, averageWeight: Number(e.target.value) })}
                placeholder="120"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="survivalRate">อัตราการรอด (%)</Label>
              <Input
                id="survivalRate"
                type="number"
                value={localPondData.survivalRate}
                onChange={(e) => setLocalPondData({ ...localPondData, survivalRate: Number(e.target.value) })}
                placeholder="95.5"
                step="0.1"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="ageInDays">อายุการเลี้ยง (วัน)</Label>
              <Input
                id="ageInDays"
                type="number"
                value={localPondData.ageInDays}
                onChange={(e) => setLocalPondData({ ...localPondData, ageInDays: Number(e.target.value) })}
                placeholder="45"
                className="mt-1"
              />
            </div>

            <Button 
              onClick={handleSavePondData}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              บันทึกข้อมูลบ่อ
            </Button>
          </div>
        </Card>

        {/* ข้อมูลคุณภาพน้ำ */}
        <Card className="p-5 bg-white shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Droplet className="w-5 h-5 text-cyan-600" />
            <h3 className="font-semibold text-slate-900">ข้อมูลคุณภาพน้ำ</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="temperature">อุณหภูมิน้ำ (°C)</Label>
              <Input
                id="temperature"
                type="number"
                value={localWaterData.temperature}
                onChange={(e) => setLocalWaterData({ ...localWaterData, temperature: Number(e.target.value) })}
                placeholder="28.5"
                step="0.1"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">ควรอยู่ระหว่าง 26-30°C</p>
            </div>

            <div>
              <Label htmlFor="ph">ค่า pH</Label>
              <Input
                id="ph"
                type="number"
                value={localWaterData.ph}
                onChange={(e) => setLocalWaterData({ ...localWaterData, ph: Number(e.target.value) })}
                placeholder="7.2"
                step="0.1"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">ควรอยู่ระหว่าง 7.0-8.0</p>
            </div>

            <div>
              <Label htmlFor="dissolvedOxygen">ออกซิเจนละลายน้ำ (mg/L)</Label>
              <Input
                id="dissolvedOxygen"
                type="number"
                value={localWaterData.dissolvedOxygen}
                onChange={(e) => setLocalWaterData({ ...localWaterData, dissolvedOxygen: Number(e.target.value) })}
                placeholder="5.8"
                step="0.1"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">ควรมากกว่า 5 mg/L</p>
            </div>

            <div>
              <Label htmlFor="turbidity">ความขุ่น (NTU)</Label>
              <Input
                id="turbidity"
                type="number"
                value={localWaterData.turbidity}
                onChange={(e) => setLocalWaterData({ ...localWaterData, turbidity: Number(e.target.value) })}
                placeholder="120"
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">ปกติ: 80-150 NTU สำหรับระบบ Biofloc</p>
            </div>

            <Button 
              onClick={handleSaveWaterData}
              className="w-full bg-cyan-600 hover:bg-cyan-700"
            >
              <Save className="w-4 h-4 mr-2" />
              บันทึกข้อมูลคุณภาพน้ำ
            </Button>
          </div>
        </Card>

        {/* คำแนะนำ */}
        <Card className="p-5 bg-blue-50 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">💡 คำแนะนำ</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• อัปเดตข้อมูลเป็นประจำเพื่อความแม่นยำ</li>
            <li>• ตรวจวัดคุณภาพน้ำทุกวัน</li>
            <li>• บันทึกข้อมูลทุกครั้งที่มีการเปลี่ยนแปลง</li>
            <li>• ติดตามแนวโน้มเพื่อป้องกันปัญหา</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
