import { useState } from "react";
import {
  useListRooms,
  useGetRoomsOccupancy,
  useReleaseRoom,
  useRenewRoom,
  useExtendRoom,
  getListRoomsQueryKey,
  getGetRoomsOccupancyQueryKey,
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
import { DoorOpen } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MOCK_TOKEN = () => `SQUARE_MOCK_TOKEN_${Date.now()}`;

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);

  const { data: rooms = [] } = useListRooms({}, { query: { queryKey: getListRoomsQueryKey({}) } });
  const { data: occupancy } = useGetRoomsOccupancy({ query: { queryKey: getGetRoomsOccupancyQueryKey() } });

  const release = useReleaseRoom();
  const renew = useRenewRoom();
  const extend = useExtendRoom();

  const roomsArray = Array.isArray(rooms) ? rooms : [];
  const selected = roomsArray.find(r => r.id === selectedRoom);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey({}) });
    queryClient.invalidateQueries({ queryKey: getGetRoomsOccupancyQueryKey() });
  }

  async function handleRelease(id: number) {
    release.mutate({ id }, {
      onSuccess: () => { toast({ title: "Room released" }); invalidate(); setSelectedRoom(null); setShowReleaseConfirm(false); },
      onError: () => toast({ title: "Failed to release room", variant: "destructive" }),
    });
  }

  function handleReleaseClick() {
    setShowReleaseConfirm(true);
  }

  async function handleRenew(id: number) {
    renew.mutate({ id, data: { paymentToken: MOCK_TOKEN(), idempotencyKey: `renew-r-${id}-${Date.now()}` } }, {
      onSuccess: () => { toast({ title: "Room renewed for 6 hours" }); invalidate(); setSelectedRoom(null); },
      onError: () => toast({ title: "Failed to renew", variant: "destructive" }),
    });
  }

  async function handleExtend(id: number) {
    extend.mutate({ id, data: { paymentToken: MOCK_TOKEN(), idempotencyKey: `extend-r-${id}-${Date.now()}` } }, {
      onSuccess: () => { toast({ title: "Room extended by 2 hours" }); invalidate(); setSelectedRoom(null); },
      onError: () => toast({ title: "Failed to extend", variant: "destructive" }),
    });
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Private Rooms</h1>
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

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {roomsArray.map(room => {
            const isOccupied = room.status === "occupied";
            const isReserved = room.status === "reserved";
            return (
              <button
                key={room.id}
                data-testid={`card-room-${room.id}`}
                onClick={() => (isOccupied || isReserved) ? setSelectedRoom(room.id) : undefined}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  isOccupied
                    ? "bg-amber-50 border-amber-300 cursor-pointer hover:bg-amber-100"
                    : isReserved
                    ? "bg-blue-50 border-blue-300 cursor-pointer hover:bg-blue-100"
                    : "bg-green-50 border-green-200 cursor-default"
                )}
              >
                <DoorOpen size={20} className={cn(
                  "mb-1",
                  isOccupied ? "text-amber-600" : isReserved ? "text-blue-600" : "text-green-600"
                )} />
                <p className="text-sm font-semibold">{room.name}</p>
                {isOccupied && <p className="text-xs text-muted-foreground truncate">{room.clientName}</p>}
                {isOccupied && room.expiresAt && (
                  <Countdown expiresAt={new Date(room.expiresAt)} className="text-xs" />
                )}
                {isReserved && <p className="text-xs text-blue-600">Waitlist</p>}
                {!isOccupied && !isReserved && <p className="text-xs text-green-600">Open</p>}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent data-testid="dialog-room-detail">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <DoorOpen size={16} />
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
                      data-testid="button-release-room"
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
                      <AlertDialogTitle>Release room?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately release room {selected?.name}. The client will lose access to the room. This action cannot be undone.
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
                  data-testid="button-renew-room"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRenew(selected.id)}
                  disabled={renew.isPending}
                >
                  Renew (6h)
                </Button>
                <Button
                  data-testid="button-extend-room"
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
