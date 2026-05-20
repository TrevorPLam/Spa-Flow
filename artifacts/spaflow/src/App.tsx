import React from "react";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import CheckInPage from "@/pages/checkin";
import ClientsPage from "@/pages/clients";
import ClientDetailPage from "@/pages/client-detail";
import ClientNewPage from "@/pages/client-new";
import LockersPage from "@/pages/lockers";
import RoomsPage from "@/pages/rooms";
import WaitlistPage from "@/pages/waitlist";
import ProductsPage from "@/pages/products";
import TransactionsPage from "@/pages/transactions";
import UsersPage from "@/pages/users";
import AuditLogsPage from "@/pages/audit-logs";
import SessionsPage from "@/pages/sessions";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function ErrorFallback({ error }: FallbackProps) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-bold text-destructive mb-2">Something went wrong</h2>
        <p className="text-sm text-muted-foreground mb-4">
          An unexpected error occurred. Please refresh the page or try again later.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
              Error details
            </summary>
            <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-48">
              {errorMessage}
            </pre>
          </details>
        )}
        <button
          onClick={() => window.location.reload()}
          className="mt-4 w-full bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: () => React.ReactElement | null }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/checkin" component={() => <ProtectedRoute component={CheckInPage} />} />
      <Route path="/clients/new" component={() => <ProtectedRoute component={ClientNewPage} />} />
      <Route path="/clients/:id" component={() => <ProtectedRoute component={ClientDetailPage} />} />
      <Route path="/clients" component={() => <ProtectedRoute component={ClientsPage} />} />
      <Route path="/lockers" component={() => <ProtectedRoute component={LockersPage} />} />
      <Route path="/rooms" component={() => <ProtectedRoute component={RoomsPage} />} />
      <Route path="/waitlist" component={() => <ProtectedRoute component={WaitlistPage} />} />
      <Route path="/products" component={() => <ProtectedRoute component={ProductsPage} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={TransactionsPage} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route path="/audit-logs" component={() => <ProtectedRoute component={AuditLogsPage} />} />
      <Route path="/sessions" component={() => <ProtectedRoute component={SessionsPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
