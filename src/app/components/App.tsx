import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Droplets, 
  TrendingUp, 
  Fish, 
  Bell, 
  Settings,
  Plus,
  Cpu
} from "lucide-react";
import Overview from "./components/Overview";
import WaterQuality from "./components/WaterQuality";
import Analytics from "./components/Analytics";
import Feeding from "./components/Feeding";
import Alerts, { Alert } from "./Alerts";
import SettingsPage from "./components/SettingsPage";
import DeviceControl from "./components/DeviceControl";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";

type Page = "overview" | "water-quality" | "analytics" | "feeding" | "alerts" | "settings" | "devices";

export interface Pond {
  id: string;
  name: string;
  ageInDays: number;
  size: number;
}

export interface Reservoir {
  capacity: number;
  name: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("overview");

  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // ใช้ Relative Path เพื่อรองรับการเข้าใช้งานผ่าน LAN (Vite จะทำหน้าที่ Proxy ให้ในโหมด Dev)
        const API_URL = '/api/alerts';
        const response = await fetch(API_URL);
        if (response.ok) {
          const data = await response.json();
          const ackedStr = localStorage.getItem('ackedAlerts_v2') || '[]';
          const ackedAlerts = JSON.parse(ackedStr);
          const deletedStr = localStorage.getItem('deletedAlerts_v2') || '[]';
          const deletedAlerts = JSON.parse(deletedStr);

          const filteredData = data
            .filter((a: any) => !deletedAlerts.includes(a.id))
            .map((a: any) => ({
              ...a,
              acknowledged: ackedAlerts.includes(a.id)
            }));
          setAlerts(filteredData);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    fetchAlerts();
    const intervalId = setInterval(fetchAlerts, 1000); // อัปเดตการแจ้งเตือนทุก 1 วินาที
    return () => clearInterval(intervalId);
  }, []);

  const activeAlertsCount = alerts.filter(a => !a.acknowledged).length;

  const [ponds, setPonds] = useState<Pond[]>([
    { id: "1", name: "บ่อที่ 1", ageInDays: 45, size: 1000 },
    { id: "2", name: "บ่อที่ 2", ageInDays: 30, size: 800 },
  ]);

  const [reservoir, setReservoir] = useState<Reservoir>({
    capacity: 500,
    name: "บ่อพักน้ำหลัก"
  });
  
  const [selectedPondId, setSelectedPondId] = useState<string>("1");
  const [isAddPondOpen, setIsAddPondOpen] = useState(false);
  const [newPond, setNewPond] = useState({ name: "", ageInDays: 0, size: 1000 });

  const selectedPond = ponds.find(p => p.id === selectedPondId) || ponds[0];

  const handleAddPond = () => {
    if (newPond.name.trim()) {
      const pond: Pond = {
        id: Date.now().toString(),
        name: newPond.name,
        ageInDays: newPond.ageInDays,
        size: newPond.size
      };
      setPonds([...ponds, pond]);
      setSelectedPondId(pond.id);
      setIsAddPondOpen(false);
      setNewPond({ name: "", ageInDays: 0, size: 1000 });
    }
  };

  const navigation = [
    { id: "overview" as Page, icon: LayoutDashboard, label: "ภาพรวม" },
    { id: "water-quality" as Page, icon: Droplets, label: "คุณภาพน้ำ" },
    { id: "analytics" as Page, icon: TrendingUp, label: "กราฟแนวโน้ม" },
    { id: "feeding" as Page, icon: Fish, label: "การให้อาหาร" },
    { id: "devices" as Page, icon: Cpu, label: "ควบคุมอุปกรณ์" },
    { id: "alerts" as Page, icon: Bell, label: "แจ้งเตือน & Log" },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      <Toaster />
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">🐟 Biofloc Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">ระบบเลี้ยงปลา Biofloc</p>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      currentPage === item.id
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === "alerts" && activeAlertsCount > 0 && (
                      <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm transition-all animate-pulse">
                        {activeAlertsCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Pond Selector */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-slate-700">เลือกบ่อ</Label>
            <Dialog open={isAddPondOpen} onOpenChange={setIsAddPondOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เพิ่มบ่อใหม่</DialogTitle>
                  <DialogDescription>กรอกข้อมูลบ่อเลี้ยงปลาใหม่</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pondName">ชื่อบ่อ</Label>
                    <Input id="pondName" value={newPond.name} onChange={(e) => setNewPond({ ...newPond, name: e.target.value })} placeholder="เช่น บ่อที่ 3" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="ageInDays">อายุการเลี้ยง (วัน)</Label>
                    <Input id="ageInDays" type="number" value={newPond.ageInDays} onChange={(e) => setNewPond({ ...newPond, ageInDays: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="size">ขนาดบ่อ (ลิตร)</Label>
                    <Input id="size" type="number" value={newPond.size} onChange={(e) => setNewPond({ ...newPond, size: Number(e.target.value) })} className="mt-1" />
                  </div>
                  <Button onClick={handleAddPond} className="w-full">เพิ่มบ่อ</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-1">
            {ponds.map((pond) => (
              <button
                key={pond.id}
                onClick={() => setSelectedPondId(pond.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedPondId === pond.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{pond.name}</span>
                  {selectedPondId === pond.id && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
                </div>
                <div className="text-xs mt-1"><span>{pond.ageInDays} วัน</span></div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => setCurrentPage("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentPage === "settings" ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>ตั้งค่า</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {currentPage === "overview" && <Overview pond={selectedPond} reservoir={reservoir} />}
        {currentPage === "water-quality" && <WaterQuality />}
        {currentPage === "analytics" && <Analytics />}
        {currentPage === "feeding" && <Feeding />}
        {currentPage === "devices" && <DeviceControl />}
        {currentPage === "alerts" && <Alerts alerts={alerts} setAlerts={setAlerts} />}
        {currentPage === "settings" && (
          <SettingsPage
            ponds={ponds}
            setPonds={setPonds}
            selectedPondId={selectedPondId}
            reservoir={reservoir}
            setReservoir={setReservoir}
          />
        )}
      </main>
    </div>
  );
}
