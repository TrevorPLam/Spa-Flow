import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListClients,
  useListLockers,
  useListRooms,
  useCalculatePrice,
  useCheckIn,
  getListLockersQueryKey,
  getGetLockersOccupancyQueryKey,
  getListRoomsQueryKey,
  getGetRoomsOccupancyQueryKey,
  getGetDashboardQueryKey,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, User, Lock, DoorOpen, CreditCard, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "client" | "resource" | "payment" | "success";

export default function CheckInPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("client");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string; membershipStatus: string } | null>(null);
  const [resourceType, setResourceType] = useState<"locker" | "room">("locker");
  const [selectedResource, setSelectedResource] = useState<{ id: number; name: string } | null>(null);
  const [membershipType, setMembershipType] = useState<"none" | "one_time" | "six_month">("none");
  const [lastResult, setLastResult] = useState<{ session: { resourceName: string }; transaction: { total?: number } } | null>(null);

  // Card inputs (mock)
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const { data: clientsData } = useListClients(
    { search: search || undefined, limit: 8 },
    { query: { queryKey: getListClientsQueryKey({ search: search || undefined, limit: 8 }) } }
  );
  const { data: lockers = [] } = useListLockers(
    { status: "available" },
    { query: { queryKey: getListLockersQueryKey({ status: "available" }) } }
  );
  const { data: rooms = [] } = useListRooms(
    { status: "available" },
    { query: { queryKey: getListRoomsQueryKey({ status: "available" }) } }
  );

  const calculatePrice = useCalculatePrice();
  const checkIn = useCheckIn();
  const [priceResult, setPriceResult] = useState<{ subtotal: number; tax: number; total: number; appliedRules: string[] } | null>(null);

  const resources = resourceType === "locker" ? lockers : rooms;
  const hasExistingMembership = selectedClient?.membershipStatus !== "none";

  function handleSelectClient(client: { id: number; name: string; membershipStatus: string }) {
    setSelectedClient(client);
    setStep("resource");
  }

  async function handleSelectResource(resource: { id: number; name: string }) {
    setSelectedResource(resource);
    if (!selectedClient) return;

    const effectiveMembership = hasExistingMembership ? selectedClient.membershipStatus : membershipType;
    const result = await calculatePrice.mutateAsync({
      data: {
        clientId: selectedClient.id,
        resourceType,
        membershipType: (!hasExistingMembership && membershipType !== "none") ? membershipType : null,
      },
    });
    setPriceResult(result);
    setStep("payment");
  }

  async function handlePayment() {
    if (!selectedClient || !selectedResource) return;

    const token = `SQUARE_MOCK_TOKEN_${Date.now()}`; // TODO: Replace with Square Web Payments SDK tokenization
    checkIn.mutate({
      data: {
        clientId: selectedClient.id,
        resourceType,
        resourceId: selectedResource.id,
        paymentToken: token,
        idempotencyKey: `checkin-${selectedClient.id}-${selectedResource.id}-${Date.now()}`,
        membershipType: (!hasExistingMembership && membershipType !== "none") ? membershipType : null,
      },
    }, {
      onSuccess: (result) => {
        setLastResult(result);
        queryClient.invalidateQueries({ queryKey: getListLockersQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetLockersOccupancyQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetRoomsOccupancyQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setStep("success");
      },
      onError: (err: unknown) => {
        const message = (err as { data?: { error?: string } })?.data?.error ?? "Check-in failed";
        toast({ title: message, variant: "destructive" });
      },
    });
  }

  function reset() {
    setStep("client");
    setSearch("");
    setSelectedClient(null);
    setSelectedResource(null);
    setMembershipType("none");
    setPriceResult(null);
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setLastResult(null);
  }

  const stepLabels: Step[] = ["client", "resource", "payment", "success"];

  return (
    <Layout>
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Check In</h1>
          <p className="text-muted-foreground text-sm">Assign a locker or private room to a client</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {(["client", "resource", "payment"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center",
                step === s || stepLabels.indexOf(step) > i
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}>
                {stepLabels.indexOf(step) > i ? <Check size={12} /> : i + 1}
              </div>
              <span className="text-xs capitalize text-muted-foreground hidden sm:block">{s}</span>
              {i < 2 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 1: Select client */}
        {step === "client" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><User size={14} />Select Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="input-client-search"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              {search && clientsData?.clients && (
                <ul className="border border-border rounded-md divide-y divide-border overflow-hidden">
                  {clientsData.clients.length === 0 && (
                    <li className="px-4 py-3 text-sm text-muted-foreground">No clients found</li>
                  )}
                  {clientsData.clients.map(c => (
                    <li key={c.id}>
                      <button
                        data-testid={`button-select-client-${c.id}`}
                        onClick={() => handleSelectClient({ id: c.id, name: c.name, membershipStatus: c.membershipStatus })}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.email || c.phone || c.memberId}</p>
                        </div>
                        <Badge variant={c.membershipStatus === "six_month" ? "default" : c.membershipStatus === "one_time" ? "secondary" : "outline"}>
                          {c.membershipStatus.replace(/_/g, " ")}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select resource */}
        {step === "resource" && selectedClient && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {resourceType === "locker" ? <Lock size={14} /> : <DoorOpen size={14} />}
                Select {resourceType === "locker" ? "Locker" : "Room"} for {selectedClient.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  data-testid="button-type-locker"
                  variant={resourceType === "locker" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResourceType("locker")}
                >
                  Locker
                </Button>
                <Button
                  data-testid="button-type-room"
                  variant={resourceType === "room" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setResourceType("room")}
                >
                  Private Room
                </Button>
              </div>

              {!hasExistingMembership && (
                <div>
                  <label className="text-sm font-medium">Membership (optional)</label>
                  <Select value={membershipType} onValueChange={v => setMembershipType(v as "none" | "one_time" | "six_month")}>
                    <SelectTrigger data-testid="select-membership-type" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No membership</SelectItem>
                      <SelectItem value="one_time">One-time ($13)</SelectItem>
                      <SelectItem value="six_month">6-month ($42)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Available ({resources.length})</p>
                {resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available {resourceType === "locker" ? "lockers" : "rooms"}</p>
                ) : (
                  <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto">
                    {resources.slice(0, 48).map(r => (
                      <button
                        key={r.id}
                        data-testid={`button-resource-${r.id}`}
                        onClick={() => handleSelectResource({ id: r.id, name: r.name })}
                        className="h-10 text-xs font-medium bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-green-800"
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment */}
        {step === "payment" && selectedClient && selectedResource && priceResult && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><CreditCard size={14} />Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{selectedClient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{resourceType === "locker" ? "Locker" : "Room"}</span>
                  <span className="font-medium">{selectedResource.name}</span>
                </div>
                {priceResult.appliedRules.map((rule, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-primary">{rule}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${priceResult.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax (8.875%)</span>
                  <span>${priceResult.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>${priceResult.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Square payment form placeholder */}
              {/* TODO: Replace with Square Web Payments SDK tokenization */}
              <div className="space-y-3 border border-border rounded-lg p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Card Information</p>
                <Input
                  data-testid="input-card-number"
                  placeholder="Card number"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    data-testid="input-card-expiry"
                    placeholder="MM / YY"
                    value={cardExpiry}
                    onChange={e => setCardExpiry(e.target.value)}
                  />
                  <Input
                    data-testid="input-card-cvv"
                    placeholder="CVV"
                    value={cardCvv}
                    onChange={e => setCardCvv(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("resource")}>Back</Button>
                <Button
                  data-testid="button-complete-checkin"
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={checkIn.isPending}
                >
                  {checkIn.isPending ? "Processing..." : `Charge $${priceResult.total.toFixed(2)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success */}
        {step === "success" && lastResult && (
          <Card>
            <CardContent className="pt-10 pb-10 text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Check-in Complete</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedClient?.name} is checked in to {lastResult.session.resourceName}
                </p>
                <p className="text-muted-foreground text-sm">
                  Total charged: ${(lastResult.transaction.total ?? 0).toFixed(2)}
                </p>
              </div>
              <Button data-testid="button-new-checkin" onClick={reset} className="w-full max-w-xs">
                New Check-in
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
