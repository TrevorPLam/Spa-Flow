import { useRoute, Link } from "wouter";
import {
  useGetClient,
  useUpdateClient,
  useDeleteClient,
  useGetClientRentals,
  useGetClientTransactions,
  getGetClientQueryKey,
  getGetClientRentalsQueryKey,
  getGetClientTransactionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/hooks/use-toast";

const MEMBERSHIP_LABELS = { none: "None", one_time: "One-time", six_month: "6-month" };
const MEMBERSHIP_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  none: "outline", one_time: "secondary", six_month: "default",
};

export default function ClientDetailPage() {
  const [, params] = useRoute("/clients/:id");
  const id = parseInt(params?.id ?? "0");
  const { isManager } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: client, isLoading } = useGetClient(id, {
    query: { enabled: !!id, queryKey: getGetClientQueryKey(id) },
  });
  const { data: rentals = [] } = useGetClientRentals(id, {
    query: { enabled: !!id, queryKey: getGetClientRentalsQueryKey(id) },
  });
  const { data: transactions = [] } = useGetClientTransactions(id, {
    query: { enabled: !!id, queryKey: getGetClientTransactionsQueryKey(id) },
  });

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
              {client.membershipStatus === "six_month" && client.membershipExpiresAt && (
                <span className="text-xs text-muted-foreground">
                  expires {format(new Date(client.membershipExpiresAt), "MMM d, yyyy")}
                </span>
              )}
            </div>
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

        {/* Active sessions */}
        {activeRentals.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Active Rentals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {activeRentals.map(r => (
                  <li key={r.id} data-testid={`row-rental-${r.id}`} className="px-6 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{r.resourceType} {r.resourceName}</p>
                      <p className="text-xs text-muted-foreground">Since {format(new Date(r.startTime), "h:mm a")}</p>
                    </div>
                    {r.expiresAt && <Countdown expiresAt={new Date(r.expiresAt)} />}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Transaction history */}
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
      </div>
    </Layout>
  );
}
