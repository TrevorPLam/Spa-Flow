import { useState } from "react";
import { useListClients, getListClientsQueryKey, useListSavedSearches, useCreateSavedSearch, useDeleteSavedSearch, ListClientsPreset, SavedSearchInputFilters } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, ChevronRight, Download, Filter, X, Save, Trash2 } from "lucide-react";
import { DateRangePicker, DateRangePresets } from "@/components/ui/date-range-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const MEMBERSHIP_LABELS = { none: "None", one_time: "One-time", six_month: "6-month" };
const MEMBERSHIP_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  none: "outline",
  one_time: "secondary",
  six_month: "default",
};

const PRESET_LABELS: Record<string, string> = {
  active_members: "Active Members",
  expired_members: "Expired Members",
  high_value: "High Value ($500+)",
  recent_visitors: "Recent Visitors (30d)",
  inactive: "Inactive (60d)",
};

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [presetFilter, setPresetFilter] = useState<ListClientsPreset | "">("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [page, setPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");

  const { data, isLoading } = useListClients(
    {
      search: search || undefined,
      membershipStatus: membershipFilter === "all" ? undefined : membershipFilter as "none" | "one_time" | "six_month",
      preset: presetFilter || undefined,
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString(),
      page,
      limit: 20,
    },
    {
      query: {
        queryKey: getListClientsQueryKey({ 
          search: search || undefined, 
          membershipStatus: membershipFilter === "all" ? undefined : membershipFilter as "none" | "one_time" | "six_month",
          preset: presetFilter || undefined,
          startDate: dateRange?.from?.toISOString(),
          endDate: dateRange?.to?.toISOString(),
          page, 
          limit: 20 
        }),
      },
    }
  );

  const { data: savedSearches } = useListSavedSearches();
  const createSavedSearch = useCreateSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (membershipFilter !== "all") params.set("membershipStatus", membershipFilter);
    if (presetFilter) params.set("preset", presetFilter);
    if (dateRange?.from) params.set("startDate", dateRange.from.toISOString());
    if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());
    window.open(`/api/v1/clients/export?${params.toString()}`, "_blank");
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    await createSavedSearch.mutateAsync({
      data: {
        name: saveSearchName,
        filters: {
          search: search || undefined,
          membershipStatus: membershipFilter === "all" ? undefined : membershipFilter,
          preset: presetFilter || undefined,
          startDate: dateRange?.from?.toISOString(),
          endDate: dateRange?.to?.toISOString(),
        } as SavedSearchInputFilters,
      },
    });
    setSaveDialogOpen(false);
    setSaveSearchName("");
  };

  const handleLoadSavedSearch = (savedSearch: any) => {
    const filters = savedSearch.filters as any;
    setSearch(filters.search || "");
    setMembershipFilter(filters.membershipStatus || "all");
    setPresetFilter(filters.preset || "");
    setDateRange(filters.startDate || filters.endDate ? {
      from: filters.startDate ? new Date(filters.startDate) : undefined,
      to: filters.endDate ? new Date(filters.endDate) : undefined,
    } : undefined);
    setPage(1);
  };

  const handleDeleteSavedSearch = async (id: number) => {
    await deleteSavedSearch.mutateAsync({ id });
  };

  const clearFilters = () => {
    setSearch("");
    setMembershipFilter("all");
    setPresetFilter("");
    setDateRange(undefined);
    setPage(1);
  };

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

        <div className="flex flex-col gap-4">
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
            <Select value={presetFilter} onValueChange={v => { setPresetFilter(v as ListClientsPreset | ""); setPage(1); }}>
              <SelectTrigger data-testid="select-preset-filter" className="w-48">
                <SelectValue placeholder="Preset filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No preset</SelectItem>
                {Object.entries(PRESET_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key as ListClientsPreset}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2"
            >
              <Filter size={14} />
              Advanced
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2"
            >
              <Download size={14} />
              Export
            </Button>
            {(search || membershipFilter !== "all" || presetFilter || dateRange) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="gap-2 text-muted-foreground"
              >
                <X size={14} />
                Clear
              </Button>
            )}
          </div>

          {showAdvancedFilters && (
            <div className="flex flex-col gap-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Date Range (Created)</label>
                <div className="flex gap-2">
                  <DateRangePresets
                    value={dateRange}
                    onChange={(range: { from?: Date; to?: Date } | undefined) => {
                      setDateRange(range);
                      setPage(1);
                    }}
                  />
                  <DateRangePicker
                    value={dateRange}
                    onChange={(range: { from?: Date; to?: Date } | undefined) => {
                      setDateRange(range);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {savedSearches && savedSearches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Saved Searches</label>
                  <div className="flex flex-wrap gap-2">
                    {savedSearches.map((savedSearch: any) => (
                      <div key={savedSearch.id} className="flex items-center gap-2 bg-background border rounded-md px-3 py-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLoadSavedSearch(savedSearch)}
                          className="h-6 text-xs"
                        >
                          {savedSearch.name}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSavedSearch(savedSearch.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-fit">
                    <Save size={14} />
                    Save Current Filters
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Search Filters</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="search-name">Search Name</Label>
                      <Input
                        id="search-name"
                        placeholder="e.g., Active members this month"
                        value={saveSearchName}
                        onChange={e => setSaveSearchName(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleSaveSearch} className="w-full">
                      Save Search
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
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
