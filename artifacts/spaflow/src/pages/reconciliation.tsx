import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateRangePresets } from "@/components/ui/date-range-picker";
import { RefreshCw, Calendar, CheckCircle, AlertTriangle, DollarSign, Play } from "lucide-react";
import { format } from "date-fns";
import { useGetReconciliationHistory, getGetReconciliationHistoryQueryKey, useRunReconciliation, type ReconciliationResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ReconciliationPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Check if user is manager
  if (user?.role !== "MANAGER") {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Payment reconciliation is only available to managers.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  // Fetch reconciliation history
  const { data: reconciliationData, isLoading, refetch } = useGetReconciliationHistory(
    {
      startDate: dateRange?.from?.toISOString(),
      endDate: dateRange?.to?.toISOString(),
    },
    { query: { queryKey: getGetReconciliationHistoryQueryKey({ startDate: dateRange?.from?.toISOString(), endDate: dateRange?.to?.toISOString() }) } }
  );

  // Manual reconciliation trigger
  const runReconciliation = useRunReconciliation();

  const handleManualRun = async () => {
    const dateToRun = selectedDate || new Date();
    runReconciliation.mutate(
      { data: { date: dateToRun.toISOString() } },
      {
        onSuccess: () => {
          toast({ title: "Reconciliation completed successfully" });
          queryClient.invalidateQueries({ queryKey: getGetReconciliationHistoryQueryKey() });
        },
        onError: () => {
          toast({ title: "Reconciliation failed", variant: "destructive" });
        },
      }
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const hasDiscrepancies = reconciliationData?.data?.some((r: ReconciliationResult) => r.status === "discrepancy");

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign size={20} />
              Payment Reconciliation
            </h1>
            <p className="text-sm text-muted-foreground">Manager-only payment reconciliation dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangePresets
              value={dateRange}
              onChange={(range) => {
                setDateRange(range);
              }}
            />
            <Button onClick={() => refetch()} disabled={isLoading} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {reconciliationData?.data && reconciliationData.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Internal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    reconciliationData.data.reduce((sum: number, r: ReconciliationResult) => sum + (r.totalInternal || 0), 0)
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Square</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    reconciliationData.data.reduce((sum: number, r: ReconciliationResult) => sum + (r.totalSquare || 0), 0)
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Matched Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reconciliationData.data.filter((r: ReconciliationResult) => r.status === "matched").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of {reconciliationData.data.length} days
                </p>
              </CardContent>
            </Card>
            <Card className={hasDiscrepancies ? "border-destructive" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Discrepancies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reconciliationData.data.filter((r: ReconciliationResult) => r.status === "discrepancy").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  days with issues
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Manual Trigger */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Play size={14} />
              Manual Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="date"
                  value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : undefined)}
                  className="px-3 py-2 border border-border rounded-md text-sm bg-background"
                />
              </div>
              <Button
                onClick={handleManualRun}
                disabled={runReconciliation.isPending}
                size="sm"
              >
                <Play className="w-4 h-4 mr-2" />
                {runReconciliation.isPending ? "Running..." : "Run Reconciliation"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Leave date empty to reconcile today, or select a specific date to re-run reconciliation.
            </p>
          </CardContent>
        </Card>

        {/* Reconciliation Results */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="text-muted-foreground">Loading reconciliation data...</div>
          </div>
        ) : reconciliationData?.data && reconciliationData.data.length > 0 ? (
          <div className="space-y-4">
            {reconciliationData.data.map((result: ReconciliationResult) => {
              const totalDiscrepancies =
                (result.discrepancies?.missingInSquare?.length || 0) +
                (result.discrepancies?.missingInInternal?.length || 0) +
                (result.discrepancies?.amountMismatches?.length || 0);

              return (
                <Card key={result.date} className={result.status === "discrepancy" ? "border-destructive" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Calendar size={14} />
                        {format(new Date(result.date), "MMM dd, yyyy")}
                      </CardTitle>
                      <Badge
                        variant={result.status === "matched" ? "default" : "destructive"}
                        className="flex items-center gap-1"
                      >
                        {result.status === "matched" ? (
                          <>
                            <CheckCircle size={12} />
                            Matched
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} />
                            Discrepancy
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Internal Total</p>
                        <p className="text-lg font-semibold">{formatCurrency(result.totalInternal || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Square Total</p>
                        <p className="text-lg font-semibold">{formatCurrency(result.totalSquare || 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Difference</p>
                        <p className={`text-lg font-semibold ${Math.abs((result.totalInternal || 0) - (result.totalSquare || 0)) > 0.01 ? "text-destructive" : "text-foreground"}`}>
                          {formatCurrency(Math.abs((result.totalInternal || 0) - (result.totalSquare || 0)))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Discrepancies</p>
                        <p className={`text-lg font-semibold ${totalDiscrepancies > 0 ? "text-destructive" : "text-foreground"}`}>
                          {totalDiscrepancies}
                        </p>
                      </div>
                    </div>

                    {totalDiscrepancies > 0 && (
                      <div className="space-y-2 border-t pt-4">
                        {(result.discrepancies?.missingInSquare?.length || 0) > 0 && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-1">
                              Missing in Square ({result.discrepancies?.missingInSquare?.length})
                            </p>
                            <ul className="text-xs space-y-1">
                              {result.discrepancies?.missingInSquare?.map((d: any, i: number) => (
                                <li key={i} className="text-muted-foreground">
                                  Payment ID: {d.paymentId} - {formatCurrency(d.amount)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(result.discrepancies?.missingInInternal?.length || 0) > 0 && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-1">
                              Missing in Internal ({result.discrepancies?.missingInInternal?.length})
                            </p>
                            <ul className="text-xs space-y-1">
                              {result.discrepancies?.missingInInternal?.map((d: any, i: number) => (
                                <li key={i} className="text-muted-foreground">
                                  Square Payment: {d.squarePaymentId} - {formatCurrency(d.amount)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(result.discrepancies?.amountMismatches?.length || 0) > 0 && (
                          <div>
                            <p className="text-xs font-medium text-destructive mb-1">
                              Amount Mismatches ({result.discrepancies?.amountMismatches?.length})
                            </p>
                            <ul className="text-xs space-y-1">
                              {result.discrepancies?.amountMismatches?.map((d: any, i: number) => (
                                <li key={i} className="text-muted-foreground">
                                  Payment {d.paymentId}: Internal {formatCurrency(d.internalAmount)} vs Square {formatCurrency(d.squareAmount)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12">
              <div className="text-center text-muted-foreground">
                No reconciliation data available for the selected date range.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
