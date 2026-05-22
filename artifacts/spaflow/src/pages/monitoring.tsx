import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Cpu, Database, AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HealthMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  avgDatabaseLatency: number;
}

interface MonitoringResponse {
  status: string;
  timestamp: string;
  metrics: HealthMetrics;
}

export default function MonitoringPage() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/v1/monitoring/metrics");
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const data: MonitoringResponse = await response.json();
      setMetrics(data.metrics);
      setLastUpdated(new Date(data.timestamp));
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
      toast({
        title: "Failed to load monitoring metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return "destructive";
    if (value >= thresholds.warning) return "secondary";
    return "default";
  };

  const getStatusIcon = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return <XCircle className="h-4 w-4" />;
    if (value >= thresholds.warning) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Monitoring</h1>
            <p className="text-muted-foreground">
              Real-time system health and performance metrics
            </p>
          </div>
          <Button onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}

        {loading && !metrics ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Memory Usage */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.memory.percentage.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.memory.used.toFixed(0)} MB / {metrics.memory.total.toFixed(0)} MB
                </p>
                <div className="mt-2">
                  <Badge
                    variant={getStatusColor(metrics.memory.percentage, { warning: 70, critical: 90 })}
                    className="gap-1"
                  >
                    {getStatusIcon(metrics.memory.percentage, { warning: 70, critical: 90 })}
                    {metrics.memory.percentage >= 90 ? "Critical" : metrics.memory.percentage >= 70 ? "Warning" : "Healthy"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Uptime */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatUptime(metrics.uptime)}</div>
                <p className="text-xs text-muted-foreground">
                  {(metrics.uptime / 3600).toFixed(1)} hours total
                </p>
                <div className="mt-2">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-4 w-4" />
                    Running
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Error Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(metrics.errorRate * 100).toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Recent request errors
                </p>
                <div className="mt-2">
                  <Badge
                    variant={getStatusColor(metrics.errorRate * 100, { warning: 2, critical: 5 })}
                    className="gap-1"
                  >
                    {getStatusIcon(metrics.errorRate * 100, { warning: 2, critical: 5 })}
                    {metrics.errorRate * 100 >= 5 ? "Critical" : metrics.errorRate * 100 >= 2 ? "Warning" : "Healthy"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Average Response Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.avgResponseTime.toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Average API response time
                </p>
                <div className="mt-2">
                  <Badge
                    variant={getStatusColor(metrics.avgResponseTime, { warning: 1000, critical: 5000 })}
                    className="gap-1"
                  >
                    {getStatusIcon(metrics.avgResponseTime, { warning: 1000, critical: 5000 })}
                    {metrics.avgResponseTime >= 5000 ? "Critical" : metrics.avgResponseTime >= 1000 ? "Warning" : "Healthy"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* P95 Response Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">P95 Response Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.p95ResponseTime.toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  95th percentile response time
                </p>
                <div className="mt-2">
                  <Badge
                    variant={getStatusColor(metrics.p95ResponseTime, { warning: 2000, critical: 10000 })}
                    className="gap-1"
                  >
                    {getStatusIcon(metrics.p95ResponseTime, { warning: 2000, critical: 10000 })}
                    {metrics.p95ResponseTime >= 10000 ? "Critical" : metrics.p95ResponseTime >= 2000 ? "Warning" : "Healthy"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Database Latency */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Latency</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.avgDatabaseLatency.toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Average query latency
                </p>
                <div className="mt-2">
                  <Badge
                    variant={getStatusColor(metrics.avgDatabaseLatency, { warning: 500, critical: 1000 })}
                    className="gap-1"
                  >
                    {getStatusIcon(metrics.avgDatabaseLatency, { warning: 500, critical: 1000 })}
                    {metrics.avgDatabaseLatency >= 1000 ? "Critical" : metrics.avgDatabaseLatency >= 500 ? "Warning" : "Healthy"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No metrics available</p>
              <Button onClick={fetchMetrics} className="mt-4">
                Load Metrics
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Health Check Endpoints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Liveness Probe</span>
              <code className="bg-muted px-2 py-1 rounded">GET /healthz/live</code>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Readiness Probe</span>
              <code className="bg-muted px-2 py-1 rounded">GET /healthz/ready</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
