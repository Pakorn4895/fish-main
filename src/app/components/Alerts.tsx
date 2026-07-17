import { useState } from "react";
import { 
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Bell,
  Settings,
  Download,
  X,
  Filter
} from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export type AlertType = "critical" | "warning" | "info" | "success";

export interface Alert {
  id: number;
  type: AlertType;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  parameter?: string;
  value?: string;
}

export interface AlertsProps {
  alerts: Alert[];
  setAlerts: React.Dispatch<React.SetStateAction<Alert[]>>;
}

export default function Alerts({ alerts, setAlerts }: AlertsProps) {


  const [notificationSettings, setNotificationSettings] = useState({
    doLow: true,
    pHFluctuation: true,
    deviceFailure: true,
    iotOffline: true,
    feedingReminder: true
  });

  const acknowledgeAlert = (id: number) => {
    const ackedStr = localStorage.getItem('ackedAlerts_v2') || '[]';
    const ackedAlerts = JSON.parse(ackedStr);
    if (!ackedAlerts.includes(id)) {
      ackedAlerts.push(id);
      localStorage.setItem('ackedAlerts_v2', JSON.stringify(ackedAlerts));
    }
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ));
  };

  const deleteAlert = (id: number) => {
    const deletedStr = localStorage.getItem('deletedAlerts_v2') || '[]';
    const deletedAlerts = JSON.parse(deletedStr);
    if (!deletedAlerts.includes(id)) {
      deletedAlerts.push(id);
      localStorage.setItem('deletedAlerts_v2', JSON.stringify(deletedAlerts));
    }
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const getAlertStyle = (type: AlertType) => {
    switch (type) {
      case "critical":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "success":
        return "bg-green-50 border-green-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const getAlertBadge = (type: AlertType) => {
    const badges = {
      critical: <Badge variant="destructive">วิกฤติ</Badge>,
      warning: <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">เตือน</Badge>,
      success: <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">สำเร็จ</Badge>,
      info: <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">ข้อมูล</Badge>
    };
    return badges[type];
  };

  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  // System logs
  const systemLogs = [
    { time: "14:30:25", event: "DO_LOW_ALERT", description: "ระดับ DO ต่ำกว่าเกณฑ์", status: "error" },
    { time: "12:00:00", event: "FEEDING_COMPLETED", description: "ให้อาหารรอบเที่ยง สำเร็จ", status: "success" },
    { time: "10:00:00", event: "PUMP_MAINTENANCE", description: "เริ่มบำรุงรักษาปั๊มน้ำ", status: "info" },
    { time: "09:30:00", event: "SYSTEM_NORMAL", description: "ระบบกลับสู่สภาวะปกติ", status: "success" },
    { time: "08:00:00", event: "FEEDING_COMPLETED", description: "ให้อาหารรอบเช้า สำเร็จ", status: "success" },
    { time: "06:00:00", event: "SYSTEM_CHECK", description: "ตรวจสอบระบบอัตโนมัติ", status: "info" }
  ];

  const exportLogs = () => {
    alert("กำลังดาวน์โหลด logs เป็น CSV...");
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">แจ้งเตือน & Log</h2>
          <p className="text-slate-500 mt-1">ตรวจสอบการแจ้งเตือนและบันทึกการทำงานของระบบ</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                ตั้งค่าการแจ้งเตือน
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>ตั้งค่าการแจ้งเตือน</DialogTitle>
                <DialogDescription>
                  เลือกประเภทการแจ้งเตือนที่ต้องการรับ
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>DO ต่ำกว่าเกณฑ์</Label>
                  <Switch 
                    checked={notificationSettings.doLow}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, doLow: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>pH แกว่งผิดปกติ</Label>
                  <Switch 
                    checked={notificationSettings.pHFluctuation}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, pHFluctuation: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>อุปกรณ์ขัดข้อง</Label>
                  <Switch 
                    checked={notificationSettings.deviceFailure}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, deviceFailure: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>IoT Offline</Label>
                  <Switch 
                    checked={notificationSettings.iotOffline}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, iotOffline: checked})
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>แจ้งเตือนให้อาหาร</Label>
                  <Switch 
                    checked={notificationSettings.feedingReminder}
                    onCheckedChange={(checked) => 
                      setNotificationSettings({...notificationSettings, feedingReminder: checked})
                    }
                  />
                </div>
                <Button className="w-full">บันทึกการตั้งค่า</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </div>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">การแจ้งเตือนวิกฤติ</p>
              <p className="text-2xl font-bold text-slate-900">
                {alerts.filter(a => a.type === "critical" && !a.acknowledged).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">คำเตือน</p>
              <p className="text-2xl font-bold text-slate-900">
                {alerts.filter(a => a.type === "warning" && !a.acknowledged).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">การแจ้งเตือนทั้งหมด</p>
              <p className="text-2xl font-bold text-slate-900">{alerts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">จัดการแล้ว</p>
              <p className="text-2xl font-bold text-slate-900">{acknowledgedAlerts.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto justify-start p-1.5 gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] bg-slate-100/80 rounded-xl">
          <TabsTrigger value="active" className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm sm:text-base rounded-lg">
            แจ้งเตือน ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm sm:text-base rounded-lg">
            ประวัติการแจ้งเตือน
          </TabsTrigger>
          <TabsTrigger value="logs" className="whitespace-nowrap flex-shrink-0 px-4 py-2 text-sm sm:text-base rounded-lg">
            System Logs
          </TabsTrigger>
        </TabsList>

        {/* Active Alerts */}
        <TabsContent value="active">
          {activeAlerts.length === 0 ? (
            <Card className="p-12 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">ไม่มีการแจ้งเตือน</h3>
              <p className="text-slate-500">ระบบทำงานปกติ ไม่มีการแจ้งเตือนที่ต้องดำเนินการ</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} className={`p-4 border-2 ${getAlertStyle(alert.type)}`}>
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1 w-full">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-slate-900">{alert.title}</h4>
                          {getAlertBadge(alert.type)}
                        </div>
                        <p className="text-slate-700 mb-2 break-words text-sm sm:text-base">{alert.message}</p>
                        {alert.parameter && (
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 text-sm mt-2">
                            <span className="text-slate-600">
                              <strong>พารามิเตอร์:</strong> {alert.parameter}
                            </span>
                            <span className="text-slate-600">
                              <strong>ค่าปัจจุบัน:</strong> {alert.value}
                            </span>
                          </div>
                        )}
                        <p className="text-sm text-slate-500 mt-2">{alert.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                      <Button
                        size="sm"
                        className="flex-1 sm:flex-none w-full"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        รับทราบ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-none px-3"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Alert History */}
        <TabsContent value="history">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">ไม่มีประวัติการแจ้งเตือน</h3>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Card key={alert.id} className={`p-4 ${alert.acknowledged ? 'opacity-75' : ''} border-2 ${getAlertStyle(alert.type)}`}>
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex gap-3 flex-1 w-full">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-slate-900">{alert.title}</h4>
                          {getAlertBadge(alert.type)}
                          {alert.acknowledged && <Badge variant="outline">รับทราบแล้ว</Badge>}
                        </div>
                        <p className="text-slate-700 mb-2 break-words text-sm sm:text-base">{alert.message}</p>
                        <p className="text-sm text-slate-500">{alert.timestamp}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full sm:w-auto"
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <X className="w-4 h-4 mr-2 sm:mr-0" /> ลบ
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* System Logs */}
        <TabsContent value="logs">
          <Card className="p-6">
            <div className="space-y-3">
              {systemLogs.map((log, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg">
                  <div className="text-sm font-mono text-slate-600 w-20">{log.time}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-mono text-slate-900">{log.event}</code>
                      <Badge 
                        variant="outline"
                        className={
                          log.status === "error" ? "bg-red-50 text-red-700 border-red-200" :
                          log.status === "warning" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                          log.status === "success" ? "bg-green-50 text-green-700 border-green-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}