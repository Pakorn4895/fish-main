import { useState, useEffect } from "react";
import { Save, Database, AlertCircle, CheckCircle2, Trash2, Droplet, TestTube, Volume2, VolumeX } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { toast } from "sonner";
import { Pond, Reservoir } from "../App";


interface SettingsPageProps {
  ponds: Pond[];
  setPonds: (ponds: Pond[]) => void;
  selectedPondId: string;
  reservoir: Reservoir;
  setReservoir: (reservoir: Reservoir) => void;
  onLogout: () => void;
  sendCommand: (device: string, state: boolean, extra?: Record<string, unknown>) => void;
}

export default function SettingsPage({
  ponds,
  setPonds,
  selectedPondId,
  reservoir,
  setReservoir,
  onLogout,
  sendCommand
}: SettingsPageProps) {
  const selectedPond = ponds.find(p => p.id === selectedPondId);
  const [formData, setFormData] = useState<Pond>(selectedPond || ponds[0]);
  const [reservoirData, setReservoirData] = useState<Reservoir>(reservoir);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasReservoirChanges, setHasReservoirChanges] = useState(false);
  const [mockEnabled, setMockEnabled] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // สถานะเปิด/ปิดเสียงลำโพง (Buzzer)

  useEffect(() => {
    const fetchMockStatus = async () => {
      try {
        const API_URL = import.meta.env.DEV ? 'http://localhost:8000/api/settings/mock' : '/api/settings/mock';
        const res = await fetch(API_URL);
        if (res.ok) {
          const data = await res.json();
          setMockEnabled(data.enabled);
        }
      } catch (err) {
        console.error("Failed to fetch mock status", err);
      }
    };
    fetchMockStatus();
  }, []);

  const toggleMockData = async (checked: boolean) => {
    try {
      const API_URL = import.meta.env.DEV ? 'http://localhost:8000/api/settings/mock' : '/api/settings/mock';
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: checked })
      });
      if (res.ok) {
        setMockEnabled(checked);
        toast.success(checked ? "เปิดใช้งานข้อมูลจำลอง (Mock Data)" : "ปิดใช้งานข้อมูลจำลอง");
      }
    } catch (err) {
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนการตั้งค่า");
    }
  };

  // ฟังก์ชันสลับการแจ้งเตือนเสียงไซเรนบนบอร์ด
  const handleToggleBuzzer = (checked: boolean) => {
    setIsMuted(checked);

    try {
      sendCommand("buzzer", checked);

      toast.success(checked ? "ปิดเสียงแจ้งเตือนบนบอร์ด (Muted)" : "เปิดระบบเสียงแจ้งเตือนปกติ", {
        description: checked
          ? "เสียงเตือนไซเรนเงียบลงชั่วคราวแล้ว แต่ระบบยังแจ้งเตือนผ่านหน้าจอและ LINE ตามปกติ"
          : "ระบบพร้อมส่งเสียงไซเรนบนบอร์ดเมื่อตรวจพบค่าวิกฤต"
      });
    } catch (err) {
      toast.error("ไม่สามารถส่งคำสั่งได้", {
        description: "เกิดข้อผิดพลาดในการส่งคำสั่ง กรุณาลองใหม่อีกครั้ง"
      });
      // คืนค่า Switch กลับไปเป็นแบบเดิมหากส่งข้อมูลไม่สำเร็จ
      setIsMuted(!checked);
    }
  };

  // Update form when selected pond changes
  useEffect(() => {
    const currentPond = ponds.find(p => p.id === selectedPondId);
    if (currentPond) {
      setFormData(currentPond);
      setHasChanges(false);
    }
  }, [selectedPondId, ponds]);

  const handleChange = (field: keyof Pond, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleReservoirChange = (field: keyof Reservoir, value: string | number) => {
    setReservoirData(prev => ({ ...prev, [field]: value }));
    setHasReservoirChanges(true);
  };

  const handleSave = () => {
    setPonds(ponds.map(p => p.id === formData.id ? formData : p));
    setHasChanges(false);
    toast.success("บันทึกข้อมูลเรียบร้อยแล้ว", {
      description: "ข้อมูลบ่อได้รับการอัพเดทแล้ว"
    });
  };

  const handleReservoirSave = () => {
    setReservoir(reservoirData);
    setHasReservoirChanges(false);
    toast.success("บันทึกข้อมูลบ่อพักน้ำเรียบร้อยแล้ว", {
      description: "ข้อมูลบ่อพักน้ำได้รับการอัพเดทแล้ว"
    });
  };

  const handleDelete = () => {
    if (ponds.length <= 1) {
      toast.error("ไม่สามารถลบได้", {
        description: "ต้องมีบ่ออย่างน้อย 1 บ่อ"
      });
      return;
    }

    if (confirm(`ต้องการลบ ${formData.name} ใช่หรือไม่?`)) {
      setPonds(ponds.filter(p => p.id !== formData.id));
      toast.success("ลบบ่อเรียบร้อยแล้ว");
    }
  };

  const handleReset = () => {
    const currentPond = ponds.find(p => p.id === selectedPondId);
    if (currentPond) {
      setFormData(currentPond);
      setHasChanges(false);
    }
  };

  const handleReservoirReset = () => {
    setReservoirData(reservoir);
    setHasReservoirChanges(false);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">ตั้งค่าระบบ</h2>
        <p className="text-slate-500 mt-1">จัดการข้อมูลบ่อและการตั้งค่าระบบ</p>
      </div>

      {/* Unsaved Changes Alert */}
      {(hasChanges || hasReservoirChanges) && (
        <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</p>
              <p className="text-sm text-yellow-700">กดปุ่ม "บันทึกการตั้งค่า" เพื่อบันทึกการเปลี่ยนแปลง</p>
            </div>
          </div>
        </Card>
      )}

      {/* Pond Information Form */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5" />
          ข้อมูลบ่อเลี้ยงปลา
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pond Name */}
          <div>
            <Label htmlFor="pondName">ชื่อบ่อ</Label>
            <Input
              id="pondName"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="เช่น บ่อที่ 1"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">ชื่อเรียกของบ่อเลี้ยงปลา</p>
          </div>

          {/* Pond Size */}
          <div>
            <Label htmlFor="pondSize">ขนาดบ่อ (ลิตร)</Label>
            <Input
              id="pondSize"
              type="number"
              value={formData.size}
              onChange={(e) => handleChange('size', parseFloat(e.target.value) || 0)}
              placeholder="1000"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">ปริมาตรของบ่อเป็นลิตร</p>
          </div>

          {/* Age in Days */}
          <div>
            <Label htmlFor="ageInDays">อายุการเลี้ยง (วัน)</Label>
            <Input
              id="ageInDays"
              type="number"
              value={formData.ageInDays}
              onChange={(e) => handleChange('ageInDays', parseInt(e.target.value) || 0)}
              placeholder="45"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">จำนวนวันที่เลี้ยงปลามาแล้ว</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            บันทึกการตั้งค่า
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            ยกเลิก
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            ลบบ่อ
          </Button>
        </div>
      </Card>

      {/* Reservoir Settings */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Droplet className="w-5 h-5 text-blue-600" />
          ตั้งค่าบ่อพักน้ำ
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reservoir Name */}
          <div>
            <Label htmlFor="reservoirName">ชื่อบ่อพักน้ำ</Label>
            <Input
              id="reservoirName"
              type="text"
              value={reservoirData.name}
              onChange={(e) => handleReservoirChange('name', e.target.value)}
              placeholder="เช่น บ่อพักน้ำหลัก"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">ชื่อเรียกของบ่อพักน้ำ</p>
          </div>

          {/* Reservoir Capacity */}
          <div>
            <Label htmlFor="reservoirCapacity">ความจุบ่อพักน้ำ (ลิตร)</Label>
            <Input
              id="reservoirCapacity"
              type="number"
              value={reservoirData.capacity}
              onChange={(e) => handleReservoirChange('capacity', parseFloat(e.target.value) || 0)}
              placeholder="500"
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">ปริมาตรของบ่อพักน้ำเป็นลิตร</p>
          </div>
        </div>

        {/* Reservoir Action Buttons */}
        <div className="flex gap-3 mt-6 pt-6 border-t">
          <Button
            onClick={handleReservoirSave}
            disabled={!hasReservoirChanges}
            className="flex-1"
          >
            <Save className="w-4 h-4 mr-2" />
            บันทึกการตั้งค่าบ่อพักน้ำ
          </Button>
          <Button
            variant="outline"
            onClick={handleReservoirReset}
            disabled={!hasReservoirChanges}
          >
            ยกเลิก
          </Button>
        </div>
      </Card>

      {/* Hardware control & Sound Settings */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-red-600" />
          ควบคุมอุปกรณ์และระบบเสียงแจ้งเตือน
        </h3>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
          <div>
            <Label className="text-base flex items-center gap-2">
              {isMuted ? <VolumeX className="w-5 h-5 text-red-500" /> : <Volume2 className="w-5 h-5 text-emerald-500" />}
              ปิดเสียงลำโพงชั่วคราว (Mute Alarm)
            </Label>
            <p className="text-sm text-slate-500 mt-1">
              เปิดสวิตช์นี้เพื่อสั่งเก็บเสียงลำโพงไซเรนบนบอร์ดชั่วคราว (ระบบยังบันทึกเหตุการณ์และแจ้งเตือนผ่านหน้าเว็บ/LINE ตามปกติ)
            </p>
          </div>
          <Switch
            checked={isMuted}
            onCheckedChange={handleToggleBuzzer}
          />
        </div>
      </Card>

      {/* Mock Data Settings */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TestTube className="w-5 h-5 text-purple-600" />
          การทดสอบระบบ (Mock Data)
        </h3>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
          <div>
            <Label className="text-base">เปิดใช้งานข้อมูลจำลองเซนเซอร์</Label>
            <p className="text-sm text-slate-500 mt-1">
              ใช้สำหรับการทดสอบการแจ้งเตือนและการแสดงผลเมื่อไม่ได้ต่อเซนเซอร์จริง
            </p>
          </div>
          <Switch
            checked={mockEnabled}
            onCheckedChange={toggleMockData}
          />
        </div>
      </Card>

      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-blue-600" />
          สรุปข้อมูลบ่อปัจจุบัน
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-slate-600">ชื่อบ่อ</p>
            <p className="text-lg font-semibold text-slate-900">{formData.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">ขนาดบ่อ</p>
            <p className="text-lg font-semibold text-slate-900">{formData.size.toLocaleString()} ลิตร</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">อายุการเลี้ยง</p>
            <p className="text-lg font-semibold text-slate-900">{formData.ageInDays} วัน</p>
          </div>
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-6 mt-6 bg-amber-50 border-amber-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">คำแนะนำ</h4>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>• อัพเดทข้อมูลบ่อเป็นประจำทุกสัปดาห์</li>
              <li>• บันทึกอายุการเลี้ยงเพื่อวางแผนการเก็บเกี่ยว</li>
              <li>• ตรวจส่งพารามิเตอร์ระบบให้เหมาะสม</li>
              <li>• ตั้งค่าความจุบ่อพักน้ำให้ถูกต้องเพื่อติดตามระดับน้ำ</li>
              <li>• ตรวจสอบค่า pH ของบ่อพักน้ำก่อนเติมเข้าบ่อเลี้ยง</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Logout */}
      <Card className="p-6 mt-6 border-red-200 bg-red-50 flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-red-900 mb-1">ออกจากระบบ</h4>
          <p className="text-sm text-red-700">ลงชื่อออกจากระบบ Biofloc Dashboard</p>
        </div>
        <Button variant="destructive" onClick={onLogout}>
          ออกจากระบบ
        </Button>
      </Card>
    </div>
  );
}