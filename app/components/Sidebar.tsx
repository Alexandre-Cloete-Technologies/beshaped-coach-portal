"use client";

import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Library, 
  CreditCard, 
  Settings,
  Dumbbell
} from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: "Dashboard", href: "/" },
  { icon: <Users size={20} />, label: "Clients", href: "/clients" },
  { icon: <Calendar size={20} />, label: "Programs", href: "/programs" },
  { icon: <Library size={20} />, label: "Exercises", href: "/exercises" },
  // { icon: <CreditCard size={20} />, label: "Billing", href: "/billing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo Section */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Dumbbell className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-sidebar-foreground text-base">BeShaped Fitness</h1>
          <span className="text-xs text-muted-foreground">Coach Portal</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border">
        {/* Settings */}
        {/* <a
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings size={20} />
          Settings
        </a> */}

        {/* User Profile */}
        <div className="flex items-center gap-3 px-3 py-3 mt-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <span className="text-white text-sm font-medium">JC</span>
          </div>
          <div>
            <p className="text-sm font-medium text-sidebar-foreground">Dewald</p>
            <p className="text-xs text-muted-foreground">Head Coach</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
