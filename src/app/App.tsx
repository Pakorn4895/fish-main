import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Droplets,
  TrendingUp,
  Fish,
  Bell,
  Settings,
  Plus,
  Power,
  Menu
} from "lucide-react";
import Overview from "./components/Overview";
import WaterQuality from "./components/WaterQuality";
import Analytics from "./components/Analytics";
import Feeding from "./components/Feeding";
import Alerts, { Alert } from "./components/Alerts";
import DeviceControl from "./components/DeviceControl";
import SettingsPage from "./components/SettingsPage";
import Login from "./components/Login";
import Register from "./components/Register";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { useSensorData } from "./hooks/useSensorData";

type Page = "overview" | "water-quality" | "analytics" | "feeding" | "device-control" | "alerts" | "settings";

export interface Pond {
  id: string;
  name: string;
  ageInDays: number;
  size: number; // ขนาดบ่อในหน่วยลิตร
}

export interface Reservoir {
  capacity: number; // ความจุทั้งหมด (ลิตร)
  name: string; // ชื่อบ่อพักน้ำ
}

export interface Feeder {
  id: string;
  name: string;
  status: boolean; // true = ON, false = OFF
  remainingFeed: number; // in kg
  capacity: number; // in kg
  lastFed?: string; // e.g. "14:00 น."
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPage, setAuthPage] = useState<"login" | "register">("login");
  const [currentPage, setCurrentPage] = useState<Page>("overview");
  const { data: sensor, isConnected, isMockMode, isArduinoConnected } = useSensorData();

  const [feeders, setFeeders] = useState<Feeder[]>(() => {
    const saved = localStorage.getItem("biofloc_feeders");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: "f1", name: "เครื่องให้อาหาร A", status: false, remainingFeed: 8.5, capacity: 10, lastFed: "06:00 น." },
      { id: "f2", name: "เครื่องให้อาหาร B", status: false, remainingFeed: 4.2, capacity: 10, lastFed: "14:00 น." },
    ];
  });

  useEffect(() => {
    localStorage.setItem("biofloc_feeders", JSON.stringify(feeders));
  }, [feeders]);

  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/alerts');
        if (response.ok) {
          const data = await response.json();
          // แปลงข้อมูลจาก API ให้เข้ากับ Interface ของ Frontend
          const mappedAlerts: Alert[] = data.map((item: any) => ({
            id: item.id,
            type: item.type,
            title: item.title,
            message: item.message,
            timestamp: item.timestamp,
            acknowledged: item.acknowledged || false,
            parameter: item.message.includes('pH') ? 'pH' :
              item.message.includes('EC') ? 'EC' :
                item.message.includes('DO') ? 'DO' :
                  item.message.includes('ความขุ่น') ? 'Turbidity' :
                    item.message.includes('อุณหภูมิ') ? 'Temp' :
                      item.message.includes('ระดับน้ำ') ? 'Level' :
                        item.message.includes('ความชื้น') ? 'Humidity' : 'System',
            value: '-' // สามารถดึงตัวเลขออกจากข้อความได้ถ้าต้องการ
          }));
          setAlerts(mappedAlerts);
        }
      } catch (error) {
        console.error('Error fetching alerts:', error);
      }
    };

    fetchAlerts();
    const intervalId = setInterval(fetchAlerts, 1000); // ดึงข้อมูลทุก 1 วินาที
    return () => clearInterval(intervalId);
  }, []);

  const activeAlertsCount = alerts.filter(a => !a.acknowledged).length;

  // Ponds state - จัดการหลายบ่อ
  const [ponds, setPonds] = useState<Pond[]>([
    { id: "1", name: "บ่อที่ 1", ageInDays: 45, size: 1000 },
    { id: "2", name: "บ่อที่ 2", ageInDays: 30, size: 800 },
  ]);

  // Reservoir state - ข้อมูลบ่อพักน้ำ
  const [reservoir, setReservoir] = useState<Reservoir>({
    capacity: 500,
    name: "บ่อพักน้ำหลัก"
  });

  const [selectedPondId, setSelectedPondId] = useState<string>("1");
  const [isAddPondOpen, setIsAddPondOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [newPond, setNewPond] = useState({
    name: "",
    ageInDays: 0,
    size: 1000
  });

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
    { id: "device-control" as Page, icon: Power, label: "สถานะอุปกรณ์" },
    { id: "alerts" as Page, icon: Bell, label: "แจ้งเตือน & Log" },
  ];

  if (!isAuthenticated) {
    return authPage === "login" ? (
      <Login onLogin={() => setIsAuthenticated(true)} onGoToRegister={() => setAuthPage("register")} />
    ) : (
      <Register onRegister={() => setIsAuthenticated(true)} onGoToLogin={() => setAuthPage("login")} />
    );
  }

  const renderSidebarContent = () => (
    <>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setCurrentPage(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === item.id
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
      <div className="p-4 border-t border-slate-200 shrink-0 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium text-slate-700">เลือกบ่อ</Label>
          <Dialog open={isAddPondOpen} onOpenChange={setIsAddPondOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-white">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>เพิ่มบ่อใหม่</DialogTitle>
                <DialogDescription>
                  กรอกข้อมูลบ่อเลี้ยงปลาใหม่
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pondName">ชื่อบ่อ</Label>
                  <Input
                    id="pondName"
                    value={newPond.name}
                    onChange={(e) => setNewPond({ ...newPond, name: e.target.value })}
                    placeholder="เช่น บ่อที่ 3"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ageInDays">อายุการเลี้ยง (วัน)</Label>
                  <Input
                    id="ageInDays"
                    type="number"
                    value={newPond.ageInDays}
                    onChange={(e) => setNewPond({ ...newPond, ageInDays: Number(e.target.value) })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="size">ขนาดบ่อ (ลิตร)</Label>
                  <Input
                    id="size"
                    type="number"
                    value={newPond.size}
                    onChange={(e) => setNewPond({ ...newPond, size: Number(e.target.value) })}
                    placeholder="1000"
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleAddPond} className="w-full">
                  เพิ่มบ่อ
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
          {ponds.map((pond) => (
            <button
              key={pond.id}
              onClick={() => {
                setSelectedPondId(pond.id);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedPondId === pond.id
                ? "bg-blue-100 text-blue-800 font-medium border border-blue-200 shadow-sm"
                : "text-slate-600 hover:bg-white border border-transparent"
                }`}
            >
              <div className="flex items-center justify-between">
                <span>{pond.name}</span>
                {selectedPondId === pond.id && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                )}
              </div>
              <div className="text-xs mt-1 text-slate-500">
                <span>{pond.ageInDays} วัน</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 shrink-0 bg-white">
        <button
          onClick={() => {
            setCurrentPage("settings");
            setIsMobileMenuOpen(false);
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentPage === "settings"
            ? "bg-blue-50 text-blue-700"
            : "text-slate-700 hover:bg-slate-50"
            }`}
        >
          <Settings className="w-5 h-5" />
          <span>ตั้งค่า</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col md:flex-row md:h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex z-10">
        <div className="p-6 border-b border-slate-200 shrink-0">
          <h1 className="text-xl font-bold text-slate-900">
            🐟 Biofloc Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">ระบบเลี้ยงปลา Biofloc</p>
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${isArduinoConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-slate-600">
              {isArduinoConnected ? 'Arduino เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ Arduino'}
            </span>
          </div>
        </div>
        {renderSidebarContent()}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden relative">
        {/* Mobile Header with Hamburger Menu */}
        <header className="md:hidden flex items-center p-4 border-b border-slate-200 bg-white shrink-0 z-20 shadow-sm gap-3">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 -ml-2">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm p-0 flex flex-col bg-white">
              <SheetHeader className="p-6 border-b border-slate-200 text-left shrink-0">
                <SheetTitle className="flex items-center gap-2 text-xl">
                  <span className="text-2xl">🐟</span> เมนูหลัก
                </SheetTitle>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isArduinoConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-xs font-medium text-slate-600">
                    {isArduinoConnected ? 'Arduino เชื่อมต่อแล้ว' : 'ไม่ได้เชื่อมต่อ Arduino'}
                  </span>
                </div>
              </SheetHeader>
              {renderSidebarContent()}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐟</span>
            <h1 className="text-lg font-bold text-slate-900">Biofloc Dashboard</h1>
          </div>
        </header>

        {/* Dynamic Pages */}
        <main className="flex-1 overflow-auto pb-safe">
          {currentPage === "overview" && <Overview pond={selectedPond} reservoir={reservoir} feeders={feeders} />}
          {currentPage === "water-quality" && <WaterQuality />}
          {currentPage === "analytics" && <Analytics />}
          {currentPage === "feeding" && <Feeding feeders={feeders} setFeeders={setFeeders} />}
          {currentPage === "device-control" && <DeviceControl feeders={feeders} setFeeders={setFeeders} />}
          {currentPage === "alerts" && <Alerts alerts={alerts} setAlerts={setAlerts} />}
          {currentPage === "settings" && (
            <SettingsPage
              ponds={ponds}
              setPonds={setPonds}
              selectedPondId={selectedPondId}
              reservoir={reservoir}
              setReservoir={setReservoir}
              onLogout={() => setIsAuthenticated(false)}
              sendCommand={sendCommand}
            />
          )}
        </main>
      </div>
    </div>
  );
}
