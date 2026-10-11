import { useState, useEffect, useRef } from "react";
import { 
  Fish,
  Plus,
  Clock,
  Package,
  AlertCircle,
  RefreshCw,
  Trash2,
  Bluetooth,
  Edit2,
  Check,
  X,
  Server
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

export default function Feeding({ 
  feeders, 
  setFeeders,
}: { 
  feeders: Feeder[], 
  setFeeders: React.Dispatch<React.SetStateAction<Feeder[]>>,
}) {
  const { sendCommand, nodeStatus, nodeData } = useSensorData();
  const [feedDurations, setFeedDurations] = useState<Record<string, string>>({});


  const [feedingSchedule, setFeedingSchedule] = useState([
    { id: 1, time: "06:00", amount: 0.8, status: "completed" },
    { id: 2, time: "10:00", amount: 0.7, status: "completed" },
    { id: 3, time: "14:00", amount: 0.8, status: "completed" },
    { id: 4, time: "18:00", amount: 0.7, status: "pending" },
  ]);
  const [newSchedule, setNewSchedule] = useState({ time: "", amount: "" });
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);

  const [newFeeder, setNewFeeder] = useState({ 
    id: "", 
    name: "", 
    type: "feeder", 
    capacity: "", 
    capacityMolasses: "",
    capacityLime: ""
  });
  const [isAddFeederOpen, setIsAddFeederOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleScanNodes = () => {
    setIsScanning(true);
    sendCommand('scan', true);
    
    // จำลองระยะเวลาสแกน แล้วหยุดโหลด
    setTimeout(() => {
      setIsScanning(false);
    }, 3000);
  };

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
    if (!newFeeder.id || !newFeeder.name) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (newFeeder.type === "feeder") {
      const cap = parseFloat(newFeeder.capacity);
      if (isNaN(cap) || cap <= 0) {
        toast.error("กรุณากรอกความจุสูงสุดที่ถูกต้อง");
        return;
      }
      const newF: Feeder = {
        id: newFeeder.id,
        name: newFeeder.name,
        type: "feeder",
        status: false,
        capacity: cap,
      };
      setFeeders([...feeders, newF]);
    } else {
      const capM = parseFloat(newFeeder.capacityMolasses);
      const capL = parseFloat(newFeeder.capacityLime);
      if (isNaN(capM) || capM <= 0 || isNaN(capL) || capL <= 0) {
        toast.error("กรุณากรอกความจุสูงสุดที่ถูกต้อง");
        return;
      }
      const newF: Feeder = {
        id: newFeeder.id,
        name: newFeeder.name,
        type: "dispenser",
        status: false,
        capacityMolasses: capM,
        capacityLime: capL,
      };
      setFeeders([...feeders, newF]);
    }
    setNewFeeder({ 
      id: "", name: "", type: "feeder", 
      capacity: "",
      capacityMolasses: "",
      capacityLime: ""
    });
    setIsAddFeederOpen(false);
    toast.success("เพิ่มอุปกรณ์สำเร็จ");
  };

  const handleDeleteFeeder = (id: string) => {
    setFeeders(feeders.filter(f => f.id !== id));
    toast.success("ลบเครื่องให้อาหารสำเร็จ");
  };
  const handleQuickFeed = (id: string) => {
    setFeeders(prevFeeders => prevFeeders.map(f => {
      if (f.id === id) {
        if ((f.remainingFeed || 0) <= 0) {
          toast.error(`เครื่อง ${f.name} อาหารหมดแล้ว!`);
          return f;
        }
        const dose = 0.5; // default dose in kg
        const updatedFeed = Math.max(0, parseFloat(((f.remainingFeed || 0) - dose).toFixed(2)));
        
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

  const handleQuickDispense = (id: string, chemType: 'molasses' | 'lime') => {
    setFeeders(prevFeeders => prevFeeders.map(f => {
      if (f.id === id && f.type === 'dispenser') {
        const dose = 50; // default dose in grams
        if (chemType === 'molasses') {
           if ((f.remainingMolasses || 0) <= 0) {
             toast.error(`เครื่อง ${f.name} กากน้ำตาลหมดแล้ว!`);
             return f;
           }
           const updatedFeed = Math.max(0, (f.remainingMolasses || 0) - dose);
           sendCommand(`dispense_molasses_${f.id}`, true);
           toast.success(`สั่งจ่ายกากน้ำตาลด่วน สำเร็จ (จ่ายออก ${dose} กรัม)`);
           setTimeout(() => sendCommand(`dispense_molasses_${f.id}`, false), 3000);
           return { ...f, remainingMolasses: updatedFeed, lastFed: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น." };
        } else {
           if ((f.remainingLime || 0) <= 0) {
             toast.error(`เครื่อง ${f.name} ปูนขาวหมดแล้ว!`);
             return f;
           }
           const updatedFeed = Math.max(0, (f.remainingLime || 0) - dose);
           sendCommand(`dispense_lime_${f.id}`, true);
           toast.success(`สั่งจ่ายปูนขาวด่วน สำเร็จ (จ่ายออก ${dose} กรัม)`);
           setTimeout(() => sendCommand(`dispense_lime_${f.id}`, false), 3000);
           return { ...f, remainingLime: updatedFeed, lastFed: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + " น." };
        }
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


  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">การจัดการอาหาร</h2>
          <p className="text-slate-500 mt-1">จัดการตารางและปริมาณการให้อาหารปลา</p>
        </div>
      </div>

      {/* Feeder Machines Section */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Fish className="w-5 h-5 text-blue-500" />
            เครื่องให้อาหารและเครื่องใส่สาร
          </h3>
          <Dialog open={isAddFeederOpen} onOpenChange={(open) => {
            setIsAddFeederOpen(open);
            if (open) handleScanNodes();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Bluetooth className="w-4 h-4 mr-2" />
                สแกนหาเครื่อง
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>สแกนหาเครื่องให้อาหาร (ESP-NOW)</DialogTitle>
                <DialogDescription>
                  {isScanning 
                    ? "กำลังส่งสัญญาณค้นหาเครื่องให้อาหารในรัศมี..." 
                    : "ผลการค้นหาเครื่องให้อาหารที่ออนไลน์อยู่"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {isScanning ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-600">กำลังค้นหาอุปกรณ์...</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <Label className="text-sm font-semibold mb-2 block">เครื่องที่พบ (ออนไลน์)</Label>
                      {Object.keys(nodeStatus).filter(id => nodeStatus[id]).length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.keys(nodeStatus).filter(id => nodeStatus[id]).map(id => (
                            <Badge 
                              key={id} 
                              variant={newFeeder.id === id ? "default" : "outline"}
                              className="cursor-pointer hover:bg-blue-100"
                              onClick={() => setNewFeeder({ ...newFeeder, id })}
                            >
                              Node {id}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 mt-1">ไม่พบเครื่องให้อาหารที่ออนไลน์</p>
                      )}
                    </div>
                    
                    <div>
                      <Label>Node ID (เลือกจากด้านบน หรือกรอกเอง)</Label>
                      <Input 
                        placeholder="เช่น 1, 2, 3" 
                        value={newFeeder.id}
                        onChange={(e) => setNewFeeder({ ...newFeeder, id: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>ชื่อเครื่องให้อาหาร</Label>
                      <Input 
                        placeholder="เช่น บ่ออนุบาล, บ่อกลาง" 
                        value={newFeeder.name}
                        onChange={(e) => setNewFeeder({ ...newFeeder, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>ประเภทอุปกรณ์</Label>
                      <select 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1"
                        value={newFeeder.type}
                        onChange={(e) => setNewFeeder({ ...newFeeder, type: e.target.value })}
                      >
                        <option value="feeder">เครื่องให้อาหาร</option>
                        <option value="dispenser">เครื่องใส่สาร</option>
                      </select>
                    </div>
                    {newFeeder.type === "feeder" ? (
                      <>
                        <div>
                          <Label>ความจุสูงสุดถังอาหาร (กรัม)</Label>
                          <Input 
                            type="number" 
                            placeholder="10000" 
                            value={newFeeder.capacity}
                            onChange={(e) => setNewFeeder({ ...newFeeder, capacity: e.target.value })}
                          />
                          <p className="text-xs text-slate-400 mt-1">* ปริมาณคงเหลือจะอ่านจาก Loadcell อัตโนมัติ</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label>ความจุสูงสุดถังกากน้ำตาล (กรัม)</Label>
                          <Input 
                            type="number" 
                            placeholder="5000" 
                            value={newFeeder.capacityMolasses}
                            onChange={(e) => setNewFeeder({ ...newFeeder, capacityMolasses: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>ความจุสูงสุดถังปูนขาว (กรัม)</Label>
                          <Input 
                            type="number" 
                            placeholder="5000" 
                            value={newFeeder.capacityLime}
                            onChange={(e) => setNewFeeder({ ...newFeeder, capacityLime: e.target.value })}
                          />
                        </div>
                        <p className="text-xs text-slate-400">* ปริมาณคงเหลือจะอ่านจาก Loadcell อัตโนมัติ</p>
                      </>
                    )}
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleAddFeeder}>
                      บันทึก
                    </Button>
                  </>
                )}
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
              return (
                <div key={feeder.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${feeder.status ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Fish className="w-4 h-4" />
                        </div>
                        <span className="font-semibold text-slate-800 flex items-center gap-2">
                          {feeder.name}
                          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Node {feeder.id}</span>
                        </span>
                        <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${nodeStatus[feeder.id] ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-xs font-medium text-slate-600">
                            {nodeStatus[feeder.id] ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={feeder.status} 
                          onCheckedChange={() => toggleFeeder(feeder.id, feeder.status)} 
                        />
                      </div>
                    </div>

                    <div className="mb-4 space-y-2">
                      {feeder.type === 'dispenser' ? (
                        <>
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500">กากน้ำตาล</span>
                            <div className="text-right">
                              <span className="text-xl font-bold text-slate-800">
                                {(nodeData?.[feeder.id]?.weight_molasses ?? nodeData?.[feeder.id]?.weight_m ?? '—').toLocaleString !== undefined 
                                  ? Number(nodeData?.[feeder.id]?.weight_molasses ?? nodeData?.[feeder.id]?.weight_m ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
                                  : '—'}
                              </span>
                              <span className="text-sm text-slate-400 ml-1">/ {(feeder.capacityMolasses || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                              <span className="text-sm text-slate-500 ml-1">กรัม</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div 
                              className="bg-amber-500 h-1.5 rounded-full transition-all" 
                              style={{ width: `${Math.min(100, ((nodeData?.[feeder.id]?.weight_molasses ?? nodeData?.[feeder.id]?.weight_m ?? 0) / (feeder.capacityMolasses || 1)) * 100)}%` }}
                            />
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <span className="text-xs text-slate-500">ปูนขาว</span>
                            <div className="text-right">
                              <span className="text-xl font-bold text-slate-800">
                                {(nodeData?.[feeder.id]?.weight_lime ?? nodeData?.[feeder.id]?.weight_l ?? '—').toLocaleString !== undefined 
                                  ? Number(nodeData?.[feeder.id]?.weight_lime ?? nodeData?.[feeder.id]?.weight_l ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
                                  : '—'}
                              </span>
                              <span className="text-sm text-slate-400 ml-1">/ {(feeder.capacityLime || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                              <span className="text-sm text-slate-500 ml-1">กรัม</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div 
                              className="bg-gray-400 h-1.5 rounded-full transition-all" 
                              style={{ width: `${Math.min(100, ((nodeData?.[feeder.id]?.weight_lime ?? nodeData?.[feeder.id]?.weight_l ?? 0) / (feeder.capacityLime || 1)) * 100)}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500">อาหารคงเหลือ</span>
                            <div className="text-right">
                              <span className="text-xl font-bold text-slate-800">
                                {nodeData?.[feeder.id]?.weight !== undefined 
                                  ? Number(nodeData[feeder.id].weight).toLocaleString('en-US', { maximumFractionDigits: 0 })
                                  : '—'}
                              </span>
                              <span className="text-sm text-slate-400 ml-1">/ {((feeder.capacity || 0) * 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                              <span className="text-sm text-slate-500 ml-1">กรัม</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div 
                              className="bg-blue-500 h-1.5 rounded-full transition-all" 
                              style={{ width: `${Math.min(100, ((nodeData?.[feeder.id]?.weight ?? 0) / ((feeder.capacity || 1) * 1000)) * 100)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      ให้ล่าสุด: {feeder.lastFed || '—'}
                    </div>
                    <div className="flex gap-2">
                      {feeder.type === 'dispenser' ? (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickDispense(feeder.id, 'molasses')}
                            disabled={(feeder.remainingMolasses || 0) <= 0}
                            className="text-xs"
                          >
                            ให้กากน้ำตาล
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleQuickDispense(feeder.id, 'lime')}
                            disabled={(feeder.remainingLime || 0) <= 0}
                            className="text-xs"
                          >
                            ให้ปูนขาว
                          </Button>
                        </>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleQuickFeed(feeder.id)}
                          disabled={(feeder.remainingFeed || 0) <= 0}
                          className="text-xs"
                        >
                          ให้อาหารด่วน
                        </Button>
                      )}
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
