import { useState, useEffect } from "react";
import {
  useListClients,
  useListLockers,
  useListRooms,
  useCalculatePrice,
  useCheckIn,
  useListProducts,
  getListLockersQueryKey,
  getGetLockersOccupancyQueryKey,
  getListRoomsQueryKey,
  getGetRoomsOccupancyQueryKey,
  getGetDashboardQueryKey,
  getListClientsQueryKey,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Search, User, Lock, DoorOpen, CreditCard as CreditCardIcon, Check, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PaymentForm, CreditCard as SquareCreditCard } from "react-square-web-payments-sdk";

type Step = "client" | "resource" | "products" | "payment" | "success";

export default function CheckInPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("client");
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<{ id: number; name: string; membershipStatus: string } | null>(null);
  const [resourceType, setResourceType] = useState<"locker" | "room">("locker");
  const [selectedResource, setSelectedResource] = useState<{ id: number; name: string } | null>(null);
  const [membershipType, setMembershipType] = useState<"none" | "one_time" | "six_month">("none");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [lastResult, setLastResult] = useState<{ session: { resourceName: string }; transaction: { total?: number } } | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [taxRate, setTaxRate] = useState<number | null>(null);

  // Square payment token
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const [cardTokenizationError, setCardTokenizationError] = useState<string | null>(null);

  // Validate Square configuration
  const isSquareConfigured = !!import.meta.env.VITE_SQUARE_APPLICATION_ID && !!import.meta.env.VITE_SQUARE_LOCATION_ID;

  // Fetch tax rate from config API on mount
  useEffect(() => {
    async function fetchConfig() {
      try {
        // First try environment variable
        if (import.meta.env.VITE_TAX_RATE) {
          setTaxRate(parseFloat(import.meta.env.VITE_TAX_RATE));
          return;
        }
        
        // Fallback to API fetch
        const response = await fetch('/api/v1/config');
        if (response.ok) {
          const config = await response.json();
          setTaxRate(config.taxRate);
        } else {
          toast({
            variant: "destructive",
            title: "Configuration error",
            description: "Failed to fetch tax rate from server",
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        toast({
          variant: "destructive",
          title: "Configuration error",
          description: `Error fetching config: ${errorMessage}`,
        });
      }
    }
    
    fetchConfig();
  }, []);

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
  const { data: products = [] } = useListProducts(
    { query: { queryKey: getListProductsQueryKey() } }
  );

  const calculatePrice = useCalculatePrice();
  const checkIn = useCheckIn();
  const [priceResult, setPriceResult] = useState<{ subtotal: number; tax: number; total: number; appliedRules: string[] } | null>(null);

  const resources = resourceType === "locker" ? lockers : rooms;
  const hasExistingMembership = selectedClient?.membershipStatus !== "none";

  function handleSelectClient(client: { id: number; name: string; membershipStatus: string }) {
    setSelectedClient(client);
    setValidationErrors(prev => ({ ...prev, client: "" }));
    setStep("resource");
  }

  function handleSelectResource(resource: { id: number; name: string }) {
    setSelectedResource(resource);
    setValidationErrors(prev => ({ ...prev, resource: "" }));
    setStep("products");
  }

  function handleProductSelection(productId: number) {
    setSelectedProductIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  async function handleProceedToPayment() {
    if (!selectedClient || !selectedResource) return;

    const result = await calculatePrice.mutateAsync({
      data: {
        clientId: selectedClient.id,
        resourceType,
        membershipType: (!hasExistingMembership && membershipType !== "none") ? membershipType : null,
      },
    });

    // Calculate product total
    const productTotal = products
      .filter(p => selectedProductIds.includes(p.id))
      .reduce((sum, p) => sum + p.price, 0);

    // Add product total to the price result
    const updatedResult = {
      ...result,
      subtotal: result.subtotal + productTotal,
      total: result.total + productTotal,
    };

    setPriceResult(updatedResult);
    setStep("payment");
  }

  function handleCardTokenizeResponseReceived(tokenResult: { token: string } | { status: string; errors?: Array<{ message: string }> }, verifiedBuyer?: { token: string } | null) {
    // Handle successful tokenization
    if ('token' in tokenResult && tokenResult.token) {
      setPaymentToken(tokenResult.token);
      setCardTokenizationError(null);
    } else if ('status' in tokenResult && tokenResult.status === 'ERROR') {
      // Handle tokenization errors
      const errorMessage = tokenResult.errors?.[0]?.message || 'Card tokenization failed';
      setCardTokenizationError(errorMessage);
      setPaymentToken(null);
    }
  }


  async function handlePayment() {
    if (!selectedClient || !selectedResource) return;

    // Use Square token if available, otherwise fall back to mock for development
    const token = paymentToken || `SQUARE_MOCK_TOKEN_${Date.now()}`;
    
    checkIn.mutate({
      data: {
        clientId: selectedClient.id,
        resourceType,
        resourceId: selectedResource.id,
        paymentToken: token,
        idempotencyKey: `checkin-${selectedClient.id}-${selectedResource.id}-${Date.now()}`,
        membershipType: (!hasExistingMembership && membershipType !== "none") ? membershipType : null,
        productIds: selectedProductIds.length > 0 ? selectedProductIds : undefined,
      },
    }, {
      onSuccess: (result) => {
        setLastResult(result);
        setPaymentToken(null); // Reset token after successful payment
        queryClient.invalidateQueries({ queryKey: getListLockersQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetLockersOccupancyQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetRoomsOccupancyQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        setStep("success");
      },
      onError: (err: unknown) => {
        setPaymentToken(null); // Reset token on error
        let message = "Check-in failed";
        
        // Handle specific error types
        if (typeof err === 'string') {
          message = err;
        } else if (err && typeof err === 'object') {
          const errorObj = err as { data?: { error?: string }; message?: string };
          message = errorObj.data?.error || errorObj.message || message;
          
          // Provide more specific error messages for common payment failures
          if (message.toLowerCase().includes('declined')) {
            message = "Payment declined. Please try a different card.";
          } else if (message.toLowerCase().includes('insufficient')) {
            message = "Insufficient funds. Please try a different card.";
          } else if (message.toLowerCase().includes('expired')) {
            message = "Card has expired. Please use a different card.";
          }
        }
        
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
    setSelectedProductIds([]);
    setPriceResult(null);
    setPaymentToken(null);
    setCardTokenizationError(null);
    setLastResult(null);
  }

  const stepLabels: Step[] = ["client", "resource", "products", "payment", "success"];

  return (
    <Layout>
      <div className="p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Check In</h1>
          <p className="text-muted-foreground text-sm">Assign a locker or private room to a client</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {(["client", "resource", "products", "payment"] as Step[]).map((s, i) => (
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
              {i < 3 && <div className="h-px w-8 bg-border" />}
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
                  onChange={e => {
                    setSearch(e.target.value);
                    setValidationErrors(prev => ({ ...prev, client: "" }));
                  }}
                  className={cn("pl-9", validationErrors.client && "border-destructive")}
                />
              </div>
              {validationErrors.client && (
                <p className="text-sm text-destructive">{validationErrors.client}</p>
              )}
              {search && clientsData?.clients && (
                <ul className="border border-border rounded-md divide-y divide-border overflow-hidden">
                  {clientsData.clients.length === 0 && (
                    <li className="px-4 py-3 text-sm text-muted-foreground">No clients found</li>
                  )}
                  {clientsData.clients?.map(c => (
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
                {validationErrors.resource && (
                  <p className="text-sm text-destructive mt-2">{validationErrors.resource}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Select products */}
        {step === "products" && selectedClient && selectedResource && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Package size={14} />Add Products (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Select products to add to this check-in</p>
              
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products available</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleProductSelection(p.id)}
                      disabled={p.stock <= 0}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors text-left",
                        selectedProductIds.includes(p.id)
                          ? "bg-primary/10 border-primary"
                          : "bg-background border-border hover:bg-muted/50",
                        p.stock <= 0 && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{p.name}</p>
                        {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                        {p.category && <Badge variant="outline" className="mt-1 text-xs">{p.category}</Badge>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${p.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{p.stock} in stock</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedProductIds.length > 0 && (
                <div className="bg-muted/40 rounded-lg p-3 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Products subtotal</span>
                    <span>${products.filter(p => selectedProductIds.includes(p.id)).reduce((sum, p) => sum + p.price, 0).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("resource")}>Back</Button>
                <Button className="flex-1" onClick={handleProceedToPayment}>
                  Continue to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Payment */}
        {step === "payment" && selectedClient && selectedResource && priceResult && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><CreditCardIcon size={14} />Payment</CardTitle>
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
                  <span className="text-muted-foreground">Tax ({taxRate !== null ? (taxRate * 100).toFixed(3) : 'Loading...'}%)</span>
                  <span>${priceResult.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>${priceResult.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Square payment form */}
              <div className={cn("space-y-3 border rounded-lg p-4", cardTokenizationError && "border-destructive")}>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Card Information</p>
                {isSquareConfigured ? (
                  <PaymentForm
                    applicationId={import.meta.env.VITE_SQUARE_APPLICATION_ID}
                    locationId={import.meta.env.VITE_SQUARE_LOCATION_ID}
                    cardTokenizeResponseReceived={handleCardTokenizeResponseReceived}
                  >
                    <SquareCreditCard />
                  </PaymentForm>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Square SDK not configured. Using mock mode for development.
                    <br />
                    <span className="text-xs">Set VITE_SQUARE_APPLICATION_ID and VITE_SQUARE_LOCATION_ID in .env to enable real payments.</span>
                  </div>
                )}
                {cardTokenizationError && (
                  <p className="text-sm text-destructive font-medium">{cardTokenizationError}</p>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("products")}>Back</Button>
                <Button
                  data-testid="button-complete-checkin"
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={checkIn.isPending || (isSquareConfigured && !paymentToken)}
                >
                  {checkIn.isPending ? "Processing..." : paymentToken ? `Charge $${priceResult.total.toFixed(2)}` : "Enter Card Details"}
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
