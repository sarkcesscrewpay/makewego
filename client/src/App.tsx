import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import MyRides from "@/pages/MyRides";
import MyRoutes from "@/pages/MyRoutes";
import Admin from "@/pages/Admin";
import AdminConsole from "@/pages/AdminConsole";
import AdminLanding from "@/pages/AdminLanding";
import Landing from "@/pages/Landing";
import RegisterStaff from "@/pages/RegisterStaff";
import Signup from "@/pages/Signup";
import VerifyEmail from "@/pages/VerifyEmail";
import Profile from "@/pages/Profile";
import DriverRoutes from "@/pages/DriverRoutes";
import { Navigation } from "@/components/Navigation";
import OfflineIndicator from "@/components/OfflineIndicator";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";
import { useBackgroundRefresh } from "@/hooks/use-background-refresh";

// Protected Route Component - requires authentication
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

// Role-based Route Component - requires specific role
function RoleRoute({ children, allowedRoles }: { children: ReactNode; allowedRoles: Array<'passenger' | 'driver' | 'admin'> }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();
  useBackgroundRefresh();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {user && <Navigation />}
      <Switch>
        {/* Public routes */}
        <Route path="/login">
          {user ? <Redirect to="/dashboard" /> : <Login />}
        </Route>
        <Route path="/signup">
          {user ? <Redirect to="/dashboard" /> : <Signup />}
        </Route>

        {/* Email verification - public route */}
        <Route path="/verify-email">
          <VerifyEmail />
        </Route>

        {/* Landing page redirects to dashboard if logged in */}
        <Route path="/">
          {user ? <Redirect to="/dashboard" /> : <Login />}
        </Route>

        {/* Protected routes - require authentication */}
        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>

        <Route path="/my-rides">
          <ProtectedRoute>
            <MyRides />
          </ProtectedRoute>
        </Route>

        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>

        {/* Driver routes - requires driver role */}
        <Route path="/driver/routes">
          <RoleRoute allowedRoles={['driver']}>
            <DriverRoutes />
          </RoleRoute>
        </Route>

        <Route path="/driver/my-routes">
          <RoleRoute allowedRoles={['driver']}>
            <MyRoutes />
          </RoleRoute>
        </Route>

        {/* Admin routes - requires admin role */}
        <Route path="/admin">
          <AdminLanding />
        </Route>

        {/* Admin Console - full management dashboard */}
        <Route path="/admin/console">
          <RoleRoute allowedRoles={['admin']}>
            <AdminConsole />
          </RoleRoute>
        </Route>

        {/* Staff Registration */}
        <Route path="/admin/register-staff">
          <RoleRoute allowedRoles={['admin']}>
            <RegisterStaff />
          </RoleRoute>
        </Route>

        {/* Secret Admin Access - unique URL for secure access */}
        <Route path="/mwg-ctrl-x9k72">
          <RoleRoute allowedRoles={['admin']}>
            <AdminConsole />
          </RoleRoute>
        </Route>

        {/* 404 Not Found */}
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
        storageKey="bus-connect-theme"
      >
        <TooltipProvider>
          <Router />
          <Toaster />
          <OfflineIndicator />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
