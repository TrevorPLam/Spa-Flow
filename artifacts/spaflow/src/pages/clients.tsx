import { useState } from "react";
import { useListClients, getListClientsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const MEMBERSHIP_LABELS = { none: "None", one_time: "One-time", six_month: "6-month" };
const MEMBERSHIP_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  none: "outline",
  one_time: "secondary",
  six_month: "default",
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useListClients(
    {
      search: search || undefined,
      membershipStatus: membershipFilter === "all" ? undefined : membershipFilter as "none" | "one_time" | "six_month",
      page,
      limit: 20,
    },
    {
      query: {
        queryKey: getListClientsQueryKey({ search: search || undefined, membershipStatus: membershipFilter === "all" ? undefined : membershipFilter as "none" | "one_time" | "six_month", page, limit: 20 }),
      },
    }
  );

  const clients = data?.clients ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clients</h1>
            <p className="text-sm text-muted-foreground">{total} total</p>
          </div>
          <Link href="/clients/new">
            <Button data-testid="button-new-client" size="sm" className="gap-2">
              <Plus size={16} />
              New Client
            </Button>
          </Link>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-search"
              placeholder="Name, email, phone, or ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={membershipFilter} onValueChange={v => { setMembershipFilter(v); setPage(1); }}>
            <SelectTrigger data-testid="select-membership-filter" className="w-40">
              <SelectValue placeholder="Membership" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All memberships</SelectItem>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="one_time">One-time</SelectItem>
              <SelectItem value="six_month">6-month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : clients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No clients found</div>
            ) : (
              <ul className="divide-y divide-border">
                {clients.map(client => (
                  <li key={client.id} data-testid={`row-client-${client.id}`}>
                    <Link href={`/clients/${client.id}`}>
                      <a className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {client.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{client.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.email || client.phone || client.memberId || "No contact info"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={MEMBERSHIP_VARIANTS[client.membershipStatus]}>
                            {MEMBERSHIP_LABELS[client.membershipStatus as keyof typeof MEMBERSHIP_LABELS]}
                          </Badge>
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
