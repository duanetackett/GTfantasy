"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { label: string; href: string };

export default function TournamentTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-6">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-green-700 text-white"
                : "bg-white/10 text-gray-200 hover:bg-white/20"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
