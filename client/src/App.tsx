import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import ClaimsIntake from "@/pages/claims-intake";
import ManagerDashboard from "@/pages/manager-dashboard";
import Login from "@/pages/login";
import { Button } from "@/components/ui/button";
import { University, FileText, Users, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";

function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) return null;

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <University className="text-primary text-xl h-6 w-6" />
              <h1 className="text-xl font-semibold text-foreground">Claims Lifecycle</h1>
            </div>
            <span className="text-sm text-muted-foreground">UK Banking Section 75 Protection</span>
          </div>
          
          <nav className="flex items-center space-x-1">
            {user?.role === "Customer" && (
              <Link href="/claims" data-testid="link-claims-intake">
                <Button 
                  variant={location === "/claims" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Submit Claim</span>
                </Button>
              </Link>
            )}
            {user?.role === "Claim Processor" && (
              <Link href="/dashboard" data-testid="link-manager-dashboard">
                <Button 
                  variant={location === "/dashboard" ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Manager Dashboard</span>
                </Button>
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              {user?.username} ({user?.role})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="flex items-center space-x-2"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      {user?.role === "Customer" && (
        <>
          <Route path="/" component={() => <ClaimsIntake />} />
          <Route path="/claims" component={() => <ClaimsIntake />} />
        </>
      )}
      {user?.role === "Claim Processor" && (
        <>
          <Route path="/" component={() => <ManagerDashboard />} />
          <Route path="/dashboard" component={() => <ManagerDashboard />} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Router />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
