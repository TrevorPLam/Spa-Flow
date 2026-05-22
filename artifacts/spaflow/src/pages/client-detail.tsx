import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetClient,
  useUpdateClient,
  useGetClientRentals,
  useGetClientTransactions,
  useGetClientRentalProducts,
  useRenewMembership,
  getGetClientQueryKey,
  getListClientsQueryKey,
  getGetClientRentalsQueryKey,
  getGetClientTransactionsQueryKey,
  getGetClientRentalProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, Eye, EyeOff, Pencil, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/hooks/use-toast";

const MEMBERSHIP_LABELS = { none: "None", one_time: "One-time", six_month: "6-month" };
const MEMBERSHIP_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  none: "outline", one_time: "secondary", six_month: "default",
};

const editSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

const renewalSchema = z.object({
  membershipType: z.enum(["one_time", "six_month"]),
});

type EditForm = z.infer<typeof editSchema>;
type RenewalForm = z.infer<typeof renewalSchema>;

function RentalProducts({ clientId, sessionId }: { clientId: number; sessionId: number }) {
  const { data: products = [], isLoading } = useGetClientRentalProducts(clientId, sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetClientRentalProductsQueryKey(clientId, sessionId) },
  });

  if (isLoading) {
    return <div className="px-6 py-3 text-sm text-muted-foreground">Loading products...</div>;
  }

  if (products.length === 0) {
    return <div className="px-6 py-3 text-sm text-muted-foreground">No products purchased during this rental</div>;
  }

  return (
    <div className="px-6 py-3 bg-muted/30 border-t">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Products Purchased</p>
      <ul className="space-y-1">
        {products.map(p => (
          <li key={p.id} className="text-sm flex justify-between">
            <span>{p.description}</span>
            <span className="font-medium">${(p.total ?? 0).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const id = parseInt(params?.id ?? "0");
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);
  const [showPiiModal, setShowPiiModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [piiData, setPiiData] = useState<{ dob: string | null; address: string | null; documentNumber: string | null } | null>(null);
  const [loadingPii, setLoadingPii] = useState(false);
  const [expandedRentals, setExpandedRentals] = useState<Set<number>>(new Set());

  const { data: client, isLoading } = useGetClient(id, {
    query: { enabled: !!id, queryKey: getGetClientQueryKey(id) },
  });
  const { data: rentals = [] } = useGetClientRentals(id, {
    query: { enabled: !!id, queryKey: getGetClientRentalsQueryKey(id) },
  });
  const { data: transactions = [] } = useGetClientTransactions(id, undefined, {
    query: { enabled: !!id, queryKey: getGetClientTransactionsQueryKey(id) },
  });

  function toggleRentalExpansion(rentalId: number) {
    setExpandedRentals(prev => {
      const next = new Set(prev);
      if (next.has(rentalId)) {
        next.delete(rentalId);
      } else {
        next.add(rentalId);
      }
      return next;
    });
  }

  const updateClient = useUpdateClient();
  const renewMembership = useRenewMembership();

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", email: "", phone: "", notes: "" },
  });

  const renewalForm = useForm<RenewalForm>({
    resolver: zodResolver(renewalSchema),
    defaultValues: { membershipType: "one_time" },
  });

  async function fetchPii() {
    if (!client || !isManager) return;
    setLoadingPii(true);
    try {
      const response = await fetch(`/api/v1/clients/${id}/pii`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('spaflow_token')}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch PII');
      }
      const data = await response.json();
      setPiiData({ dob: data.dob, address: data.address, documentNumber: data.documentNumber });
      setShowPiiModal(true);
    } catch (error) {
      toast({ title: "Failed to load PII", variant: "destructive" });
    } finally {
      setLoadingPii(false);
    }
  }

  function openEdit() {
    if (!client) return;
    form.reset({
      name: client.name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      notes: client.notes ?? "",
    });
    setShowEdit(true);
  }

  async function onEditSubmit(values: EditForm) {
    updateClient.mutate({
      id,
      data: {
        name: values.name,
        email: values.email || undefined,
        phone: values.phone || undefined,
        notes: values.notes || undefined,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Client updated" });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey({}) });
        setShowEdit(false);
      },
      onError: () => toast({ title: "Failed to update client", variant: "destructive" }),
    });
  }

  function openRenewalModal() {
    renewalForm.reset({ membershipType: "one_time" });
    setShowRenewalModal(true);
  }

  async function onRenewalSubmit(values: RenewalForm) {
    // Generate idempotency key
    const idempotencyKey = `renewal_${id}_${Date.now()}`;
    // Mock payment token for development
    const paymentToken = "SQUARE_MOCK_TOKEN_RENEWAL";

    renewMembership.mutate({
      id,
      data: {
        membershipType: values.membershipType,
        paymentToken,
        idempotencyKey,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Membership renewed successfully" });
        queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey({}) });
        setShowRenewalModal(false);
      },
      onError: () => toast({ title: "Failed to renew membership", variant: "destructive" }),
    });
  }

  // Check if membership is expired or can be renewed
  const isMembershipExpired = client?.membershipStatus !== "none" && client?.membershipExpiresAt && new Date(client.membershipExpiresAt) < new Date();
  const canRenew = isMembershipExpired || client?.membershipStatus === "none";
  const shouldShowPurchaseButton = client?.membershipStatus === "none";

  // Check if membership expires within 7 days
  const daysUntilExpiration = client?.membershipExpiresAt 
    ? Math.ceil((new Date(client.membershipExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isExpiringSoon = daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration > 0;

  if (isLoading) return <Layout><div className="p-8 text-muted-foreground text-sm">Loading...</div></Layout>;
  if (!client) return <Layout><div className="p-8 text-muted-foreground text-sm">Client not found</div></Layout>;

  const activeRentals = rentals.filter(r => r.status === "active");

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Link href="/clients">
            <a className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft size={20} />
            </a>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{client.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {client.memberId && <span className="text-xs text-muted-foreground font-mono">{client.memberId}</span>}
              <Badge variant={MEMBERSHIP_VARIANTS[client.membershipStatus]}>
                {MEMBERSHIP_LABELS[client.membershipStatus as keyof typeof MEMBERSHIP_LABELS]}
              </Badge>
              {isExpiringSoon && (
                <Badge variant="destructive" className="gap-1">
                  <Clock size={10} />
                  {daysUntilExpiration}d left
                </Badge>
              )}
              {client.membershipStatus === "six_month" && client.membershipExpiresAt && (
                <span className="text-xs text-muted-foreground">
                  expires {format(new Date(client.membershipExpiresAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canRenew && (
              <Button data-testid="button-renew-membership" variant="default" size="sm" onClick={openRenewalModal} className="gap-2">
                <RefreshCw size={14} />
                {shouldShowPurchaseButton ? "Purchase Membership" : "Renew Membership"}
              </Button>
            )}
            <Button data-testid="button-edit-client" variant="outline" size="sm" onClick={openEdit} className="gap-2">
              <Pencil size={14} />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {client.email && <div><span className="text-muted-foreground">Email:</span> {client.email}</div>}
              {client.phone && <div><span className="text-muted-foreground">Phone:</span> {client.phone}</div>}
              {!client.email && !client.phone && <p className="text-muted-foreground">No contact info</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                Identification
                {isManager ? (
                  <Eye size={12} className="text-primary" />
                ) : (
                  <EyeOff size={12} className="text-muted-foreground" />
                )}
                {isManager && <Badge variant="secondary" className="text-xs">Manager</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Date of birth:</span>{" "}
                {client.dob === "[encrypted]" ? <span className="text-muted-foreground italic">Encrypted</span> : (client.dob || "—")}
              </div>
              <div>
                <span className="text-muted-foreground">Address:</span>{" "}
                {client.address === "[encrypted]" ? <span className="text-muted-foreground italic">Encrypted</span> : (client.address || "—")}
              </div>
              <div>
                <span className="text-muted-foreground">Document #:</span>{" "}
                {client.documentNumber === "[encrypted]" ? <span className="text-muted-foreground italic">Encrypted</span> : (client.documentNumber || "—")}
              </div>
              {isManager && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPii}
                  disabled={loadingPii}
                  className="mt-2 w-full"
                  data-testid="button-view-pii"
                >
                  {loadingPii ? "Loading..." : "View Identification"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {client.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">{client.notes}</p>
            </CardContent>
          </Card>
        )}

        {activeRentals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active Rentals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {activeRentals.map(r => (
                  <li key={r.id} data-testid={`row-rental-${r.id}`}>
                    <div className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/50" onClick={() => toggleRentalExpansion(r.id)}>
                      <div className="flex items-center gap-3">
                        {expandedRentals.has(r.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        <div>
                          <p className="text-sm font-medium capitalize">{r.resourceType} {r.resourceName}</p>
                          <p className="text-xs text-muted-foreground">Since {format(new Date(r.startTime), "h:mm a")}</p>
                        </div>
                      </div>
                      {r.expiresAt && <Countdown expiresAt={new Date(r.expiresAt)} />}
                    </div>
                    {expandedRentals.has(r.id) && (
                      <RentalProducts clientId={id} sessionId={r.id} />
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transactions.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">No transactions</p>
            ) : (
              <ul className="divide-y divide-border">
                {transactions.slice(0, 20).map(t => (
                  <li key={t.id} data-testid={`row-txn-${t.id}`} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{t.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">${(t.total ?? 0).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {transactions.filter(t => t.type === "membership").length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Membership History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {transactions
                  .filter(t => t.type === "membership")
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(t => (
                    <li key={t.id} data-testid={`row-membership-${t.id}`} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {t.description?.includes("one_time") ? "One-time Membership" : "6-month Membership"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(t.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <p className="text-sm font-semibold">${(t.total ?? 0).toFixed(2)}</p>
                      </div>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input data-testid="input-edit-name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input data-testid="input-edit-email" type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input data-testid="input-edit-phone" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea data-testid="input-edit-notes" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
                <Button data-testid="button-save-client" type="submit" disabled={updateClient.isPending}>
                  {updateClient.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showPiiModal} onOpenChange={setShowPiiModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-yellow-600" />
              Client Identification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              <p className="font-medium">Security Notice</p>
              <p>This contains sensitive personally identifiable information. Access is logged and audited.</p>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Date of Birth:</span>
                <p className="text-sm">{piiData?.dob || "—"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Address:</span>
                <p className="text-sm">{piiData?.address || "—"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Document Number:</span>
                <p className="text-sm">{piiData?.documentNumber || "—"}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPiiModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRenewalModal} onOpenChange={setShowRenewalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Membership</DialogTitle>
          </DialogHeader>
          <Form {...renewalForm}>
            <form onSubmit={renewalForm.handleSubmit(onRenewalSubmit)} className="space-y-4">
              <FormField control={renewalForm.control} name="membershipType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Type</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={field.value === "one_time" ? "default" : "outline"}
                        onClick={() => field.onChange("one_time")}
                        className="h-20 flex flex-col gap-1"
                      >
                        <span className="font-semibold">One-time</span>
                        <span className="text-xs opacity-70">$13.00</span>
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "six_month" ? "default" : "outline"}
                        onClick={() => field.onChange("six_month")}
                        className="h-20 flex flex-col gap-1"
                      >
                        <span className="font-semibold">6-month</span>
                        <span className="text-xs opacity-70">$42.00</span>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowRenewalModal(false)}>Cancel</Button>
                <Button data-testid="button-submit-renewal" type="submit" disabled={renewMembership.isPending}>
                  {renewMembership.isPending ? "Processing..." : "Renew"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
