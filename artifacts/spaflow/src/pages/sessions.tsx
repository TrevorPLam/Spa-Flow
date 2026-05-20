import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Monitor, LogOut, ShieldAlert, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Session {
  id: number;
  userId: number;
  createdAt: string;
  expiresAt: string;
  userAgent: string | null;
  isCurrent: boolean;
}

export default function SessionsPage() {
  const { user, isManager, refreshToken } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState<number | null>(null);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/v1/auth/sessions", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch sessions");
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load sessions",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeSession = async (sessionId: number) => {
    try {
      setIsRevoking(sessionId);
      const response = await fetch(`/api/v1/auth/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to revoke session");
      toast({
        title: "Session revoked",
        description: "The session has been successfully revoked",
      });
      await fetchSessions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revoke session",
      });
    } finally {
      setIsRevoking(null);
    }
  };

  const revokeAllSessions = async () => {
    try {
      const response = await fetch("/api/v1/auth/sessions", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) throw new Error("Failed to revoke sessions");
      toast({
        title: "All sessions revoked",
        description: "All other sessions have been successfully revoked",
      });
      await fetchSessions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to revoke sessions",
      });
    }
  };

  useState(() => {
    fetchSessions();
  });

  const activeSessions = sessions.filter(s => !s.isCurrent);
  const currentSession = sessions.find(s => s.isCurrent);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Monitor size={20} />Active Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Manage your active sessions across devices
          </p>
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Revoking a session will immediately sign out that device. Your current session will remain active.
          </AlertDescription>
        </Alert>

        {currentSession && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge variant="default" className="text-xs">Current Session</Badge>
                This Device
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Current Device</p>
                  <p className="text-xs text-muted-foreground mb-1">
                    Session ID: {currentSession.id}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created {format(new Date(currentSession.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {format(new Date(currentSession.expiresAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <Button variant="outline" size="sm" disabled>
                  <LogOut className="w-4 h-4 mr-2" />
                  Cannot Revoke
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Other Sessions ({activeSessions.length})</CardTitle>
              {activeSessions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={revokeAllSessions}
                  disabled={isRevoking !== null}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Revoke All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No other active sessions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{session.userAgent || "Unknown Device"}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(session.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Expires {format(new Date(session.expiresAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeSession(session.id)}
                      disabled={isRevoking === session.id}
                    >
                      {isRevoking === session.id ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4 mr-2" />
                      )}
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
