import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/NotificationBell";
import {
  Bus,
  Map,
  User,
  LogOut,
  LayoutDashboard,
  Ticket,
  Route as RouteIcon,
  Shield
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();

  const isAdmin = profile?.role === "admin";
  const isDriver = user?.role === "driver";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 shadow-sm border-b border-gray-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          <div className="flex items-center gap-4 md:gap-8">
            <Link href="/" className="flex items-center gap-1.5 group">
              <div className="p-0.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 group-hover:border-blue-200 dark:group-hover:border-blue-500 transition-all overflow-hidden">
                <img src="/favicon.png" alt="Make We Go Logo" className="h-7 w-7 object-contain" />
              </div>
              <span className="text-base md:text-xl font-black text-gray-900 dark:text-white">
                Make We Go
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {user && (
                <>
                  <Link href="/dashboard">
                    <Button
                      variant={location === "/dashboard" ? "default" : "ghost"}
                      size="sm"
                      className="rounded-full font-semibold"
                    >
                      {isDriver ? 'Dashboard' : 'Find Ride'}
                    </Button>
                  </Link>
                  {isDriver ? (
                    <Link href="/driver/my-routes">
                      <Button
                        variant={location === "/driver/my-routes" ? "default" : "ghost"}
                        size="sm"
                        className="rounded-full font-semibold"
                      >
                        My Routes
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/my-rides">
                      <Button
                        variant={location === "/my-rides" ? "default" : "ghost"}
                        size="sm"
                        className="rounded-full font-semibold"
                      >
                        My Tickets
                      </Button>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/admin/console">
                      <Button
                        variant={location === "/admin/console" || location === "/admin" ? "default" : "ghost"}
                        size="sm"
                        className="rounded-full font-semibold"
                      >
                        <Shield className="w-4 h-4 mr-1" />
                        Admin
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <ThemeToggle />
                <NotificationBell />
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden md:flex items-center gap-2 rounded-full"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-semibold">{user.firstName || user.email}</span>
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full font-semibold"
                >
                  <LogOut className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Link href="/">
                <Button className="rounded-full bg-blue-600 hover:bg-blue-700 font-bold">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 z-50 safe-area-pb transition-colors">
          <div className={`grid ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} h-14`}>
            <Link
              href="/dashboard"
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${location === "/dashboard" ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-600 dark:text-gray-400"
                }`}
            >
              <Map className="w-5 h-5" />
              <span className="text-[10px] font-bold">{isDriver ? 'Dashboard' : 'Find Ride'}</span>
            </Link>
            {isDriver ? (
              <Link
                href="/driver/my-routes"
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${location === "/driver/my-routes" ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-600 dark:text-gray-400"
                  }`}
              >
                <RouteIcon className="w-5 h-5" />
                <span className="text-[10px] font-bold">My Routes</span>
              </Link>
            ) : (
              <Link
                href="/my-rides"
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${location === "/my-rides" ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-600 dark:text-gray-400"
                  }`}
              >
                <Ticket className="w-5 h-5" />
                <span className="text-[10px] font-bold">My Tickets</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin/console"
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${location === "/admin/console" || location === "/admin" ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-600 dark:text-gray-400"
                  }`}
              >
                <Shield className="w-5 h-5" />
                <span className="text-[10px] font-bold">Admin</span>
              </Link>
            )}
            <Link
              href="/profile"
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${location === "/profile" ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-gray-600 dark:text-gray-400"
                }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-bold">Profile</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
