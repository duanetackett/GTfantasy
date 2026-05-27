"use client";

import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard";
  const onAdmin = pathname.startsWith("/admin");
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdmin = user?.publicMetadata?.role === "ADMIN";
  const displayName = user?.fullName || user?.firstName || "";

  const links = [
    ...(onDashboard ? [] : [{ label: "Dashboard", href: "/dashboard" }]),
    { label: "Rules", href: "/rules" },
    ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
    { label: "Account", href: "/account" },
  ];

  return (
    <div className="w-full relative px-4 py-3 text-xs text-gray-300">
      {/* Desktop nav */}
      <div className="hidden sm:flex justify-end items-center gap-4">
        {displayName && (
          <span className="text-gray-400">Logged in as <span className="text-white">{displayName}</span></span>
        )}
        <span className="text-gray-600">|</span>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-white transition">{l.label}</Link>
        ))}
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="hover:text-white transition cursor-pointer"
        >
          Log Out
        </button>
      </div>

      {/* Mobile nav */}
      <div className="flex sm:hidden items-center justify-between">
        <span className="text-gray-400 text-xs truncate max-w-[60%]">
          {displayName && (
            <><span className="text-gray-500">Hi, </span><span className="text-white">{displayName}</span></>
          )}
        </span>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="text-gray-300 hover:text-white transition p-1"
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 z-50 bg-slate-900/95 border-t border-white/10 shadow-xl">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block px-5 py-3 text-sm text-gray-200 hover:bg-white/10 hover:text-white transition border-b border-white/5"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => signOut({ redirectUrl: "/" })}
            className="w-full text-left px-5 py-3 text-sm text-red-400 hover:bg-white/10 hover:text-red-300 transition"
          >
            Log Out
          </button>
        </div>
      )}

      {/* Floating logo — hidden on dashboard and admin */}
      {!onDashboard && !onAdmin && (
        <div className="absolute top-full right-4 z-10 hidden sm:block">
          <a href="https://www.pegttour.com" target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pegt-logo.png"
              alt="PEGT Golden Tee Tour"
              width={180}
              height={180}
              className="hover:opacity-70 transition-opacity cursor-pointer"
            />
          </a>
        </div>
      )}
    </div>
  );
}
