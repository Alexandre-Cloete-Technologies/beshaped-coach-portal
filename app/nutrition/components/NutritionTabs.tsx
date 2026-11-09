"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMessages } from "@/lib/i18n/LocaleProvider";

export default function NutritionTabs() {
  const pathname = usePathname();
  const copy = useMessages().nutrition;
  const tabs = [
    { href: "/nutrition", label: copy.plansTab, active: pathname === "/nutrition" },
    { href: "/nutrition/meals", label: copy.mealsTab, active: pathname.startsWith("/nutrition/meals") },
  ];

  return (
    <nav aria-label={copy.sections} className="mb-6 flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            tab.active
              ? "border-beshaped-dark-green text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
