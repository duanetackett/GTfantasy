"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TournamentDropdown, { type DropdownOption } from "@/components/TournamentDropdown";

const KNOWN_TOURNAMENTS = [
  "Florida Open",
  "Wisconsin Open",
  "Missouri Open",
  "Music City Open",
  "Carolina Clash",
  "Texas Holiday Classic",
  "World Championship",
];

const CURRENT_YEAR = 2026;
const YEARS = Array.from({ length: CURRENT_YEAR - 2024 + 1 }, (_, i) => CURRENT_YEAR - i);

type TournamentRecord = { id: string; name: string; year: number; status: string };

function tournamentLink(id: string, status: string): string | null {
  switch (status) {
    case "PICKS_OPEN":   return `/tournaments/${id}/picks`;
    case "PICKS_LOCKED": return `/tournaments/${id}/leaderboard`;
    case "COMPLETED":    return `/tournaments/${id}/leaderboard`;
    default:             return null;
  }
}

export default function TournamentSwitcher({
  tournaments,
  currentId,
}: {
  tournaments: TournamentRecord[];
  currentId: string;
}) {
  const router = useRouter();
  const current = tournaments.find((t) => t.id === currentId);

  const [selectedYear, setSelectedYear] = useState(current?.year ?? CURRENT_YEAR);
  const [selectedName, setSelectedName] = useState(current?.name ?? "");

  const lookup = new Map(tournaments.map((t) => [`${t.name}|${t.year}`, t]));

  const options: DropdownOption[] = KNOWN_TOURNAMENTS.map((name) => {
    const t = lookup.get(`${name}|${selectedYear}`);
    return {
      name,
      href: t ? tournamentLink(t.id, t.status) : null,
      status: t?.status ?? null,
    };
  });

  function handleYearChange(year: number) {
    setSelectedYear(year);
    if (selectedName) {
      const t = lookup.get(`${selectedName}|${year}`);
      const href = t ? tournamentLink(t.id, t.status) : null;
      if (href) {
        router.push(href);
        return;
      }
    }
    setSelectedName("");
  }

  function handleTournamentChange(name: string, href: string) {
    setSelectedName(name);
    router.push(href);
  }

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Year</label>
        <select
          value={selectedYear}
          onChange={(e) => handleYearChange(Number(e.target.value))}
          className="border border-white/20 rounded-md px-3 py-2 text-sm text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
        >
          {YEARS.map((y) => (
            <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tournament</label>
        <TournamentDropdown
          options={options}
          value={selectedName}
          onChange={handleTournamentChange}
        />
      </div>
    </div>
  );
}
