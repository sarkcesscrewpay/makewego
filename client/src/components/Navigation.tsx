import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { 
  Bus, 
  Map, 
  Calendar, 
  User, 
  LogOut,
  LayoutDashboard,
  Ticket
} from "lucide-react";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: profile } = useProfile();
  
  const isAdmin = profile?.role === "admin";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Bus className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold font-display text-gray-900 tracking-tight">
                Make We Go
              </span>
            </Link>
            
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {user && (
                <>
                  <NavLink href="/dashboard" active={location === "/dashboard"} icon={<Map className="w-4 h-4 mr-2" />}>
                    Find Ride
                  </NavLink>
                  <NavLink href="/my-rides" active={location === "/my-rides"} icon={<Ticket className="w-4 h-4 mr-2" />}>
                    My Tickets
                  </NavLink>
                  {isAdmin && (
                    <NavLink href="/admin" active={location.startsWith("/admin")} icon={<LayoutDashboard className="w-4 h-4 mr-2" />}>
                      Admin
                    </NavLink>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center text-sm font-medium text-gray-700">
                  <User className="w-4 h-4 mr-2 text-primary" />
                  {user.firstName || user.email}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => logout()}
                  className="text-gray-500 hover:text-red-500 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button onClick={() => window.location.href = "/api/login"} className="btn-primary">
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, children, icon }: { href: string; active: boolean; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Link 
      href={href} 
      className={`
        inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 transition-colors duration-200
        ${active 
          ? "border-primary text-gray-900" 
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"}
      `}
    >
      {icon}
      {children}
    </Link>
  );
}
