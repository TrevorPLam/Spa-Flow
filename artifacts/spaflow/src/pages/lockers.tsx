import { useState } from "react";
import {
  useListLockers,
  useGetLockersOccupancy,
  useReleaseLocker,
  useRenewLocker,
  useExtendLocker,
  getListLockersQueryKey,
  getGetLockersOccupancyQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lock, LockOpen } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MOCK_TOKEN = () => `SQUARE_MOCK_TOKEN_${Date.now()}`;

export default function LockersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedLocker, setSelectedLocker] = useState<number | null>(null);

  const { data: lockers = [] } = useListLockers({}, { query: { queryKey: getListLockersQueryKey({}) } });
  const { data: occupancy } = useGetLockersOccupancy({ query: { queryKey: getGetLockersOccupancyQueryKey() } });

  const release = useReleaseLocker();
  const renew = useRenewLocker();
  const extend = useExtendLocker();

  const selected = lockers.find(l => l.id === selectedLocker);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListLockersQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetLockersOccupancyQueryKey() });
  }

  async function handleRelease(id: number) {
    release.mutate({ id }, {
      onSuccess: () => { toast({ title: "Locker released" }); invalidate(); setSelectedLocker(null); },
      onError: () => toast({ title: "Failed to release locker", variant: "destructive" }),
    });
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
          <div className="flex gap-2 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" />Occupied</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" />Reserved</span>
          </div>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 gap-2">
          {lockers.map(locker => {
            const isOccupied = locker.status === "occupied";
            const isReserved = locker.status === "reserved";
            return (
              <button
                key={locker.id}
                data-testid={`card-locker-${locker.id}`}
                onClick={() => (isOccupied || isReserved) ? setSelectedLocker(locker.id) : undefined}
                className={cn(
                  "aspect-square rounded-lg border text-xs font-semibold flex flex-col items-center justify-center transition-all",
                  isOccupied
                    ? "bg-amber-50 border-amber-300 text-amber-800 cursor-pointer hover:bg-amber-100"
                    : isReserved
                    ? "bg-blue-50 border-blue-300 text-blue-800 cursor-pointer hover:bg-blue-100"
                    : "bg-green-50 border-green-200 text-green-700 cursor-default"
                )}
              >
                <span>{locker.name}</span>
                {isOccupied && locker.expiresAt && (
                  <Countdown expiresAt={new Date(locker.expiresAt)} className="text-[9px]" />
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
                <Button
                  data-testid="button-release-locker"
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRelease(selected.id)}
                  disabled={release.isPending}
                >
                  Release
                </Button>
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
    </Layout>
  );
}
