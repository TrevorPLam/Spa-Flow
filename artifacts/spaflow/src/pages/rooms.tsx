import { useState } from "react";
import {
  useListRooms,
  useGetRoomsOccupancy,
  useReleaseRoom,
  useRenewRoom,
  useExtendRoom,
  useBulkReleaseRooms,
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
  const [selectedRooms, setSelectedRooms] = useState<Set<number>>(new Set());
  const [showBulkReleaseConfirm, setShowBulkReleaseConfirm] = useState(false);
  const [bulkReleaseMode, setBulkReleaseMode] = useState<"expired" | "selected">("expired");

  const { data: rooms = [] } = useListRooms({}, { query: { queryKey: getListRoomsQueryKey({}) } });
  const { data: occupancy } = useGetRoomsOccupancy({ query: { queryKey: getGetRoomsOccupancyQueryKey() } });

  const release = useReleaseRoom();
  const renew = useRenewRoom();
  const extend = useExtendRoom();
  const bulkRelease = useBulkReleaseRooms();

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

  async function handleBulkReleaseExpired() {
    bulkRelease.mutate({ data: { operation: "all_expired" } }, {
      onSuccess: (result) => {
        toast({ title: `Released ${result.totalReleased} expired rooms` });
        invalidate();
        setSelectedRooms(new Set());
        setShowBulkReleaseConfirm(false);
      },
      onError: () => toast({ title: "Failed to release rooms", variant: "destructive" }),
    });
  }

  async function handleBulkReleaseSelected() {
    bulkRelease.mutate({ data: { operation: "by_ids", resourceIds: Array.from(selectedRooms) } }, {
      onSuccess: (result) => {
        toast({ title: `Released ${result.totalReleased} selected rooms` });
        invalidate();
        setSelectedRooms(new Set());
        setShowBulkReleaseConfirm(false);
      },
      onError: () => toast({ title: "Failed to release rooms", variant: "destructive" }),
    });
  }

  function toggleRoomSelection(id: number) {
    setSelectedRooms(prev => {
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
            <h1 className="text-2xl font-bold text-foreground">Private Rooms</h1>
            {occupancy && (
              <p className="text-sm text-muted-foreground">
                {occupancy.available} available · {occupancy.occupied} occupied · {occupancy.reserved} reserved
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={() => { setBulkReleaseMode("expired"); setShowBulkReleaseConfirm(true); }} disabled={bulkRelease.isPending}>
              Release All Expired
            </Button>
            {selectedRooms.size > 0 && (
              <Button variant="destructive" size="sm" onClick={() => { setBulkReleaseMode("selected"); setShowBulkReleaseConfirm(true); }} disabled={bulkRelease.isPending}>
                Release Selected ({selectedRooms.size})
              </Button>
            )}
            <div className="flex gap-2 text-xs items-center">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" />Occupied</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500" />Reserved</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {roomsArray.map(room => {
            const isOccupied = room.status === "occupied";
            const isReserved = room.status === "reserved";
            const isSelected = selectedRooms.has(room.id);
            return (
              <button
                key={room.id}
                data-testid={`card-room-${room.id}`}
                onClick={(e) => {
                  if (e.shiftKey || selectedRooms.size > 0) {
                    toggleRoomSelection(room.id);
                  } else if (isOccupied || isReserved) {
                    setSelectedRoom(room.id);
                  }
                }}
                className={cn(
                  "rounded-lg border p-4 text-left transition-all relative",
                  isOccupied
                    ? "bg-amber-50 border-amber-300 text-amber-900 cursor-pointer hover:bg-amber-100"
                    : isReserved
                    ? "bg-blue-50 border-blue-300 text-blue-900 cursor-pointer hover:bg-blue-100"
                    : "bg-green-50 border-green-200 text-green-700 cursor-default",
                  isSelected && "ring-2 ring-offset-2 ring-destructive"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{room.name}</span>
                  <Badge variant={room.status === "occupied" ? "default" : "secondary"} className="text-xs capitalize">
                    {room.status}
                  </Badge>
                </div>
                {room.clientName && (
                  <div className="text-sm text-muted-foreground mb-2">
                    <span className="font-medium">Client:</span> {room.clientName}
                  </div>
                )}
                {isOccupied && room.expiresAt && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Time remaining:</span>
                    <Countdown expiresAt={new Date(room.expiresAt)} className="font-medium" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
                )}
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

      <AlertDialog open={showBulkReleaseConfirm} onOpenChange={setShowBulkReleaseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkReleaseMode === "expired" ? "Release all expired rooms?" : `Release ${selectedRooms.size} selected rooms?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkReleaseMode === "expired"
                ? "This will immediately release all rooms whose rental time has expired. This action cannot be undone."
                : "This will immediately release the selected rooms. This action cannot be undone."}
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
