import { 
  Thermometer, 
  Droplet, 
  Wind, 
  Waves,
  Package,
  AlertCircle,
  CheckCircle,
  TrendingDown
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { PondData, WaterData, FeedData } from "../App";
import { Progress } from "./ui/progress";

interface MobileHomeProps {
  pondData: PondData;
  waterData: WaterData;
  feedData: FeedData;
}

export default function MobileHome({ pondData, waterData, feedData }: MobileHomeProps) {
  // คำนวณเปอร์เซ็นต์อาหารที่เหลือ
  const feedPercentage = (feedData.remainingFeed / feedData.totalCapacity) * 100;
  
  // ตรวจสอบสถานะของแต่ละค่า
  const getTemperatureStatus = (temp: number) => {
    if (temp >= 26 && temp <= 30) return { status: "ปกติ", color: "green", icon: CheckCircle };
    return { status: "ผิดปกติ", color: "yellow", icon: AlertCircle };
  };

  const getPhStatus = (ph: number) => {
    if (ph >= 7.0 && ph <= 8.0) return { status: "ปกติ", color: "green", icon: CheckCircle };
    return { status: "ผิดปกติ", color: "yellow", icon: AlertCircle };
  };

  const getDoStatus = (doValue: number) => {
    if (doValue >= 5) return { status: "ปกติ", color: "green", icon: CheckCircle };
    if (doValue >= 4) return { status: "ต่ำ", color: "yellow", icon: TrendingDown };
    return { status: "ต่ำมาก", color: "red", icon: AlertCircle };
  };

  const getTurbidityStatusColor = (status: string) => {
    if (status === "ปกติ") return "green";
    if (status === "ขุ่นเกินไป") return "yellow";
    return "yellow";
  };

  const tempStatus = getTemperatureStatus(waterData.temperature);
  const phStatus = getPhStatus(waterData.ph);
  const doStatus = getDoStatus(waterData.dissolvedOxygen);
  const turbidityColor = getTurbidityStatusColor(waterData.turbidityStatus);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 pb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-3xl">🐟</div>
          <div>
            <h1 className="text-2xl font-bold">Biofloc</h1>
            <p className="text-blue-100 text-sm">{pondData.pondName}</p>
          </div>
        </div>
        <div className="text-sm text-blue-100 mt-2">
          อัปเดต: {new Date().toLocaleTimeString('th-TH')}
        </div>
      </div>

      <div className="px-4 -mt-4 pb-6 space-y-4">
        {/* คุณภาพน้ำ */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3 px-1">คุณภาพน้ำ</h2>
          
          {/* pH & อุณหภูมิ */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Card className="p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Droplet className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700">pH</span>
                </div>
                {phStatus.icon === CheckCircle ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
              </div>
              <div className="text-3xl font-bold text-slate-900">{waterData.ph}</div>
              <div className="flex items-center gap-1 mt-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    phStatus.color === "green" 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}
                >
                  {phStatus.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2">(ค่าปกติ 7.0-8.5)</p>
            </Card>

            <Card className="p-4 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-slate-700">อุณหภูมิ</span>
                </div>
                {tempStatus.icon === CheckCircle ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
              </div>
              <div className="text-3xl font-bold text-slate-900">{waterData.temperature}°C</div>
              <div className="flex items-center gap-1 mt-1">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    tempStatus.color === "green" 
                      ? "bg-green-50 text-green-700 border-green-200" 
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}
                >
                  {tempStatus.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-2">(ค่าปกติ 26-30°C)</p>
            </Card>
          </div>

          {/* ออกซิเจน */}
          <Card className="p-4 bg-white shadow-sm mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-cyan-500" />
                <span className="text-sm font-medium text-slate-700">ออกซิเจนละลายน้ำ (DO)</span>
              </div>
              {doStatus.color === "green" ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : doStatus.color === "yellow" ? (
                <TrendingDown className="w-4 h-4 text-yellow-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-slate-900">{waterData.dissolvedOxygen}</div>
              <div className="text-lg text-slate-600">mg/L</div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  doStatus.color === "green" 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : doStatus.color === "yellow"
                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {doStatus.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-2">ควรมากกว่า 5 mg/L</p>
          </Card>

          {/* ความขุ่น */}
          <Card className="p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Waves className="w-5 h-5 text-teal-500" />
                <span className="text-sm font-medium text-slate-700">ความขุ่นของน้ำ</span>
              </div>
              {turbidityColor === "green" ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-slate-900">{waterData.turbidity}</div>
              <div className="text-lg text-slate-600">NTU</div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  turbidityColor === "green" 
                    ? "bg-green-50 text-green-700 border-green-200" 
                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                }`}
              >
                {waterData.turbidityStatus}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {waterData.turbidityStatus === "ปกติ" 
                ? "ระดับความขุ่นอยู่ในเกณฑ์ที่เหมาะสม" 
                : waterData.turbidityStatus === "ขุ่นเกินไป"
                ? "น้ำขุ่นเกินไป อาจต้องเติมน้ำสะอาด"
                : "น้ำใสเกินไป อาจต้องเพิ่มจุลินทรีย์"}
            </p>
          </Card>
        </div>

        {/* ข้อมูลอาหาร */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-3 px-1">อาหารปลา</h2>
          
          <Card className="p-5 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 rounded-full">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-slate-600">อาหารคงเหลือ</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">{feedData.remainingFeed}</span>
                  <span className="text-slate-600">kg</span>
                  <span className="text-sm text-slate-500">/ {feedData.totalCapacity} kg</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">ระดับอาหาร</span>
                <span className="font-medium text-slate-900">{feedPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={feedPercentage} className="h-3" />
              {feedPercentage < 20 && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">อาหารเหลือน้อย! กรุณาเติมอาหาร</p>
                </div>
              )}
              {feedPercentage >= 20 && feedPercentage < 50 && (
                <div className="flex items-center gap-2 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">ควรเตรียมเติมอาหาร</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">ให้อาหารครั้งล่าสุด</span>
                <span className="font-medium text-slate-900">{feedData.lastFed} น.</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-600">รอบให้อาหารวันนี้</span>
                <span className="font-medium text-slate-900">{feedData.feedingTimes.length} รอบ</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}