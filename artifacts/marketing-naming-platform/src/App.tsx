import React from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

// Pages to create next
import Login from "@/pages/login";
import Register from "@/pages/register";
import Generator from "@/pages/generator";
import Dimensions from "@/pages/dimensions";
import Outputs from "@/pages/outputs";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isReady } = useAuth();
  
  if (!isReady) return null; // or loading spinner
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  const { isAuthenticated, isReady } = useAuth();
  const [location] = useLocation();

  if (!isReady) return null;

  if (isAuthenticated && (location === "/login" || location === "/register")) {
    return <Redirect to="/generator" />;
  }

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/">
        {() => <ProtectedRoute component={Generator} />}
      </Route>
      <Route path="/generator">
        {() => <ProtectedRoute component={Generator} />}
      </Route>
      <Route path="/dimensions">
        {() => <ProtectedRoute component={Dimensions} />}
      </Route>
      <Route path="/outputs">
        {() => <ProtectedRoute component={Outputs} />}
      </Route>
      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
