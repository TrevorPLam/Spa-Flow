import { useState } from "react";
import { useListAuditLogs, getListAuditLogsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DateRangePicker, DateRangePresets } from "@/components/ui/date-range-picker";
import { ScrollText, Search } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

export default function AuditLogsPage() {
  const { isManager } = useAuth();
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();

  const { data, isLoading } = useListAuditLogs(
    { 
      page, 
      limit: 50, 
      action: actionFilter || undefined,
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString(),
    },
    { query: { queryKey: getListAuditLogsQueryKey({ page, limit: 50, action: actionFilter || undefined, startDate: dateRange?.from?.toISOString(), endDate: dateRange?.to?.toISOString() }) } }
  );

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  if (!isManager) {
    return <Layout><div className="p-8 text-muted-foreground">Access denied — manager role required</div></Layout>;
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText size={20} />Audit Logs</h1>
            <p className="text-sm text-muted-foreground">{total} entries</p>
          </div>
          <div className="relative w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="input-action-filter"
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <DateRangePresets 
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
          />
          <DateRangePicker 
            value={dateRange}
            onChange={(range) => {
              setDateRange(range);
              setPage(1);
            }}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No audit logs yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Action</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Resource</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Description</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">User</th>
                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map(log => (
                    <tr key={log.id} data-testid={`row-audit-${log.id}`}>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground capitalize">
                        {log.resourceType}{log.resourceId ? ` #${log.resourceId}` : ""}
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs max-w-64 truncate">{log.description}</td>
                      <td className="px-6 py-3 font-medium">{log.userName}</td>
                      <td className="px-6 py-3 text-right text-muted-foreground text-xs">
                        {format(new Date(log.createdAt), "MMM d, h:mm a")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
