import { useState } from "react";
import {
  useListLockers,
  useGetLockersOccupancy,
  useReleaseLocker,
  useRenewLocker,
  useExtendLocker,
  useBulkReleaseLockers,
  getListLockersQueryKey,
  getGetLockersOccupancyQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lock, Wifi, WifiOff } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useWebSocket } from "@/hooks/use-websocket";

const MOCK_TOKEN = () => `SQUARE_MOCK_TOKEN_${Date.now()}`;

export default function LockersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedLocker, setSelectedLocker] = useState<number | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [selectedLockers, setSelectedLockers] = useState<Set<number>>(new Set());
  const [showBulkReleaseConfirm, setShowBulkReleaseConfirm] = useState(false);
  const [bulkReleaseMode, setBulkReleaseMode] = useState<"expired" | "selected">("expired");

  // WebSocket for real-time updates
  const { status: wsStatus } = useWebSocket({
    onMessage: (message) => {
      // Query invalidation is handled automatically by the hook
      console.log("[Lockers] WebSocket message received:", message.type);
    },
  });

  const { data: lockers = [] } = useListLockers({}, { query: { queryKey: getListLockersQueryKey({}) } });
  const { data: occupancy } = useGetLockersOccupancy({ query: { queryKey: getGetLockersOccupancyQueryKey() } });

  const release = useReleaseLocker();
  const renew = useRenewLocker();
  const extend = useExtendLocker();
  const bulkRelease = useBulkReleaseLockers();

  const lockersArray = Array.isArray(lockers) ? lockers : [];
  const selected = lockersArray.find(l => l.id === selectedLocker);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListLockersQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetLockersOccupancyQueryKey() });
  }

  async function handleRelease(id: number) {
    release.mutate({ id }, {
      onSuccess: () => { toast({ title: "Locker released" }); invalidate(); setSelectedLocker(null); setShowReleaseConfirm(false); },
      onError: () => toast({ title: "Failed to release locker", variant: "destructive" }),
    });
  }

  function handleReleaseClick() {
    setShowReleaseConfirm(true);
  }

  async function handleRenew(id: number) {
    renew.mutate({ id, data: { paymentToken: MOCK_TOKEN(), idempotencyKey: `renew-${id}-${Date.now()}` } }, {
      onSuccess: () => { toast({ title: "Locker renewed for 6 hours" }); invalidate(); setSelectedLocker(null); },
      onError: () => toast({ title: "Failed to renew", variant: "destructive" }),
    });
  }

  async function handleExtend(id: number) {
    extend.mutate({ id, data: { paymentToken: MOCK_TOKEN(), idempotencyKey: `extend-${id}-${Date.now()}` } }, {
      onSuccess: () => { toast({ title: "Locker extended by 2 hours" }); invalidate(); setSelectedLocker(null); },
      onError: () => toast({ title: "Failed to extend", variant: "destructive" }),
    });
  }

  async function handleBulkReleaseExpired() {
    bulkRelease.mutate({ data: { operation: "all_expired" } }, {
      onSuccess: (result) => {
        toast({ title: `Released ${result.totalReleased} expired lockers` });
        invalidate();
        setSelectedLockers(new Set());
        setShowBulkReleaseConfirm(false);
      },
      onError: () => toast({ title: "Failed to release lockers", variant: "destructive" }),
    });
  }

  async function handleBulkReleaseSelected() {
    bulkRelease.mutate({ data: { operation: "by_ids", resourceIds: Array.from(selectedLockers) } }, {
      onSuccess: (result) => {
        toast({ title: `Released ${result.totalReleased} selected lockers` });
        invalidate();
        setSelectedLockers(new Set());
        setShowBulkReleaseConfirm(false);
      },
      onError: () => toast({ title: "Failed to release lockers", variant: "destructive" }),
    });
  }

  function toggleLockerSelection(id: number) {
    setSelectedLockers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lockers</h1>
            {occupancy && (
              <p className="text-sm text-muted-foreground">
                {occupancy.available} available · {occupancy.occupied} occupied · {occupancy.reserved} reserved
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {/* Connection status indicator */}
            <Badge variant={wsStatus === "connected" ? "default" : "secondary"} className="gap-1.5">
              {wsStatus === "connected" ? <Wifi size={12} /> : <WifiOff size={12} />}
              {wsStatus}
            </Badge>
            <Button variant="destructive" size="sm" onClick={() => { setBulkReleaseMode("expired"); setShowBulkReleaseConfirm(true); }} disabled={bulkRelease.isPending}>
              Release All Expired
            </Button>
            {selectedLockers.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => { setBulkReleaseMode("selected"); setShowBulkReleaseConfirm(true); }} disabled={bulkRelease.isPending}>
                Release Selected ({selectedLockers.size})
              </Button>
            )}
            <div className="flex gap-2 text-xs items-center">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" />Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" />Reserved</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2">
          {lockersArray.map(locker => {
            const isOccupied = locker.status === "occupied";
            const isReserved = locker.status === "reserved";
            const isSelected = selectedLockers.has(locker.id);
            return (
              <button
                key={locker.id}
                data-testid={`card-locker-${locker.id}`}
                onClick={(e) => {
                  if (e.shiftKey || selectedLockers.size > 0) {
                    toggleLockerSelection(locker.id);
                  } else if (isOccupied || isReserved) {
                    setSelectedLocker(locker.id);
                  }
                }}
                className={cn(
                  "aspect-square rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all relative",
                  isOccupied
                    ? "bg-amber-50 border-amber-300 text-amber-800 cursor-pointer hover:bg-amber-100"
                    : isReserved
                    ? "bg-blue-50 border-blue-300 text-blue-800 cursor-pointer hover:bg-blue-100"
                    : "bg-green-50 border-green-200 text-green-700 cursor-default",
                  isSelected && "ring-2 ring-offset-2 ring-destructive"
                )}
              >
                <span>{locker.name}</span>
                {isOccupied && locker.expiresAt && (
                  <Countdown expiresAt={new Date(locker.expiresAt)} className="text-[9px]" />
                )}
                {isSelected && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedLocker} onOpenChange={() => setSelectedLocker(null)}>
        <DialogContent data-testid="dialog-locker-detail">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock size={16} />
                  {selected.name}
                  <Badge variant={selected.status === "occupied" ? "default" : "secondary"} className="ml-2 capitalize">
                    {selected.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              {selected.clientName && (
                <div className="space-y-2 text-sm">
                  <div><span className="text-muted-foreground">Client:</span> <strong>{selected.clientName}</strong></div>
                  {selected.expiresAt && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Time remaining:</span>
                      <Countdown expiresAt={new Date(selected.expiresAt)} className="text-sm font-medium" />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <AlertDialog open={showReleaseConfirm} onOpenChange={setShowReleaseConfirm}>
                  <AlertDialogTrigger asChild>
                    <Button
                      data-testid="button-release-locker"
                      variant="destructive"
                      size="sm"
                      onClick={handleReleaseClick}
                      disabled={release.isPending}
                    >
                      Release
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Release locker?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately release locker {selected?.name}. The client will lose access to their belongings. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRelease(selected.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Release
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  data-testid="button-renew-locker"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRenew(selected.id)}
                  disabled={renew.isPending}
                >
                  Renew (6h)
                </Button>
                <Button
                  data-testid="button-extend-locker"
                  variant="outline"
                  size="sm"
                  onClick={() => handleExtend(selected.id)}
                  disabled={extend.isPending}
                >
                  Extend (2h)
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBulkReleaseConfirm} onOpenChange={setShowBulkReleaseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkReleaseMode === "expired" ? "Release all expired lockers?" : `Release ${selectedLockers.size} selected lockers?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkReleaseMode === "expired"
                ? "This will immediately release all lockers whose rental time has expired. This action cannot be undone."
                : "This will immediately release the selected lockers. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkReleaseMode === "expired" ? handleBulkReleaseExpired() : handleBulkReleaseSelected()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Release
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
