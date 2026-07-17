import { useState } from "react";
import { 
  Fish,
  Plus,
  Clock,
  Package,
  AlertCircle,
  RefreshCw,
  Trash2
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
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
import { Switch } from "./ui/switch";
import { Feeder } from "../App";
import { useSensorData } from "../hooks/useSensorData";

export default function Feeding({ feeders, setFeeders }: { feeders: Feeder[], setFeeders: React.Dispatch<React.SetStateAction<Feeder[]>> }) {
  const { sendCommand } = useSensorData();
  const [feedInventory, setFeedInventory] = useState({
    remaining: 42.5,
    total: 50,
  });
  const [refillAmount, setRefillAmount] = useState("");

  const [feedingSchedule, setFeedingSchedule] = useState([
    { id: 1, time: "06:00", amount: 0.8, status: "completed" },
    { id: 2, time: "10:00", amount: 0.7, status: "completed" },
    { id: 3, time: "14:00", amount: 0.8, status: "completed" },
    { id: 4, time: "18:00", amount: 0.7, status: "pending" },
  ]);
  const [newSchedule, setNewSchedule] = useState({ time: "", amount: "" });
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);

  const [newFeeder, setNewFeeder] = useState({ name: "", capacity: "", remainingFeed: "" });
  const [isAddFeederOpen, setIsAddFeederOpen] = useState(false);

  const handleAddSchedule = () => {
    if (!newSchedule.time || !newSchedule.amount) return;
    const amount = parseFloat(newSchedule.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณาใส่ปริมาณที่ถูกต้อง");
      return;
    }
    const entry = {
      id: Date.now(),
      time: newSchedule.time,
      amount,
      status: "pending"
    };
    const updated = [...feedingSchedule, entry].sort((a, b) => a.time.localeCompare(b.time));
    setFeedingSchedule(updated);
    setNewSchedule({ time: "", amount: "" });
    setIsAddScheduleOpen(false);
    toast.success("เพิ่มรอบให้อาหารสำเร็จ");
  };

  const handleDeleteSchedule = (id: number) => {
    setFeedingSchedule(feedingSchedule.filter(s => s.id !== id));
    toast.success("ลบรอบให้อาหารสำเร็จ");
  };

  const handleAddFeeder = () => {
    if (!newFeeder.name || !newFeeder.capacity || !newFeeder.remainingFeed) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    const cap = parseFloat(newFeeder.capacity);
    const rem = parseFloat(newFeeder.remainingFeed);
    if (isNaN(cap) || cap <= 0 || isNaN(rem) || rem < 0 || rem > cap) {
      toast.error("กรุณากรอกปริมาณที่ถูกต้อง (ปริมาณคงเหลือต้องไม่เกินความจุ)");
      return;
    }
    const newF: Feeder = {
      id: Date.now().toString(),
      name: newFeeder.name,
      status: false,
      capacity: cap,
      remainingFeed: rem,
    };
    setFeeders([...feeders, newF]);
    setNewFeeder({ name: "", capacity: "", remainingFeed: "" });
    setIsAddFeederOpen(false);
    toast.success("เพิ่มเครื่องให้อาหารสำเร็จ");
  };

  const handleDeleteFeeder = (id: string) => {
    setFeeders(feeders.filter(f => f.id !== id));
    toast.success("ลบเครื่องให้อาหารสำเร็จ");
  };

  const handleQuickFeed = (id: string) => {
    setFeeders(prevFeeders => prevFeeders.map(f => {
      if (f.id === id) {
        if (f.remainingFeed <= 0) {
          toast.error(`เครื่อง ${f.name} อาหารหมดแล้ว!`);
          return f;
        }
        const dose = 0.5; // default dose in kg
        const updatedFeed = Math.max(0, parseFloat((f.remainingFeed - dose).toFixed(2)));
        
        // Send command to toggle state
        sendCommand(`feeder_${f.id}`, true);
        toast.success(`สั่งให้อาหารด่วนจากเครื่อง ${f.name} สำเร็จ (จ่ายออก ${dose} kg)`);
        
        // Turn dispenser off after 3 seconds in mock
        setTimeout(() => {
          sendCommand(`feeder_${f.id}`, false);
        }, 3000);

        return {
          ...f,
          remainingFeed: updatedFeed,
          lastFed: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น."
        };
      }
      return f;
    }));
  };

  const toggleFeeder = (id: string, currentState: boolean) => {
    const newState = !currentState;
    setFeeders(prevFeeders => prevFeeders.map(f => {
      if (f.id === id) {
        sendCommand(`feeder_${f.id}`, newState);
        toast.success(`เครื่อง ${f.name} ${newState ? "เปิด" : "ปิด"}การทำงาน`);
        return { ...f, status: newState };
      }
      return f;
    }));
  };

  const feedPercentage = (feedInventory.remaining / feedInventory.total) * 100;

  const handleRefill = () => {
    const amount = parseFloat(refillAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณาใส่จำนวนที่ถูกต้อง");
      return;
    }
    if (amount > feedInventory.remaining) {
      toast.error(`ให้ได้สูงสุด ${feedInventory.remaining.toFixed(1)} kg`);
      return;
    }
    setFeedInventory({ ...feedInventory, remaining: feedInventory.remaining - amount });
    setRefillAmount("");
    toast.success(`ให้อาหารสำเร็จ ${amount} kg`);
  };

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">การจัดการอาหาร</h2>
          <p className="text-slate-500 mt-1">จัดการตารางและปริมาณการให้อาหารปลา</p>
        </div>
      </div>

      {/* Feed Inventory Card */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-orange-500" />
          ปริมาณอาหารที่มีอยู่
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-4xl font-bold text-slate-900">{feedInventory.remaining}</span>
              <span className="text-slate-500 mb-1">/ {feedInventory.total} kg</span>
              <span className={`ml-auto text-sm font-medium ${
                feedPercentage < 20 ? "text-red-600" : feedPercentage < 50 ? "text-amber-600" : "text-green-600"
              }`}>{feedPercentage.toFixed(0)}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  feedPercentage < 20 ? "bg-red-500" : feedPercentage < 50 ? "bg-amber-500" : "bg-green-500"
                }`}
                style={{ width: `${feedPercentage}%` }}
              />
            </div>
            {feedPercentage < 20 && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">อาหารเหลือน้อย! กรุณาให้อาหาร</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm">ให้อาหาร (kg)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={refillAmount}
                  onChange={(e) => setRefillAmount(e.target.value)}
                />
                <Button onClick={handleRefill} className="bg-green-600 hover:bg-green-700 whitespace-nowrap">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  ให้
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ให้ได้อีก: {feedInventory.remaining.toFixed(1)} kg
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Feeder Machines Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Fish className="w-5 h-5 text-blue-500" />
            เครื่องให้อาหาร
          </h3>
          <Dialog open={isAddFeederOpen} onOpenChange={setIsAddFeederOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มเครื่อง
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>เพิ่มเครื่องให้อาหาร</DialogTitle>
                <DialogDescription>ตั้งค่าเครื่องให้อาหารตัวใหม่</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>ชื่อเครื่อง</Label>
                  <Input 
                    placeholder="เช่น เครื่องให้อาหาร C" 
                    value={newFeeder.name} 
                    onChange={e => setNewFeeder({ ...newFeeder, name: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>ความจุ (kg)</Label>
                  <Input 
                    type="number" 
                    step="0.5" 
                    placeholder="10" 
                    value={newFeeder.capacity} 
                    onChange={e => setNewFeeder({ ...newFeeder, capacity: e.target.value })} 
                  />
                </div>
                <div>
                  <Label>ปริมาณอาหารปัจจุบัน (kg)</Label>
                  <Input 
                    type="number" 
                    step="0.5" 
                    placeholder="5" 
                    value={newFeeder.remainingFeed} 
                    onChange={e => setNewFeeder({ ...newFeeder, remainingFeed: e.target.value })} 
                  />
                </div>
                <Button className="w-full" onClick={handleAddFeeder}>บันทึก</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {feeders.length === 0 ? (
          <div className="text-center py-6 text-slate-500 border border-dashed border-slate-200 rounded-lg">
            ยังไม่มีเครื่องให้อาหารในระบบ กดปุ่ม "เพิ่มเครื่อง" เพื่อเพิ่มอุปกรณ์
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feeders.map(feeder => {
              const percentage = (feeder.remainingFeed / feeder.capacity) * 100;
              return (
                <div key={feeder.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${feeder.status ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span className="font-semibold text-slate-800">{feeder.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={feeder.status} 
                          onCheckedChange={() => toggleFeeder(feeder.id, feeder.status)} 
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>อาหารคงเหลือ</span>
                        <span>{feeder.remainingFeed.toFixed(1)} / {feeder.capacity.toFixed(1)} kg ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            percentage < 20 ? 'bg-red-500' : percentage < 50 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      ให้ล่าสุด: {feeder.lastFed || '—'}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleQuickFeed(feeder.id)}
                        disabled={feeder.remainingFeed <= 0}
                        className="text-xs"
                      >
                        ให้อาหารด่วน
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-500 p-2">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ลบเครื่องให้อาหาร?</AlertDialogTitle>
                            <AlertDialogDescription>
                              คุณแน่ใจว่าต้องการลบ {feeder.name} หรือไม่?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteFeeder(feeder.id)} className="bg-red-600 hover:bg-red-700">
                              ลบ
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Today's Summary */}
      <Card className="p-6 mb-6">
        <h3 className="font-semibold text-slate-900 mb-4">สรุปวันนี้</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <Fish className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm text-slate-600">อาหารที่ให้ทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {feedingSchedule.filter(s => s.status === "completed").reduce((sum, s) => sum + s.amount, 0).toFixed(1)} kg
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <Clock className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-sm text-slate-600">รอบที่เสร็จสิ้น</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {feedingSchedule.filter(s => s.status === "completed").length}/{feedingSchedule.length} รอบ
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <Plus className="w-5 h-5 text-purple-600 mb-2" />
            <p className="text-sm text-slate-600">รอบถัดไป</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {feedingSchedule.find(s => s.status === "pending")?.time ?? "—"} น.
            </p>
          </div>
        </div>
      </Card>

      {/* Feeding Schedule */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            ตารางให้อาหาร
          </h3>
          <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มรอบ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>เพิ่มรอบให้อาหาร</DialogTitle>
                <DialogDescription>กำหนดเวลาและปริมาณอาหารที่ต้องการให้</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>เวลา</Label>
                  <Input 
                    type="time" 
                    className="mt-1" 
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>ปริมาณ (kg)</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="0.8" 
                    className="mt-1"
                    value={newSchedule.amount}
                    onChange={(e) => setNewSchedule({ ...newSchedule, amount: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={handleAddSchedule}>บันทึก</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {feedingSchedule.map((schedule) => (
            <div
              key={schedule.id}
              className={`p-4 rounded-lg border-2 ${
                schedule.status === "completed"
                  ? "bg-green-50 border-green-200"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-slate-900">{schedule.time}</span>
                <Badge variant={schedule.status === "completed" ? "default" : "secondary"}>
                  {schedule.status === "completed" ? "เสร็จสิ้น" : "รอดำเนินการ"}
                </Badge>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-2xl font-bold text-slate-900">{schedule.amount} kg</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      aria-label={`ลบรอบให้อาหารเวลา ${schedule.time}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ลบรอบให้อาหาร?</AlertDialogTitle>
                      <AlertDialogDescription>
                        ต้องการลบรอบให้อาหารเวลา {schedule.time} จำนวน {schedule.amount} kg จริงๆ หรือไม่?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteSchedule(schedule.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        ลบ
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
