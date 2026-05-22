import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Merge, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DuplicateCandidate {
  primaryId: number;
  duplicateId: number;
  confidence: number;
  reason: string;
  matchingFields: string[];
}

interface AnomalyResult {
  clientId: number;
  type: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface ValidationResult {
  field: string;
  valid: boolean;
  error?: string;
  value: string | null;
}

export default function DataQualityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [validationResults, setValidationResults] = useState<Map<number, ValidationResult[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Manager-only access check
  if (user?.role !== "MANAGER") {
    return (
      <Layout>
        <div className="container mx-auto py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Data quality tools are only available to managers.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  async function loadDuplicates() {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/data-quality/duplicates");
      if (!response.ok) throw new Error("Failed to load duplicates");
      const data = await response.json();
      setDuplicates(data.duplicates || []);
    } catch (error) {
      toast({ title: "Failed to load duplicates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function loadAnomalies() {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/data-quality/anomalies");
      if (!response.ok) throw new Error("Failed to load anomalies");
      const data = await response.json();
      setAnomalies(data.anomalies || []);
    } catch (error) {
      toast({ title: "Failed to load anomalies", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function validateClient(clientId: number) {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/data-quality/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!response.ok) throw new Error("Failed to validate client");
      const data = await response.json();
      setValidationResults(new Map([[clientId, data.validation]]));
      setSelectedClientId(clientId);
    } catch (error) {
      toast({ title: "Failed to validate client", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function mergeClients(primaryId: number, duplicateId: number) {
    if (!confirm(`Merge client ${duplicateId} into client ${primaryId}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/clients/${primaryId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duplicateId }),
      });
      if (!response.ok) throw new Error("Failed to merge clients");
      await response.json();
      toast({ title: "Clients merged successfully" });
      // Reload duplicates to update the list
      loadDuplicates();
    } catch (error) {
      toast({ title: "Failed to merge clients", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function getSeverityColor(severity: "low" | "medium" | "high") {
    switch (severity) {
      case "low": return "bg-yellow-100 text-yellow-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "high": return "bg-red-100 text-red-800";
    }
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Data Quality</h1>
          <Button onClick={() => { loadDuplicates(); loadAnomalies(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="duplicates">
          <TabsList>
            <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="duplicates" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Potential Duplicate Clients</CardTitle>
              </CardHeader>
              <CardContent>
                {duplicates.length === 0 ? (
                  <p className="text-muted-foreground">No duplicates found. Click Refresh to scan.</p>
                ) : (
                  <div className="space-y-4">
                    {duplicates.map((dup) => (
                      <div key={`${dup.primaryId}-${dup.duplicateId}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Confidence: {(dup.confidence * 100).toFixed(0)}%</Badge>
                              <span className="text-sm text-muted-foreground">{dup.reason}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div>
                                <span className="font-medium">Primary:</span> {dup.primaryId}
                              </div>
                              <div>
                                <span className="font-medium">Duplicate:</span> {dup.duplicateId}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              {dup.matchingFields.map((field) => (
                                <Badge key={field} variant="secondary">{field}</Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => mergeClients(dup.primaryId, dup.duplicateId)}
                            disabled={loading}
                          >
                            <Merge className="h-4 w-4 mr-2" />
                            Merge
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anomalies" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Anomalies</CardTitle>
              </CardHeader>
              <CardContent>
                {anomalies.length === 0 ? (
                  <p className="text-muted-foreground">No anomalies found. Click Refresh to scan.</p>
                ) : (
                  <div className="space-y-4">
                    {anomalies.map((anomaly) => (
                      <div key={`${anomaly.clientId}-${anomaly.type}`} className="border rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={`h-5 w-5 ${
                            anomaly.severity === "high" ? "text-red-500" :
                            anomaly.severity === "medium" ? "text-orange-500" :
                            "text-yellow-500"
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">Client {anomaly.clientId}</span>
                              <Badge className={getSeverityColor(anomaly.severity)}>
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{anomaly.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">Type: {anomaly.type}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Data Validation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    placeholder="Enter client ID"
                    className="border rounded px-3 py-2 flex-1"
                    value={selectedClientId || ""}
                    onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
                  />
                  <Button onClick={() => selectedClientId && validateClient(selectedClientId)} disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    Validate
                  </Button>
                </div>

                {validationResults.size > 0 && (
                  <div className="space-y-4">
                    {Array.from(validationResults.entries()).map(([clientId, results]) => (
                      <div key={clientId} className="border rounded-lg p-4">
                        <h3 className="font-medium mb-3">Client {clientId}</h3>
                        <div className="space-y-2">
                          {results.map((result, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {result.valid ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-sm">
                                <span className="font-medium">{result.field}:</span> {result.value || "(empty)"}
                              </span>
                              {result.error && (
                                <span className="text-sm text-red-500">- {result.error}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
