import { useEffect } from "react";
import { useGetDashboard, getGetDashboardQueryKey, getGetLockersOccupancyQueryKey, getGetRoomsOccupancyQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, DoorOpen, DollarSign, Users, Clock, AlertTriangle, ShoppingBag } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Countdown } from "@/components/Countdown";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLockersOccupancyQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetRoomsOccupancyQueryKey() });
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient]);

  if (isLoading || !data) {
    return (
      <Layout>
        <div className="p-8 text-muted-foreground text-sm">Loading dashboard...</div>
      </Layout>
    );
  }

  const lockerPct = data.lockerOccupancy?.total > 0
    ? Math.round(((data.lockerOccupancy.occupied ?? 0) / data.lockerOccupancy.total) * 100)
    : 0;
  const roomPct = data.roomOccupancy?.total > 0
    ? Math.round(((data.roomOccupancy.occupied ?? 0) / data.roomOccupancy.total) * 100)
    : 0;

  const hasLowStock = (data.lowStockCount ?? 0) > 0;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, MMMM d")}</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-locker-occupancy">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Lockers</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{lockerPct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.lockerOccupancy?.occupied ?? 0} / {data.lockerOccupancy?.total ?? 0} occupied
                  </p>
                </div>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Lock size={16} className="text-primary" />
                </div>
              </div>
              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${lockerPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-room-occupancy">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Rooms</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{roomPct}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.roomOccupancy?.occupied ?? 0} / {data.roomOccupancy?.total ?? 0} occupied
                  </p>
                </div>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DoorOpen size={16} className="text-primary" />
                </div>
              </div>
              <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${roomPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-today-revenue">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Today</p>
                  <p className="text-3xl font-bold text-foreground mt-1">
                    ${(data.todayRevenue ?? 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">revenue</p>
                </div>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign size={16} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-active-clients" className={hasLowStock ? "border-destructive" : ""}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Active</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{data.activeClients}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    clients · {data.waitlistCount} waiting
                  </p>
                </div>
                <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Users size={16} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low stock alert */}
        {hasLowStock && (
          <Card className="border-destructive bg-destructive/5" data-testid="card-low-stock-alert">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
                <AlertTriangle size={14} />
                Low Stock Alert
                <Badge variant="destructive" className="ml-auto">{data.lowStockCount} items</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {data.lowStockProducts?.map(p => (
                  <li key={p.id} className="px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShoppingBag size={14} className="text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category || "Uncategorized"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={p.stock === 0 ? "destructive" : "secondary"} className="text-xs">
                        {p.stock} left
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">Threshold: {p.lowStockThreshold}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-3 bg-background/50 border-t border-border">
                <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => window.location.href = "/products"}>
                  <ShoppingBag size={14} /> Manage Inventory
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active rentals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock size={14} />
                Active Rentals
                <Badge variant="secondary" className="ml-auto">{data.activeRentals?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(data.activeRentals?.length ?? 0) === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No active rentals</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.activeRentals?.map(r => (
                    <li key={r.id} data-testid={`row-rental-${r.id}`} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{r.clientName}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {r.resourceType} {r.resourceName}
                        </p>
                      </div>
                      {r.expiresAt && (
                        <Countdown expiresAt={new Date(r.expiresAt)} />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent transactions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign size={14} />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(data.recentTransactions?.length ?? 0) === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">No transactions yet today</p>
              ) : (
                <ul className="divide-y divide-border">
                  {data.recentTransactions?.map(t => (
                    <li key={t.id} data-testid={`row-transaction-${t.id}`} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{t.clientName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">${(t.total ?? 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
