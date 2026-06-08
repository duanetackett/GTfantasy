"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption = {
  name: string;
  href: string | null;
  status: string | null; // e.g. "COMPLETED", "PICKS_OPEN", "PICKS_LOCKED", "UPCOMING", or null
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === "UPCOMING") {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-600/50 text-gray-400">
        Upcoming
      </span>
    );
  }
  switch (status) {
    case "PICKS_OPEN":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium">
          Open
        </span>
      );
    case "PICKS_LOCKED":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
          In Progress
        </span>
      );
    case "COMPLETED":
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/40 text-gray-300 font-medium">
          Completed
        </span>
      );
    default:
      return null;
  }
}

export default function TournamentDropdown({
  options,
  value,
  onChange,
  placeholder = "Select a tournament…",
}: {
  options: DropdownOption[];
  value: string;
  onChange: (name: string, href: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 320);
    }
    setOpen((o) => !o);
  }

  const selected = options.find((o) => o.name === value);

  return (
    <div ref={ref} className="relative min-w-[220px]">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 border border-white/20 rounded-lg px-3 py-2 bg-white/10 text-sm text-white hover:bg-white/15 transition focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <span className={selected ? "text-white" : "text-gray-400"}>
          {selected ? selected.name : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel — opens upward if not enough space below */}
      {open && (
        <div className={`absolute z-50 w-full rounded-lg border border-white/10 bg-slate-800 shadow-xl ${openUpward ? "bottom-full mb-1" : "top-full mt-1"}`}>
          {options.map((opt) => {
            const available = !!opt.href;
            return (
              <button
                key={opt.name}
                type="button"
                disabled={!available}
                onClick={() => {
                  if (available) {
                    onChange(opt.name, opt.href!);
                    setOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left transition ${
                  available
                    ? "text-white hover:bg-white/10 cursor-pointer"
                    : "text-gray-500 cursor-not-allowed"
                } ${opt.name === value ? "bg-green-700/30" : ""}`}
              >
                <span>{opt.name}</span>
                <StatusBadge status={opt.status ?? null} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
