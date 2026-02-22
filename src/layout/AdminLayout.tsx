import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Users, 
  Database, 
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Brain,
  Upload,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Cleaned up admin menu - with AI Test Generator moved from Teacher
const adminMenuItems = [
  { 
    title: "Dashboard", 
    href: "/admin/dashboard", 
    icon: LayoutDashboard,
    description: "System overview" 
  },
  { 
    title: "User Management", 
    href: "/admin/users", 
    icon: Users,
    description: "Manage teachers" 
  },
  { 
    title: "Question Bank", 
    href: "/admin/question-bank", 
    icon: Database,
    description: "Full CRUD access" 
  },
  { 
    title: "Bulk Import", 
    href: "/admin/bulk-import", 
    icon: Upload,
    description: "Import questions" 
  },
  { 
    title: "AI Test Generator", 
    href: "/admin/generate-test", 
    icon: Sparkles,
    description: "Generate tests" 
  },
  { 
    title: "System Analytics", 
    href: "/admin/analytics", 
    icon: BarChart3,
    description: "Performance metrics" 
  },
];

const bottomMenuItems = [
  { 
    title: "Settings", 
    href: "/admin/settings", 
    icon: Settings,
    description: "System configuration" 
  },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar - Fixed position with secondary (Vivid Purple) dark theme */}
      <div 
        className={cn(
          "fixed top-0 left-0 flex flex-col h-screen bg-secondary border-r border-secondary/80 transition-all duration-300 z-50",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-secondary-foreground">Admin Panel</h1>
                <p className="text-xs text-secondary-foreground/60">System Management</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="shrink-0 text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {adminMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 group",
                  active 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-secondary-foreground/80 hover:bg-white/10 hover:text-secondary-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className={cn(
                      "text-xs truncate",
                      active ? "text-primary-foreground/80" : "text-secondary-foreground/50"
                    )}>
                      {item.description}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation */}
        <nav className="p-2 space-y-1 border-t border-white/10">
          {bottomMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  active 
                    ? "bg-primary text-primary-foreground" 
                    : "text-secondary-foreground/80 hover:bg-white/10 hover:text-secondary-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <div className="font-medium">{item.title}</div>}
              </Link>
            );
          })}
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 w-full text-secondary-foreground/80 hover:bg-white/10 hover:text-secondary-foreground"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!collapsed && <div className="font-medium">Sign Out</div>}
          </button>
        </nav>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-secondary-foreground truncate">{user?.email}</div>
                <div className="text-xs text-secondary-foreground/60">Administrator</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - with margin to account for fixed sidebar */}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300",
        collapsed ? "ml-16" : "ml-64"
      )}>
        {children}
      </main>
    </div>
  );
}
