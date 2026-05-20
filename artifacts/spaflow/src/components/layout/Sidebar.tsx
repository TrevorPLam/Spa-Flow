import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Lock,
  DoorOpen,
  ClipboardList,
  ShoppingBag,
  Receipt,
  UserCog,
  ScrollText,
  LogOut,
  Waves,
  Monitor,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/checkin", label: "Check In", icon: Waves },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/lockers", label: "Lockers", icon: Lock },
  { href: "/rooms", label: "Rooms", icon: DoorOpen },
  { href: "/waitlist", label: "Waitlist", icon: ClipboardList },
  { href: "/products", label: "Products", icon: ShoppingBag },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/sessions", label: "Sessions", icon: Monitor },
];

const managerItems = [
  { href: "/users", label: "Staff", icon: UserCog },
  { href: "/audit-logs", label: "Audit Logs", icon: ScrollText },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, isManager, logout } = useAuth();

  return (
    <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full shrink-0">
      <div className="px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Waves size={16} className="text-primary-foreground opacity-80" />
          </div>
          <div>
            <p className="text-sm font-semibold text-sidebar-foreground">SpaFlow</p>
            <p className="text-xs text-sidebar-foreground/50">Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              </li>
            );
          })}

          {isManager && (
            <>
              <li className="pt-4 pb-1">
                <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  Manager
                </p>
              </li>
              {managerItems.map(({ href, label, icon: Icon }) => {
                const active = location === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-sidebar-foreground">{user?.name}</p>
          <p className="text-xs text-sidebar-foreground/50">{user?.role}</p>
        </div>
        <button
          data-testid="button-logout"
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
