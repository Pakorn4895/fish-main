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
  X
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
import { Feeder, BluetoothDevice, ConnectedBluetoothDevice } from "../App";
import { useSensorData } from "../hooks/useSensorData";

export default function Feeding({ 
  feeders, 
  setFeeders,
  connectedBluetooth,
  setConnectedBluetooth
}: { 
  feeders: Feeder[], 
  setFeeders: React.Dispatch<React.SetStateAction<Feeder[]>>,
  connectedBluetooth: ConnectedBluetoothDevice[],
  setConnectedBluetooth: React.Dispatch<React.SetStateAction<ConnectedBluetoothDevice[]>>
}) {
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [editingDeviceAddress, setEditingDeviceAddress] = useState<string | null>(null);
  const [editingDeviceName, setEditingDeviceName] = useState("");
  const [feedDurations, setFeedDurations] = useState<Record<string, string>>({});
  const [connectingAddress, setConnectingAddress] = useState<string | null>(null);

  const connectedRef = useRef(connectedBluetooth);
  connectedRef.current = connectedBluetooth;

  useEffect(() => {
    const checkBluetoothStatus = async () => {
      const current = connectedRef.current;
      if (current.length === 0) return;

      try {
        const res = await fetch("/api/bluetooth/status");
        if (!res.ok) return;
        const data = await res.json();
        const statusList: { address: string; connected: boolean }[] = data.devices || [];

        const stillOnline: ConnectedBluetoothDevice[] = [];
        let dropped = false;
        current.forEach(device => {
          const found = statusList.find(s => s.address === device.address);
          const isOnline = found ? found.connected : false;
          if (isOnline) {
            stillOnline.push(device);
          } else {
            toast.error(`อุปกรณ์ "${device.name || device.address}" หลุดการเชื่อมต่อ Bluetooth`);
            dropped = true;
          }
        });

        if (dropped) {
          setConnectedBluetooth(stillOnline);
        }
      } catch (e) {
        // silent error to avoid spam
      }
    };

    const interval = setInterval(checkBluetoothStatus, 5000);
    return () => clearInterval(interval);
  }, [setConnectedBluetooth]);

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

  const scanBluetooth = async () => {
    setIsScanning(true);
    try {
      const res = await fetch("/api/bluetooth/scan");
      const data = await res.json();
      setBluetoothDevices(Array.isArray(data) ? data : data.devices || []);
    } catch (e) {
      toast.error("ค้นหา Bluetooth ล้มเหลว");
    } finally {
      setIsScanning(false);
    }
  };

  const connectBluetooth = async (device: BluetoothDevice) => {
    setConnectingAddress(device.address);
    try {
      const res = await fetch("/api/bluetooth/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", address: device.address, name: device.name })
      });
      if (res.ok) {
        toast.success(`เชื่อมต่อ ${device.name || device.address} สำเร็จ`);
        setConnectedBluetooth(prev => {
          if (!prev.find(d => d.address === device.address)) {
            return [...prev, { ...device, status: false }];
          }
          return prev;
        });
        setIsAddFeederOpen(false); // Close dialog on success
      } else {
        toast.error("เชื่อมต่อล้มเหลว");
      }
    } catch (e) {
      toast.error("เชื่อมต่อล้มเหลว");
    } finally {
      setConnectingAddress(null);
    }
  };

  const feedBluetoothDevice = async (address: string) => {
    const device = connectedBluetooth.find(d => d.address === address);
    if (!device) return;
    
    // Default to 3 seconds if not set
    const durationStr = feedDurations[address] || "3";
    const duration = parseInt(durationStr, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error("กรุณาระบุเวลาให้ถูกต้อง (วินาที)");
      return;
    }

    // Set status to ON
    setConnectedBluetooth(prev => prev.map(d => d.address === address ? { ...d, status: true } : d));

    try {
      const res = await fetch("/api/bluetooth/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "on", address, name: device.name })
      });
      if (res.ok) {
        toast.success(`สั่งให้อาหาร ${device.name || device.address} เป็นเวลา ${duration} วินาที`);
        
        setTimeout(async () => {
          try {
            await fetch("/api/bluetooth/control", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "off", address, name: device.name })
            });
          } catch (e) {
            // silent error
          }
          // Turn off UI status
          setConnectedBluetooth(prev => prev.map(d => 
            d.address === address ? { ...d, status: false } : d
          ));
        }, duration * 1000);
        
      } else {
        toast.error("ส่งคำสั่งล้มเหลว");
        setConnectedBluetooth(prev => prev.map(d => d.address === address ? { ...d, status: false } : d));
      }
    } catch (e) {
      toast.error("ส่งคำสั่งล้มเหลว");
      setConnectedBluetooth(prev => prev.map(d => d.address === address ? { ...d, status: false } : d));
    }
  };

  const disconnectBluetoothDevice = async (address: string) => {
    try {
      const res = await fetch("/api/bluetooth/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", address })
      });
      if (res.ok) {
        toast.success("ยกเลิกการเชื่อมต่อสำเร็จ");
        setConnectedBluetooth(prev => prev.filter(d => d.address !== address));
      } else {
        toast.error("ยกเลิกการเชื่อมต่อล้มเหลว");
      }
    } catch (e) {
      toast.error("ยกเลิกการเชื่อมต่อล้มเหลว");
    }
  };

  const handleRenameBluetooth = (address: string) => {
    if (!editingDeviceName.trim()) {
      toast.error("กรุณาใส่ชื่ออุปกรณ์");
      return;
    }
    setConnectedBluetooth(prev => prev.map(d => {
      if (d.address === address) {
        return { ...d, name: editingDeviceName };
      }
      return d;
    }));
    setEditingDeviceAddress(null);
    toast.success("เปลี่ยนชื่ออุปกรณ์สำเร็จ");
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
          <Dialog open={isAddFeederOpen} onOpenChange={(open) => {
            setIsAddFeederOpen(open);
            if (open) scanBluetooth();
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                เพิ่มเครื่อง
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มเครื่องให้อาหาร</DialogTitle>
                <DialogDescription>เพิ่มเครื่องด้วยตนเอง หรือเชื่อมต่อผ่าน Bluetooth</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* Bluetooth Section */}
                <div className="space-y-4 border p-4 rounded-lg bg-blue-50/50">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-blue-700 flex items-center gap-2">
                      <Bluetooth className="w-4 h-4" />
                      ค้นหา Bluetooth
                    </h4>
                    <Button variant="outline" size="sm" onClick={scanBluetooth} disabled={isScanning}>
                      <RefreshCw className={`w-3 h-3 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                      สแกนใหม่
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto bg-white rounded border p-2">
                    {isScanning ? (
                      <div className="flex flex-col items-center justify-center py-6 text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mb-2 text-blue-500" />
                        <p className="text-sm">กำลังสแกน...</p>
                      </div>
                    ) : bluetoothDevices.length > 0 ? (
                      bluetoothDevices.map((device, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded hover:bg-slate-50 text-sm">
                          <div className="overflow-hidden">
                            <p className="font-medium text-slate-900 truncate">{device.name || "Unknown Device"}</p>
                            <p className="text-xs text-slate-500">{device.address}</p>
                          </div>
                          <Button size="sm" onClick={() => connectBluetooth(device)} disabled={connectingAddress === device.address}>
                            {connectingAddress === device.address ? (
                              <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> กำลังเชื่อมต่อ...</>
                            ) : "เชื่อมต่อ"}
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-sm border border-dashed rounded bg-slate-50">
                        ไม่พบอุปกรณ์
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {feeders.length === 0 && connectedBluetooth.length === 0 ? (
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

            {/* Bluetooth Connected Feeders */}
            {connectedBluetooth.map((device) => {
              const isOn = device.status;
              const isEditing = editingDeviceAddress === device.address;
              
              return (
                <div key={device.address} className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${isOn ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                          <Bluetooth className="w-4 h-4" />
                        </div>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input 
                              size={12}
                              className="h-7 text-sm py-1 px-2 w-32" 
                              value={editingDeviceName} 
                              onChange={e => setEditingDeviceName(e.target.value)} 
                              autoFocus
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleRenameBluetooth(device.address)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => setEditingDeviceAddress(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                            setEditingDeviceAddress(device.address);
                            setEditingDeviceName(device.name || "");
                          }}>
                            <span className="font-semibold text-blue-900">{device.name || "Bluetooth Feeder"}</span>
                            <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-blue-500 transition-colors" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number" 
                          min="1" 
                          placeholder="วิ" 
                          className="w-16 h-8 text-sm"
                          value={feedDurations[device.address] || "3"}
                          onChange={(e) => setFeedDurations(prev => ({ ...prev, [device.address]: e.target.value }))}
                          disabled={isOn}
                        />
                        <Button 
                          size="sm" 
                          className="h-8"
                          onClick={() => feedBluetoothDevice(device.address)}
                          disabled={isOn}
                        >
                          {isOn ? "กำลังทำงาน..." : "ให้อาหาร"}
                        </Button>
                      </div>
                    </div>
                    <div className="mb-4">
                       <p className="text-xs text-slate-500 font-mono">{device.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-blue-100">
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-slate-400 hover:text-red-500 p-2">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ยกเลิกการเชื่อมต่อ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              คุณแน่ใจว่าต้องการตัดการเชื่อมต่อ {device.name || device.address} หรือไม่?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => disconnectBluetoothDevice(device.address)} className="bg-red-600 hover:bg-red-700">
                              ตัดการเชื่อมต่อ
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
