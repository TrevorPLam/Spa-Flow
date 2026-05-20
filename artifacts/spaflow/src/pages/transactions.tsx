import { useState } from "react";
import { useListTransactions, getListTransactionsQueryKey } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";
import { format } from "date-fns";

const TYPE_COLORS: Record<string, "default" | "secondary" | "outline"> = {
  locker_rental: "secondary",
  room_rental: "default",
  membership: "default",
  product: "outline",
  renewal: "secondary",
  extension: "outline",
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();

  const { data, isLoading } = useListTransactions(
    { 
      page, 
      limit: 25,
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString(),
    },
    { query: { queryKey: getListTransactionsQueryKey({ page, limit: 25, startDate: dateRange?.from?.toISOString(), endDate: dateRange?.to?.toISOString() }) } }
  );

  const transactions = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt size={20} />Transactions</h1>
          <p className="text-sm text-muted-foreground">{total} total</p>
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
              <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No transactions yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Client</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Type</th>
                    <th className="text-left px-6 py-3 text-muted-foreground font-medium">Description</th>
                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Amount</th>
                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Tax</th>
                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Total</th>
                    <th className="text-right px-6 py-3 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map(t => (
                    <tr key={t.id} data-testid={`row-transaction-${t.id}`}>
                      <td className="px-6 py-3 font-medium">{t.clientName}</td>
                      <td className="px-6 py-3">
                        <Badge variant={TYPE_COLORS[t.type] ?? "outline"} className="text-xs capitalize">
                          {t.type.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground text-xs max-w-48 truncate">{t.description}</td>
                      <td className="px-6 py-3 text-right">${t.amount.toFixed(2)}</td>
                      <td className="px-6 py-3 text-right text-muted-foreground">${(t.tax ?? 0).toFixed(2)}</td>
                      <td className="px-6 py-3 text-right font-semibold">${(t.total ?? 0).toFixed(2)}</td>
                      <td className="px-6 py-3 text-right text-muted-foreground text-xs">
                        {format(new Date(t.createdAt), "MMM d, h:mm a")}
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
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
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
