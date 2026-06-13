"use client";

import { useState } from "react";

type SummaryEntry = {
  id: string;
  entryName: string;
  totalPoints: number | null;
  tournamentId: string;
  tournament: { id: string; name: string; year: number };
  rank: string;
  totalEntries: number;
};

function RankBadge({ rank, total }: { rank: string; total: number }) {
  const num = parseInt(rank.replace("T", ""));
  let bg = "bg-gray-100 text-gray-900";
  if (num === 1) bg = "bg-amber-400 text-gray-900";
  else if (num === 2) bg = "bg-slate-300 text-gray-900";
  else if (num === 3) bg = "bg-amber-700/80 text-amber-100";
  else if (num <= Math.ceil(total * 0.25)) bg = "bg-green-100 text-gray-900";

  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${bg}`}>
      {rank}
      <span className="font-normal">/{total}</span>
    </span>
  );
}

export default function MySummary({ entries }: { entries: SummaryEntry[] }) {
  const [open, setOpen] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="w-full max-w-md mt-8">
      {/* Header / toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-900 via-green-900 to-teal-900 border border-emerald-500/30 shadow-lg hover:brightness-110 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <span className="text-white font-bold text-sm uppercase tracking-widest">My Summary</span>
          <span className="text-emerald-400 text-xs font-medium">({entries.length} {entries.length === 1 ? "entry" : "entries"})</span>
        </div>
        <span className={`text-emerald-400 text-sm transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="mt-1 rounded-xl overflow-hidden border border-emerald-500/20 shadow-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-emerald-950 to-teal-950 text-xs font-semibold uppercase tracking-wide">
                <th className="text-left px-4 py-2.5 text-emerald-300">Tournament</th>
                <th className="text-left px-3 py-2.5 text-emerald-300">Entry</th>
                <th className="text-center px-3 py-2.5 text-emerald-300">Score</th>
                <th className="text-center px-3 py-2.5 text-emerald-300">Finish</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={`transition ${i % 2 === 0 ? "bg-slate-900/80" : "bg-slate-800/80"} hover:bg-emerald-950/60`}
                >
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-white text-xs leading-tight">{entry.tournament.name}</div>
                    <div className="text-emerald-500 text-xs">{entry.tournament.year}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-300 text-xs">{entry.entryName}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-white">{entry.totalPoints}</td>
                  <td className="px-3 py-2.5 text-center">
                    <RankBadge rank={entry.rank} total={entry.totalEntries} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
