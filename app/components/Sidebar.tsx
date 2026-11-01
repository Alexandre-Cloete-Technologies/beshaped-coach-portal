"use client";

import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Library, 
  Dumbbell,
  ClipboardList,
  UtensilsCrossed,
  Languages
} from "lucide-react";
import Image from "next/image";
import SignedInUser from "./SignedInUser";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import type { Messages } from "@/lib/i18n/messages";

interface NavItem {
  icon: React.ReactNode;
  label: keyof Messages["nav"];
  href: string;
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: "dashboard", href: "/" },
  { icon: <Users size={20} />, label: "clients", href: "/clients" },
  { icon: <ClipboardList size={20} />, label: "assessment", href: "/assessment" },
  { icon: <Calendar size={20} />, label: "programs", href: "/programs" },
  { icon: <Library size={20} />, label: "exercises", href: "/exercises" },
  { icon: <Dumbbell size={20} />, label: "workouts", href: "/workouts" },
  { icon: <UtensilsCrossed size={20} />, label: "nutrition", href: "/nutrition" },
  // { icon: <CreditCard size={20} />, label: "Billing", href: "/billing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { locale, toggleLocale } = useLocale();
  const t = useMessages();
  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Logo Section */}
      <div className="p-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
        <Image
              src={"/logotwo.png"}
              alt="Company Logo"
              width={40}
              height={50}
              className="h-auto w-full object-contain"
            />
        </div>
        <div>
          <h1 className="font-semibold text-sidebar-foreground text-base">BeShaped Fitness</h1>
          <span className="text-xs text-muted-foreground">{t.coachPortal}</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.label}>
                <a
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-beshaped-dark-green dark:bg-blue-950/50 dark:text-blue-400"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {item.icon}
                  {t.nav[item.label]}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          type="button"
          onClick={toggleLocale}
          aria-label={locale === "en" ? t.switchToAfrikaans : t.switchToEnglish}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Languages size={20} />
          {locale === "en" ? "Afrikaans" : "English"}
        </button>
        {/* Settings */}
        {/* <a
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings size={20} />
          Settings
        </a> */}

        {/* User Profile */}
        <SignedInUser />
      </div>
    </aside>
  );
}
