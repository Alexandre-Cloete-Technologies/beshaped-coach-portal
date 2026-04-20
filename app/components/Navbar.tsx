"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Library,
  Dumbbell,
  ClipboardList,
} from "lucide-react";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={18} />, label: "Dashboard", href: "/" },
  { icon: <Users size={18} />, label: "Clients", href: "/clients" },
  { icon: <ClipboardList size={18} />, label: "Assessment", href: "/assessment" },
  { icon: <Calendar size={18} />, label: "Programs", href: "/programs" },
  { icon: <Library size={18} />, label: "Exercises", href: "/exercises" },
  { icon: <Dumbbell size={18} />, label: "Workouts", href: "/workouts" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex h-14 min-h-14 items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary">
            <Image
              src="/logotwo.png"
              alt="Company logo"
              width={36}
              height={36}
              className="h-auto w-full object-contain"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-tight text-foreground">BeShaped Fitness</p>
            <p className="text-xs text-muted-foreground">Coach Portal</p>
          </div>
        </Link>

        <nav className="min-w-0 flex-1 overflow-x-auto" aria-label="Main">
          <ul className="flex items-center justify-center gap-0.5 py-1 sm:gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.label} className="shrink-0">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-3 sm:text-sm ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {item.icon}
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 border-l border-border pl-4 sm:flex">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
            <span className="text-sm font-medium text-white">JC</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">Dewald</p>
            <p className="text-xs text-muted-foreground">Head Coach</p>
          </div>
        </div>
      </div>
    </header>
  );
}
