import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetMe, useGetDashboardStats } from "@workspace/api-client-react";
import { 
  LogOut, 
  Settings, 
  Layers, 
  FileOutput, 
  Wand2, 
  User,
  PanelLeftClose,
  PanelLeftOpen,
  Archive
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe();
  const { data: stats } = useGetDashboardStats();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background w-full overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${isSidebarOpen ? "w-64" : "w-16"} transition-all duration-300 ease-in-out flex flex-col border-r bg-card text-card-foreground shrink-0 z-10 sticky top-0 h-[100dvh]`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b shrink-0">
          {isSidebarOpen && (
            <div className="font-mono font-bold tracking-tight text-primary flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">
                N
              </div>
              <span className="truncate">NAMING</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 ml-auto"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <nav className="space-y-1 px-2">
            <NavItem 
              href="/generator" 
              icon={<Wand2 className="h-4 w-4" />} 
              label="Generator" 
              isSidebarOpen={isSidebarOpen} 
            />
            <NavItem 
              href="/dimensions" 
              icon={<Layers className="h-4 w-4" />} 
              label="Dimensions" 
              isSidebarOpen={isSidebarOpen} 
            />
            <NavItem 
              href="/outputs" 
              icon={<FileOutput className="h-4 w-4" />} 
              label="Outputs" 
              isSidebarOpen={isSidebarOpen} 
            />
            <NavItem 
              href="/stok" 
              icon={<Archive className="h-4 w-4" />} 
              label="StoK" 
              isSidebarOpen={isSidebarOpen} 
            />
            <NavItem 
              href="/settings" 
              icon={<Settings className="h-4 w-4" />} 
              label="Settings" 
              isSidebarOpen={isSidebarOpen} 
            />
          </nav>

          {isSidebarOpen && stats && (
            <div className="mt-8 px-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Workspace
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-mono">{stats.enabledDimensions}/{stats.totalDimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outputs</span>
                  <span className="font-mono">{stats.enabledOutputs}/{stats.totalOutputs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Values</span>
                  <span className="font-mono">{stats.totalValues}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-medium truncate">{user?.teamName || "Team"}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="shrink-0 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavItem({ href, icon, label, isSidebarOpen }: { href: string; icon: React.ReactNode; label: string; isSidebarOpen: boolean }) {
  const [location] = useLocation();
  
  // Handle root and /generator both matching the generator tab
  const isActive = location === href || (href === "/generator" && location === "/");

  return (
    <Link href={href}>
      <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer group ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
        <div className={isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}>
          {icon}
        </div>
        {isSidebarOpen && (
          <span className="truncate">{label}</span>
        )}
      </div>
    </Link>
  );
}
