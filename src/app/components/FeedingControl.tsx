import { useState } from "react";
import { 
  AlertCircle,
  Package,
  History
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FeedData } from "../App";
import { toast } from "sonner";

interface FeedingControlProps {
  feedData: FeedData;
  setFeedData: (data: FeedData) => void;
}

export default function FeedingControl({ feedData, setFeedData }: FeedingControlProps) {
  const [refillAmount, setRefillAmount] = useState("");

  const handleRefillFeed = () => {
    const amount = parseFloat(refillAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("กรุณาใส่จำนวนที่ถูกต้อง");
      return;
    }

    const newTotal = feedData.remainingFeed + amount;
    if (newTotal > feedData.totalCapacity) {
      toast.error(`เติมได้สูงสุด ${feedData.totalCapacity - feedData.remainingFeed} kg`);
      return;
    }

    setFeedData({
      ...feedData,
      remainingFeed: newTotal
    });
    setRefillAmount("");
    toast.success(`เติมอาหารสำเร็จ ${amount} kg`);
  };

  const feedPercentage = (feedData.remainingFeed / feedData.totalCapacity) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6 pb-8">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold">จัดการอาหาร</h1>
            <p className="text-orange-100 text-sm">ตรวจสอบและเติมอาหารปลา</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 pb-6 space-y-4">
        {/* สถานะอาหาร */}
        <Card className="p-5 bg-white shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">อาหารคงเหลือ</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">{feedData.remainingFeed}</span>
                <span className="text-slate-600">kg</span>
                <span className="text-sm text-slate-500">/ {feedData.totalCapacity} kg</span>
              </div>
            </div>
          </div>

          <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-3">
            <div 
              className={`h-full transition-all ${
                feedPercentage < 20 ? "bg-red-500" : 
                feedPercentage < 50 ? "bg-yellow-500" : 
                "bg-green-500"
              }`}
              style={{ width: `${feedPercentage}%` }}
            />
          </div>

          {feedPercentage < 20 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">อาหารเหลือน้อย! กรุณาเติมอาหาร</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <span className="text-sm text-slate-600">ให้ครั้งล่าสุด</span>
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-900">{feedData.lastFed} น.</span>
            </div>
          </div>
        </Card>

        {/* เติมอาหาร */}
        <Card className="p-5 bg-white shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">เติมอา��าร</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                จำนวน (kg)
              </label>
              <Input
                type="number"
                placeholder="0.0"
                value={refillAmount}
                onChange={(e) => setRefillAmount(e.target.value)}
                className="w-full"
                step="0.1"
                min="0"
              />
              <p className="text-xs text-slate-500 mt-1">
                เติมได้สูงสุด: {(feedData.totalCapacity - feedData.remainingFeed).toFixed(1)} kg
              </p>
            </div>
            <Button 
              onClick={handleRefillFeed}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Package className="w-4 h-4 mr-2" />
              เติมอาหาร
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}