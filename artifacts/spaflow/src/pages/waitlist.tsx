import { useState } from "react";
import {
  useListWaitlist,
  useAddToWaitlist,
  useRemoveFromWaitlist,
  useConfirmWaitlistAssignment,
  useListClients,
  getListWaitlistQueryKey,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ClipboardList, Search, X, Check } from "lucide-react";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  waiting: "secondary",
  assigned: "default",
  confirmed: "outline",
  expired: "destructive",
};

export default function WaitlistPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientName, setSelectedClientName] = useState("");

  const { data: waitlist = [] } = useListWaitlist({ query: { queryKey: getListWaitlistQueryKey() } });
  const { data: clientsData } = useListClients(
    { search: search || undefined, limit: 5 },
    { query: { queryKey: getListClientsQueryKey({ search: search || undefined, limit: 5 }) } }
  );

  const addToWaitlist = useAddToWaitlist();
  const removeFromWaitlist = useRemoveFromWaitlist();
  const confirmAssignment = useConfirmWaitlistAssignment();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListWaitlistQueryKey() });
  }

  function handleAdd() {
    if (!selectedClientId) return;
    addToWaitlist.mutate({ data: { clientId: selectedClientId } }, {
      onSuccess: () => {
        toast({ title: `${selectedClientName} added to waitlist` });
        invalidate();
        setSearch("");
        setSelectedClientId(null);
        setSelectedClientName("");
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { error?: string } })?.data?.error ?? "Failed to add to waitlist";
        toast({ title: msg, variant: "destructive" });
      },
    });
  }

  function handleRemove(id: number) {
    removeFromWaitlist.mutate({ id }, {
      onSuccess: () => { toast({ title: "Removed from waitlist" }); invalidate(); },
      onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
    });
  }

  function handleConfirm(id: number) {
    confirmAssignment.mutate({ id }, {
      onSuccess: () => { toast({ title: "Assignment confirmed" }); invalidate(); },
      onError: () => toast({ title: "Failed to confirm", variant: "destructive" }),
    });
  }

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList size={20} />
            Waitlist
            <Badge variant="secondary" className="ml-1">{waitlist.length}</Badge>
          </h1>
          <p className="text-muted-foreground text-sm">Clients waiting for a private room</p>
        </div>

        {/* Add to waitlist */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add to Waitlist</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="input-waitlist-search"
                placeholder="Search client..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedClientId(null); }}
                className="pl-9"
              />
            </div>
            {search && !selectedClientId && clientsData?.clients && (
              <ul className="border border-border rounded-md divide-y divide-border overflow-hidden">
                {clientsData.clients.map(c => (
                  <li key={c.id}>
                    <button
                      data-testid={`button-select-client-${c.id}`}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors text-sm"
                      onClick={() => { setSelectedClientId(c.id); setSelectedClientName(c.name); setSearch(c.name); }}
                    >
                      {c.name}
                      {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedClientId && (
              <Button
                data-testid="button-add-waitlist"
                onClick={handleAdd}
                disabled={addToWaitlist.isPending}
                className="w-full"
              >
                Add {selectedClientName} to Waitlist
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Waitlist */}
        <Card>
          <CardContent className="p-0">
            {waitlist.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Waitlist is empty</div>
            ) : (
              <ul className="divide-y divide-border">
                {waitlist.map(entry => (
                  <li key={entry.id} data-testid={`row-waitlist-${entry.id}`} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {entry.position}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{entry.clientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.clientPhone && <span>{entry.clientPhone} · </span>}
                          Joined {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </p>
                        {entry.status === "assigned" && entry.assignedRoomName && (
                          <p className="text-xs text-primary mt-0.5">
                            Room {entry.assignedRoomName} assigned
                            {entry.confirmBy && <> · confirm in <Countdown expiresAt={new Date(entry.confirmBy)} /></>}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_COLORS[entry.status] as "default" | "secondary" | "outline" | "destructive"}>
                        {entry.status}
                      </Badge>
                      {entry.status === "assigned" && (
                        <Button
                          data-testid={`button-confirm-waitlist-${entry.id}`}
                          size="sm"
                          onClick={() => handleConfirm(entry.id)}
                          disabled={confirmAssignment.isPending}
                          className="gap-1"
                        >
                          <Check size={12} />
                          Confirm
                        </Button>
                      )}
                      <Button
                        data-testid={`button-remove-waitlist-${entry.id}`}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(entry.id)}
                        disabled={removeFromWaitlist.isPending}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
