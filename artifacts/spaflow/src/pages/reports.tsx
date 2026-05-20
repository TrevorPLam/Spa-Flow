import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangePresets } from "@/components/ui/date-range-picker";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { BarChart3, Download, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface RevenueDataPoint {
  date: string;
  revenue: number;
  tax: number;
  total: number;
  transactionCount: number;
}

interface RevenueReport {
  data: RevenueDataPoint[];
  totalRevenue: number;
  totalTax: number;
  total: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

interface RevenueByTypeDataPoint {
  type: string;
  revenue: number;
  tax: number;
  total: number;
  count: number;
}

interface RevenueByTypeReport {
  data: RevenueByTypeDataPoint[];
  totalRevenue: number;
  totalTax: number;
  total: number;
  startDate: string;
  endDate: string;
}

interface UtilizationDataPoint {
  date: string;
  occupiedCount: number;
  totalCapacity: number;
  utilizationRate: string;
}

interface UtilizationReport {
  data: UtilizationDataPoint[];
  averageUtilization: number;
  totalCapacity: number;
  startDate: string;
  endDate: string;
  granularity: string;
}

interface PeakHoursDataPoint {
  hour: number;
  lockerRentals: number;
  roomRentals: number;
  totalRentals: number;
}

interface PeakHoursReport {
  data: PeakHoursDataPoint[];
  peakHour: { hour: number; totalRentals: number } | null;
  averageRentalsPerHour: number;
  totalRentals: number;
  startDate: string;
  endDate: string;
}

const TYPE_COLORS: Record<string, string> = {
  locker_rental: "#8884d8",
  room_rental: "#82ca9d",
  membership: "#ffc658",
  product: "#ff7300",
  renewal: "#0088fe",
  extension: "#00c49f",
};

const TYPE_LABELS: Record<string, string> = {
  locker_rental: "Locker Rental",
  room_rental: "Room Rental",
  membership: "Membership",
  product: "Product",
  renewal: "Renewal",
  extension: "Extension",
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [revenueReport, setRevenueReport] = useState<RevenueReport | null>(null);
  const [revenueByType, setRevenueByType] = useState<RevenueByTypeReport | null>(null);
  const [lockerUtilization, setLockerUtilization] = useState<UtilizationReport | null>(null);
  const [roomUtilization, setRoomUtilization] = useState<UtilizationReport | null>(null);
  const [peakHours, setPeakHours] = useState<PeakHoursReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is manager
  if (user?.role !== "MANAGER") {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Reports are only available to managers.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const startDate = dateRange?.from?.toISOString();
      const endDate = dateRange?.to?.toISOString();

      // Fetch revenue report
      const revenueResponse = await fetch(
        `/api/v1/reports/revenue?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`,
        {
          credentials: "include",
        }
      );
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueReport(revenueData);
      }

      // Fetch revenue by type
      const typeResponse = await fetch(
        `/api/v1/reports/revenue-by-type?startDate=${startDate}&endDate=${endDate}`,
        {
          credentials: "include",
        }
      );
      if (typeResponse.ok) {
        const typeData = await typeResponse.json();
        setRevenueByType(typeData);
      }

      // Fetch locker utilization
      const lockerResponse = await fetch(
        `/api/v1/reports/utilization/lockers?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`,
        {
          credentials: "include",
        }
      );
      if (lockerResponse.ok) {
        const lockerData = await lockerResponse.json();
        setLockerUtilization(lockerData);
      }

      // Fetch room utilization
      const roomResponse = await fetch(
        `/api/v1/reports/utilization/rooms?startDate=${startDate}&endDate=${endDate}&granularity=${granularity}`,
        {
          credentials: "include",
        }
      );
      if (roomResponse.ok) {
        const roomData = await roomResponse.json();
        setRoomUtilization(roomData);
      }

      // Fetch peak hours
      const peakHoursResponse = await fetch(
        `/api/v1/reports/utilization/peak-hours?startDate=${startDate}&endDate=${endDate}`,
        {
          credentials: "include",
        }
      );
      if (peakHoursResponse.ok) {
        const peakHoursData = await peakHoursResponse.json();
        setPeakHours(peakHoursData);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Handle dates and numbers
            if (header === "date" && value) {
              return format(new Date(value), "yyyy-MM-dd");
            }
            // Escape quotes and wrap in quotes if contains comma
            const stringValue = String(value ?? "");
            if (stringValue.includes(",") || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch reports on mount and when date range changes
  useEffect(() => {
    fetchReports();
  }, []);

  // Re-fetch when date range or granularity changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReports();
    }, 500);
    return () => clearTimeout(timer);
  }, [dateRange, granularity]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 size={20} />
              Reports
            </h1>
            <p className="text-sm text-muted-foreground">Manager-only financial and utilization reporting</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePresets
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
              }}
            />
            <select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as any)}
              className="px-3 py-2 border border-border rounded-md text-sm bg-background"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <Button onClick={() => fetchReports()} disabled={isLoading} variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {revenueReport && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(revenueReport.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Tax</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(revenueReport.totalTax)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total (with Tax)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(revenueReport.total)}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Revenue Trend Chart */}
        {revenueReport && revenueReport.data.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Revenue Trend</CardTitle>
              <Button
                onClick={() => exportToCSV(revenueReport.data, "revenue-trend")}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueReport.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), granularity === "daily" ? "MMM dd" : "MMM")}
                  />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value as string), "MMM dd, yyyy")}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    name="Revenue"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#82ca9d"
                    name="Total (with Tax)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Revenue by Type Chart */}
        {revenueByType && revenueByType.data.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Revenue by Service Type</CardTitle>
              <Button
                onClick={() => exportToCSV(revenueByType.data, "revenue-by-type")}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByType.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" tickFormatter={(value) => TYPE_LABELS[value] || value} />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip
                    labelFormatter={(value) => TYPE_LABELS[value as string] || value}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#8884d8" name="Total Revenue" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {revenueByType.data.map((item) => (
                  <div key={item.type} className="flex items-center gap-2 text-sm">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[item.type] || "#8884d8" }}
                    />
                    <span className="text-muted-foreground">{TYPE_LABELS[item.type]}:</span>
                    <span className="font-medium">{formatCurrency(item.total)}</span>
                    <Badge variant="secondary">{item.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Utilization Summary Cards */}
        {(lockerUtilization || roomUtilization) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lockerUtilization && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Average Locker Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{lockerUtilization.averageUtilization.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Capacity: {lockerUtilization.totalCapacity} lockers
                  </p>
                </CardContent>
              </Card>
            )}
            {roomUtilization && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Average Room Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roomUtilization.averageUtilization.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Capacity: {roomUtilization.totalCapacity} rooms
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Locker Utilization Trend Chart */}
        {lockerUtilization && lockerUtilization.data.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Locker Utilization Trend</CardTitle>
              <Button
                onClick={() => exportToCSV(lockerUtilization.data, "locker-utilization")}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={lockerUtilization.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), granularity === "daily" ? "MMM dd" : "MMM")}
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value as string), "MMM dd, yyyy")}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="utilizationRate"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Utilization Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Room Utilization Trend Chart */}
        {roomUtilization && roomUtilization.data.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Room Utilization Trend</CardTitle>
              <Button
                onClick={() => exportToCSV(roomUtilization.data, "room-utilization")}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={roomUtilization.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), granularity === "daily" ? "MMM dd" : "MMM")}
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                  <Tooltip
                    labelFormatter={(value) => format(new Date(value as string), "MMM dd, yyyy")}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="utilizationRate"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.3}
                    name="Utilization Rate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Peak Hours Chart */}
        {peakHours && peakHours.data.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Peak Hours Analysis</CardTitle>
              <div className="flex items-center gap-4">
                {peakHours.peakHour && (
                  <Badge variant="default" className="text-sm">
                    Peak: {peakHours.peakHour.hour}:00 ({peakHours.peakHour.totalRentals} rentals)
                  </Badge>
                )}
                <Button
                  onClick={() => exportToCSV(peakHours.data, "peak-hours")}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHours.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(value) => `${value}:00`}
                    interval={1}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => `${value}:00 - ${value + 1}:00`}
                    formatter={(value: number, name: string) => [value, name === "totalRentals" ? "Total" : name === "lockerRentals" ? "Lockers" : "Rooms"]}
                  />
                  <Legend />
                  <Bar dataKey="lockerRentals" fill="#8884d8" name="Locker Rentals" />
                  <Bar dataKey="roomRentals" fill="#82ca9d" name="Room Rentals" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Average per hour:</span>
                  <span className="font-medium ml-2">{peakHours.averageRentalsPerHour.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total rentals:</span>
                  <span className="font-medium ml-2">{peakHours.totalRentals}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Peak hour:</span>
                  <span className="font-medium ml-2">
                    {peakHours.peakHour ? `${peakHours.peakHour.hour}:00` : "N/A"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <div className="text-muted-foreground">Loading reports...</div>
          </div>
        )}

        {!isLoading && !revenueReport && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground">
                No data available for the selected date range.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
