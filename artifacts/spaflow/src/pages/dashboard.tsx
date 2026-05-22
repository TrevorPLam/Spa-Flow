import { useEffect, useState } from "react";
import { useGetDashboard, getGetDashboardQueryKey, getGetLockersOccupancyQueryKey, getGetRoomsOccupancyQueryKey, useListClients, useAddToWaitlist, useReleaseLocker, useReleaseRoom, useListLockers, useListRooms, getListClientsQueryKey, getListLockersQueryKey, getListRoomsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, DoorOpen, DollarSign, Users, Clock, AlertTriangle, ShoppingBag, Plus, Search, Unlock, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Countdown } from "@/components/Countdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/use-websocket";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data, isLoading } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });

  // WebSocket for real-time updates
  const { status: wsStatus } = useWebSocket({
    onMessage: (message) => {
      // Query invalidation is handled automatically by the hook
      console.log("[Dashboard] WebSocket message received:", message.type);
    },
  });

  // Quick action states
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [waitlistDialogOpen, setWaitlistDialogOpen] = useState(false);
  const [waitlistClientId, setWaitlistClientId] = useState<number | null>(null);
  const [waitlistClientName, setWaitlistClientName] = useState("");
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseResourceType, setReleaseResourceType] = useState<"locker" | "room">("locker");
  const [releaseResourceId, setReleaseResourceId] = useState<number | null>(null);

  // API hooks for quick actions
  const { data: clientsData } = useListClients(
    { search: clientSearch || undefined, limit: 5 },
    { query: { queryKey: getListClientsQueryKey({ search: clientSearch || undefined, limit: 5 }) } }
  );
  const { data: lockersData } = useListLockers(
    { status: "occupied" },
    { query: { queryKey: getListLockersQueryKey({ status: "occupied" }) } }
  );
  const { data: roomsData } = useListRooms(
    { status: "occupied" },
    { query: { queryKey: getListRoomsQueryKey({ status: "occupied" }) } }
  );

  const addToWaitlist = useAddToWaitlist();
  const releaseLocker = useReleaseLocker();
  const releaseRoom = useReleaseRoom();

  // Handler functions
  function handleQuickCheckIn() {
    setLocation("/checkin");
  }

  function handleClientSelect(clientId: number, clientName: string) {
    setLocation(`/clients/${clientId}`);
    setClientSearch("");
    setShowClientDropdown(false);
  }

  function handleWaitlistSubmit() {
    if (!waitlistClientId) return;
    addToWaitlist.mutate({ data: { clientId: waitlistClientId } }, {
      onSuccess: () => {
        toast({ title: `${waitlistClientName} added to waitlist` });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setWaitlistDialogOpen(false);
        setWaitlistClientId(null);
        setWaitlistClientName("");
        setClientSearch("");
        setLocation("/waitlist");
      },
      onError: () => {
        toast({ title: "Failed to add to waitlist", variant: "destructive" });
      },
    });
  }

  function handleReleaseSubmit() {
    if (!releaseResourceId) return;
    if (releaseResourceType === "locker") {
      releaseLocker.mutate({ id: releaseResourceId }, {
        onSuccess: () => {
          toast({ title: "Locker released successfully" });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setReleaseDialogOpen(false);
          setReleaseResourceId(null);
        },
        onError: () => {
          toast({ title: "Failed to release locker", variant: "destructive" });
        },
      });
    } else {
      releaseRoom.mutate({ id: releaseResourceId }, {
        onSuccess: () => {
          toast({ title: "Room released successfully" });
          queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
          setReleaseDialogOpen(false);
          setReleaseResourceId(null);
        },
        onError: () => {
          toast({ title: "Failed to release room", variant: "destructive" });
        },
      });
    }
  }

  // Auto-refresh every 30 seconds (fallback if WebSocket is disconnected)
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsStatus !== "connected") {
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLockersOccupancyQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRoomsOccupancyQueryKey() });
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [queryClient, wsStatus]);

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
      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm">{format(new Date(), "EEEE, MMMM d")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Connection status indicator */}
            <Badge variant={wsStatus === "connected" ? "default" : "secondary"} className="gap-1.5">
              {wsStatus === "connected" ? <Wifi size={12} /> : <WifiOff size={12} />}
              {wsStatus}
            </Badge>
            {/* Quick Check-in Button */}
            <Button size="sm" onClick={handleQuickCheckIn} className="gap-2 min-h-[44px] px-4">
              <Plus size={14} />
              New Check-in
            </Button>

            {/* Quick Waitlist Button */}
            <Dialog open={waitlistDialogOpen} onOpenChange={setWaitlistDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 min-h-[44px] px-4">
                  <Plus size={14} />
                  Add to Waitlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Waitlist</DialogTitle>
                  <DialogDescription>Search for a client to add to the waitlist</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {clientSearch && clientsData && Array.isArray(clientsData) && clientsData.length > 0 && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {clientsData.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => {
                            setWaitlistClientId(client.id);
                            setWaitlistClientName(client.name);
                            setClientSearch("");
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted first:rounded-t-md last:rounded-b-md"
                        >
                          <p className="text-sm font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.email || client.phone || "No contact info"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {waitlistClientId && (
                    <div className="text-sm">
                      Selected: <span className="font-medium">{waitlistClientName}</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setWaitlistDialogOpen(false);
                    setWaitlistClientId(null);
                    setWaitlistClientName("");
                    setClientSearch("");
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleWaitlistSubmit} disabled={!waitlistClientId}>
                    Add to Waitlist
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Quick Client Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                placeholder="Search clients..."
                value={clientSearch}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setShowClientDropdown(true);
                }}
                onFocus={() => setShowClientDropdown(true)}
                onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                className="pl-9 w-48 sm:w-64"
              />
              {showClientDropdown && clientSearch && clientsData && Array.isArray(clientsData) && clientsData.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                  {clientsData.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client.id, client.name)}
                      className="w-full text-left px-3 py-2 hover:bg-muted first:rounded-t-md last:rounded-b-md"
                    >
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.email || client.phone || "No contact info"}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Release Button */}
            <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 min-h-[44px] px-4">
                  <Unlock size={14} />
                  Release Resource
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Release Resource</DialogTitle>
                  <DialogDescription>Select a locker or room to release</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={releaseResourceType} onValueChange={(value: "locker" | "room") => {
                    setReleaseResourceType(value);
                    setReleaseResourceId(null);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="locker">Locker</SelectItem>
                      <SelectItem value="room">Room</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={releaseResourceId?.toString() || ""} onValueChange={(value) => setReleaseResourceId(Number(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${releaseResourceType}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {releaseResourceType === "locker" && lockersData && Array.isArray(lockersData) && lockersData
                        .filter((l) => l.status === "occupied")
                        .map((locker) => (
                          <SelectItem key={locker.id} value={locker.id.toString()}>
                            {locker.name} (ID: {locker.id})
                          </SelectItem>
                        ))}
                      {releaseResourceType === "room" && roomsData && Array.isArray(roomsData) && roomsData
                        .filter((r) => r.status === "occupied")
                        .map((room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.name} (ID: {room.id})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setReleaseDialogOpen(false);
                    setReleaseResourceId(null);
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleReleaseSubmit} disabled={!releaseResourceId}>
                    Release
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-locker-occupancy">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Lockers</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{lockerPct}%</p>
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
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{roomPct}%</p>
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
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">
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
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1">{data.activeClients}</p>
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
                <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                  {data.activeRentals?.map(r => (
                    <li key={r.id} data-testid={`row-rental-${r.id}`} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.clientName}</p>
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
                <ul className="divide-y divide-border max-h-64 overflow-y-auto">
                  {data.recentTransactions?.map(t => (
                    <li key={t.id} data-testid={`row-transaction-${t.id}`} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{t.clientName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</p>
                      </div>
                      <div className="text-right ml-2">
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
