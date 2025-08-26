import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import ClaimsIntake from "@/pages/claims-intake";
import ManagerDashboard from "@/pages/manager-dashboard";
import { Button } from "@/components/ui/button";
import { University, FileText, Users } from "lucide-react";
import { Link, useLocation } from "wouter";

function Navigation() {
  const [location] = useLocation();

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
            <Link href="/" data-testid="link-claims-intake">
              <Button 
                variant={location === "/" ? "default" : "ghost"}
                size="sm"
                className="flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Claims Intake</span>
              </Button>
            </Link>
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
          </nav>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">Claims Manager Dashboard</span>
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <Users className="text-muted-foreground text-sm h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={ClaimsIntake} />
      <Route path="/dashboard" component={ManagerDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
