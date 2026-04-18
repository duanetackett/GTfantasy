"use client";

import { useState } from "react";

type Golfer = { id: string; name: string; qualifyingRank: number | null; qualifyingBracket: string | null; finalScore: number | null; finalPosition: number | null };
type Pick = { golfer: Golfer; group: { groupNumber: number } };
type User = { id: string; name: string };
type Entry = { id: string; entryName: string; totalPoints: number | null; disqualified: boolean; user: User | null; picks: Pick[] };
type Group = { id: string; groupNumber: number };

const GROUP_COLORS = ["bg-white", "bg-gray-100"];

function getRank(entry: Entry, allEntries: Entry[], scoresCalculated: boolean): string {
  if (!scoresCalculated || entry.totalPoints === null) return "—";
  const sorted = allEntries
    .filter((e) => e.totalPoints !== null)
    .sort((a, b) => (a.totalPoints ?? 999) - (b.totalPoints ?? 999));
  if (sorted.findIndex((e) => e.id === entry.id) === -1) return "—";
  const rank = sorted.findIndex((e) => e.totalPoints === entry.totalPoints) + 1;
  const isTied = sorted.filter((e) => e.totalPoints === entry.totalPoints).length > 1;
  return isTied ? `T${rank}` : `${rank}`;
}

export default function LeaderboardTable({
  entries,
  allEntries,
  groups,
  scoresCalculated,
  payouts = {},
  highlight = false,
  currentUserId,
  disqualified = false,
}: {
  entries: Entry[];
  allEntries: Entry[];
  groups: Group[];
  scoresCalculated: boolean;
  payouts?: Record<string, number>;
  highlight?: boolean;
  currentUserId?: string;
  disqualified?: boolean;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">No entries yet.</p>;
  }

  // Number of visible columns on mobile: Rank + Player + Total + (Prize if scoresCalculated)
  const mobileColSpan = scoresCalculated ? 4 : 3;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="text-sm border-collapse min-w-full">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <th className="text-center px-2 py-3 w-10 sticky left-0 bg-gray-100 z-10">Rank</th>
            <th className="text-center px-3 py-3 w-32 sticky left-10 bg-gray-100 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">Player</th>
            <th className="text-center px-2 py-3 w-14 font-bold text-gray-700">Total</th>
            {scoresCalculated && <th className="text-center px-2 py-3 w-16 text-green-700">Prize</th>}
            {groups.map((g, gIdx) => (
              <th key={g.id} className={`hidden sm:table-cell text-center px-1 py-3 w-24 ${GROUP_COLORS[gIdx % 2]}`}>G{g.groupNumber}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry, i) => {
            const isOwn = entry.user?.id === currentUserId;
            const rowBg = highlight || isOwn ? "bg-green-50" : i % 2 === 0 ? "bg-white" : "bg-gray-50";
            const isExpanded = expandedIds.has(entry.id);
            const picksByGroup: Record<number, Pick> = {};
            for (const pick of entry.picks) {
              picksByGroup[pick.group.groupNumber] = pick;
            }

            return (
              <>
                <tr key={entry.id} className={rowBg}>
                  <td className={`text-center px-2 py-2 font-semibold align-middle sticky left-0 z-10 ${rowBg}`}>
                    {disqualified
                      ? <span className="text-red-500">DQ</span>
                      : <span className="text-gray-600">{getRank(entry, allEntries, scoresCalculated)}</span>
                    }
                  </td>
                  <td className={`text-center px-3 py-2 whitespace-nowrap align-middle sticky left-10 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)] ${rowBg}`}>
                    {/* Mobile: tappable row */}
                    <button
                      className="sm:hidden w-full text-left"
                      onClick={() => toggleExpand(entry.id)}
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div>
                          <div className="font-medium text-gray-800 text-xs">{entry.entryName}</div>
                          {entry.user?.name && (
                            <div className="text-xs text-gray-400">{entry.user.name}</div>
                          )}
                        </div>
                        <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                      </div>
                    </button>
                    {/* Desktop: plain display */}
                    <div className="hidden sm:block">
                      <div className="font-medium text-gray-800 text-xs sm:text-sm">{entry.entryName}</div>
                      {entry.user?.name && (
                        <div className="text-xs text-gray-400">{entry.user.name}</div>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 font-bold text-gray-900 align-middle">
                    {scoresCalculated && entry.totalPoints !== null ? entry.totalPoints : "—"}
                  </td>
                  {scoresCalculated && (
                    <td className="text-center px-2 py-2 align-middle">
                      {payouts[entry.id] != null
                        ? <span className="font-semibold text-green-600">${payouts[entry.id]}</span>
                        : null}
                    </td>
                  )}
                  {groups.map((g, gIdx) => {
                    const pick = picksByGroup[g.groupNumber];
                    return (
                      <td key={g.id} className={`hidden sm:table-cell text-center px-1 py-2 align-top ${GROUP_COLORS[gIdx % 2]}`}>
                        {pick ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {(() => {
                              const spaceIdx = pick.golfer.name.indexOf(" ");
                              const first = spaceIdx >= 0 ? pick.golfer.name.slice(0, spaceIdx) : pick.golfer.name;
                              const last = spaceIdx >= 0 ? pick.golfer.name.slice(spaceIdx + 1) : "";
                              return (
                                <>
                                  <span className="text-xs text-gray-700 leading-none">{first}</span>
                                  {last && <span className="text-xs text-gray-700 leading-none">{last}</span>}
                                </>
                              );
                            })()}
                            {scoresCalculated && (
                              <span className="text-xs text-gray-400">
                                {pick.golfer.qualifyingBracket ?? "—"}
                                {" · "}
                                <span className={`font-semibold ${
                                  pick.golfer.finalScore !== null ? "text-blue-600" : "text-gray-400"
                                }`}>
                                  {pick.golfer.finalScore !== null ? pick.golfer.finalScore : "—"}
                                </span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Mobile expanded picks row */}
                {isExpanded && (
                  <tr key={`${entry.id}-picks`} className={`sm:hidden ${rowBg}`}>
                    <td colSpan={mobileColSpan} className="px-3 pb-3 pt-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        {groups.map((g) => {
                          const pick = picksByGroup[g.groupNumber];
                          return (
                            <div key={g.id} className="bg-white border border-gray-200 rounded-lg px-2 py-1.5">
                              <div className="text-xs font-semibold text-gray-400 mb-0.5">G{g.groupNumber}</div>
                              {pick ? (
                                <>
                                  <div className="text-xs font-medium text-gray-800 leading-tight">{pick.golfer.name}</div>
                                  {scoresCalculated && (
                                    <div className="text-xs text-gray-400 mt-0.5">
                                      {pick.golfer.qualifyingBracket ?? "—"}
                                      {" · "}
                                      <span className={`font-semibold ${
                                        pick.golfer.finalScore !== null ? "text-blue-600" : "text-gray-400"
                                      }`}>
                                        {pick.golfer.finalScore !== null ? pick.golfer.finalScore : "—"}
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-xs text-gray-300">—</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
