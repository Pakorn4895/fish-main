import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Download, Calendar } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

// Generate hourly data for a given date (mock)
function generateHourlyData(date: string) {
  const data = [];
  for (let h = 0; h < 24; h++) {
    const hour = h.toString().padStart(2, "0") + ":00";
    data.push({
      time: hour,
      pH: +(7.0 + Math.sin(h / 4) * 0.3 + Math.random() * 0.05).toFixed(2),
      DO: +(5.5 + Math.sin(h / 3 + 1) * 0.8 + Math.random() * 0.1).toFixed(2),
      temp: +(28 + Math.sin(h / 6) * 1.5 + Math.random() * 0.2).toFixed(1),
      turbidity: +(115 + Math.sin(h / 5) * 10 + Math.random() * 3).toFixed(0),
      ec: +(1.2 + Math.sin(h / 8) * 0.1 + Math.random() * 0.02).toFixed(2),
    });
  }
  return data;
}

const METRICS = [
  { key: "pH", label: "pH", color: "#3b82f6", unit: "" },
  { key: "DO", label: "DO (mg/L)", color: "#06b6d4", unit: "mg/L" },
  { key: "temp", label: "อุณหภูมิ (°C)", color: "#f97316", unit: "°C" },
  { key: "turbidity", label: "ความขุ่น (NTU)", color: "#8b5cf6", unit: "NTU" },
  { key: "ec", label: "EC (mS/cm)", color: "#10b981", unit: "mS/cm" },
];

export default function Analytics() {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["pH", "DO", "temp"]);
  const [exportFrom, setExportFrom] = useState(today);
  const [exportTo, setExportTo] = useState(today);

  const data = generateHourlyData(selectedDate);

  const toggleMetric = (key: string) => {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleExport = () => {
    alert(`กำลังดาวน์โหลดข้อมูล CSV ตั้งแต่ ${exportFrom} ถึง ${exportTo}`);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">กราฟแนวโน้ม</h2>
          <p className="text-slate-500 mt-1">วิเคราะห์ข้อมูลย้อนหลังและแนวโน้ม</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ดาวน์โหลดข้อมูล CSV</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>วันที่เริ่มต้น</Label>
                <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>วันที่สิ้นสุด</Label>
                <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="mb-2 block">เลือกพารามิเตอร์</Label>
                <div className="flex flex-wrap gap-2">
                  {METRICS.map(m => (
                    <button
                      key={m.key}
                      onClick={() => toggleMetric(m.key)}
                      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                        selectedMetrics.includes(m.key)
                          ? "text-white border-transparent"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                      style={selectedMetrics.includes(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                ดาวน์โหลด
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Controls */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <Label className="text-sm text-slate-600 whitespace-nowrap">เลือกวันที่:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-600">แสดงกราฟ:</span>
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`px-3 py-1 rounded-full text-xs border font-medium transition-all ${
                  selectedMetrics.includes(m.key)
                    ? "text-white border-transparent shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
                style={selectedMetrics.includes(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Combined Chart */}
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-1">
          ข้อมูลคุณภาพน้ำ — {new Date(selectedDate + "T12:00:00").toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" })}
        </h3>
        <p className="text-sm text-slate-500 mb-6">แสดงค่าทุกชั่วโมง (24 ชั่วโมง)</p>
        {selectedMetrics.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <p>เลือกพารามิเตอร์ที่ต้องการแสดง</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                style={{ fontSize: "11px" }}
                interval={1}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                stroke="#94a3b8"
                style={{ fontSize: "11px" }}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px"
                }}
                formatter={(value: number, name: string) => {
                  const m = METRICS.find(x => x.label === name || x.key === name);
                  return [`${value}${m?.unit ? " " + m.unit : ""}`, name];
                }}
              />
              <Legend />
              {METRICS.filter(m => selectedMetrics.includes(m.key)).map(m => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={m.label}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Summary stats for selected date */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        {METRICS.map(m => {
          const values = data.map(d => d[m.key as keyof typeof d] as number);
          const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
          const min = Math.min(...values).toFixed(2);
          const max = Math.max(...values).toFixed(2);
          return (
            <Card key={m.key} className="p-4">
              <div className="w-3 h-3 rounded-full mb-2" style={{ backgroundColor: m.color }} />
              <p className="text-xs text-slate-500 mb-1">{m.label}</p>
              <p className="text-lg font-bold text-slate-900">{avg}</p>
              <p className="text-xs text-slate-400 mt-1">
                ต่ำ: {min} / สูง: {max}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
