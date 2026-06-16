"use client";

import { useState, useEffect } from "react";
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

export default function TournamentSelector({ tournaments, hasReplacedPicks }: { tournaments: TournamentRecord[]; hasReplacedPicks: boolean }) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [selectedName, setSelectedName] = useState("");

  useEffect(() => {
    setSelectedName("");
  }, [selectedYear]);

  const lookup = new Map(tournaments.map((t) => [`${t.name.toLowerCase()}|${t.year}`, t]));

  const options: DropdownOption[] = KNOWN_TOURNAMENTS.map((name) => {
    const t = lookup.get(`${name.toLowerCase()}|${selectedYear}`);
    return {
      name,
      href: t ? tournamentLink(t.id, t.status) : null,
      status: t?.status ?? null,
    };
  });

  function handleChange(name: string, href: string) {
    setSelectedName(name);
    router.push(href);
  }

  const openTournament = tournaments.find((t) => t.status === "PICKS_OPEN");
  const lockedTournament = !openTournament ? tournaments.find((t) => t.status === "PICKS_LOCKED") : null;

  return (
    <div className="flex flex-col items-center w-full max-w-md">
      {openTournament && hasReplacedPicks && (
        <div className="w-full mb-3 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800">
          <span className="text-lg leading-none mt-0.5">⚠️</span>
          <p>
            <strong>One or more of your picks were replaced</strong> due to a golfer withdrawal.{" "}
            <a href={`/tournaments/${openTournament.id}/picks`} className="underline font-semibold hover:text-amber-900">
              Review your picks →
            </a>
          </p>
        </div>
      )}
      {openTournament && (
        <div className="w-full mb-8 bg-green-900/50 border border-green-500/50 rounded-xl px-6 py-4 text-center">
          <p className="text-green-300 text-sm font-semibold uppercase tracking-wide mb-1">Picks Open</p>
          <p className="text-white text-lg font-bold mb-3">{openTournament.year} {openTournament.name}</p>
          <a
            href={`/tournaments/${openTournament.id}/picks`}
            className="inline-block bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-6 py-2 rounded-lg transition"
          >
            Make or Edit your Picks →
          </a>
        </div>
      )}
      {lockedTournament && (
        <div className="w-full mb-8 bg-amber-900/40 border border-amber-500/50 rounded-xl px-6 py-4 text-center">
          <p className="text-white text-lg font-bold mb-3">{lockedTournament.year} {lockedTournament.name}</p>
          <a
            href={`/tournaments/${lockedTournament.id}/leaderboard`}
            className="inline-block bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-6 py-2 rounded-lg transition"
          >
            Results →
          </a>
        </div>
      )}

    <div className="w-full border border-purple-400/40 rounded-xl bg-purple-800/20">
      <div className="bg-purple-600/25 border-b border-purple-400/40 px-6 py-3 text-center rounded-t-xl">
        <p className="text-white text-base font-bold uppercase tracking-widest">View Past Tournaments</p>
      </div>
      <div className="px-4 py-6 flex flex-row gap-3 items-end justify-center flex-wrap">
        {/* Year dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide text-center">
            Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border border-white/20 rounded-lg px-3 py-2 text-sm text-white bg-white/10 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
          >
            {YEARS.map((y) => (
              <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>
            ))}
          </select>
        </div>

        {/* Tournament custom dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-300 uppercase tracking-wide text-center">
            Tournament
          </label>
          <TournamentDropdown
            options={options}
            value={selectedName}
            onChange={handleChange}
          />
        </div>
      </div>
    </div>
    </div>
  );
}
