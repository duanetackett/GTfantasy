"use client";

import { useState } from "react";

export type GolferRow = {
  id: string;
  name: string;
  groupNumber: number;
  qualifyingRank: number | null;
  finalPosition: number | null;
  bonusTopQualifier: number | null;
  bonusCoursesWon: number | null;
  bonusTopFinisher: number | null;
  bonusMainBracket: number | null;
  bonusPurple: number | null;
  bonusPink: number | null;
  finalScore: number | null;
};

type ManualEntry = {
  isDNP: boolean;
  qualifyingRank: string;
  finalPlace: string;
  topQualifier: boolean;
  coursesWon: string;
  topFinisher: boolean;
  mainBracket: string;
  purpleWinner: boolean;
  pinkWinner: boolean;
};

function getBracket(rank: number): string {
  if (rank <= 32) return "Main";
  if (rank <= 96) return "Purple";
  if (rank <= 160) return "Pink";
  return "Copper";
}

function calcTotal(e: ManualEntry): number | null {
  if (e.isDNP) return null;
  const base = parseInt(e.finalPlace);
  if (isNaN(base)) return null;
  return (
    base +
    (e.topQualifier ? -6 : 0) +
    (parseInt(e.coursesWon || "0") || 0) * -3 +
    (e.topFinisher ? -5 : 0) +
    (parseInt(e.mainBracket || "0") || 0) +
    (e.purpleWinner ? -5 : 0) +
    (e.pinkWinner ? -3 : 0)
  );
}

function initEntry(g: GolferRow): ManualEntry {
  const hasBeenScored = g.bonusTopQualifier !== null;
  const courses = g.bonusCoursesWon != null ? Math.abs(g.bonusCoursesWon) / 3 : 0;
  return {
    isDNP: hasBeenScored && g.finalScore === null,
    qualifyingRank: g.qualifyingRank?.toString() ?? "",
    finalPlace: g.finalPosition?.toString() ?? "",
    topQualifier: g.bonusTopQualifier === -6,
    coursesWon: courses.toString(),
    topFinisher: g.bonusTopFinisher === -5,
    mainBracket: (g.bonusMainBracket ?? 0).toString(),
    purpleWinner: g.bonusPurple === -5,
    pinkWinner: g.bonusPink === -3,
  };
}

const INPUT = "w-14 text-center text-sm border border-gray-300 rounded px-1 py-0.5 disabled:opacity-40 disabled:bg-gray-100";
const TH = "text-center px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight";

export default function ManualScoringForm({
  tournamentId,
  golfers,
}: {
  tournamentId: string;
  golfers: GolferRow[];
}) {
  const [entries, setEntries] = useState<Record<string, ManualEntry>>(() =>
    Object.fromEntries(golfers.map((g) => [g.id, initEntry(g)]))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(id: string, field: keyof ManualEntry, value: string | boolean) {
    setEntries((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    const scores = golfers
      .filter((g) => {
        const e = entries[g.id];
        return e.isDNP || e.finalPlace.trim() !== "";
      })
      .map((g) => {
        const e = entries[g.id];
        const coursesCount = parseInt(e.coursesWon || "0") || 0;
        const qRank = e.qualifyingRank ? parseInt(e.qualifyingRank) : null;
        const total = calcTotal(e);
        return {
          golferId: g.id,
          golferName: g.name,
          groupNumber: g.groupNumber,
          isDNP: e.isDNP,
          qualifyingRank: qRank,
          qualifyingBracket: qRank ? getBracket(qRank) : null,
          baseScore: e.isDNP ? null : parseInt(e.finalPlace) || null,
          bonusOverallQualifier: e.topQualifier ? -6 : 0,
          bonusCourseQualifier: coursesCount * -3,
          coursesWon: [] as string[],
          bonusTier: e.topFinisher ? -5 : 0,
          bonusMainBracket: parseInt(e.mainBracket || "0") || 0,
          bonusPurple: e.purpleWinner ? -5 : 0,
          bonusPink: e.pinkWinner ? -3 : 0,
          totalScore: total,
        };
      });

    const res = await fetch(
      `/api/admin/tournaments/${tournamentId}/scores?action=manual-save`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores }),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save scores.");
    } else {
      setMessage("Scores saved. Entry totals have been updated.");
    }
    setSaving(false);
  }

  const groups = Array.from(new Set(golfers.map((g) => g.groupNumber))).sort(
    (a, b) => a - b
  );

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Scores"}
        </button>
        <p className="text-xs text-gray-400">
          Fill in results below, then click Save. You can save multiple times to make corrections.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 rounded p-3 mb-4">{message}</p>}

      <div className="space-y-8">
        {groups.map((gNum) => {
          const groupGolfers = golfers.filter((g) => g.groupNumber === gNum);
          const showTopFinisher = gNum <= 3;
          return (
            <div
              key={gNum}
              className="rounded-xl border border-gray-200 shadow-md overflow-hidden"
            >
              <div className="bg-gray-700 px-5 py-3 flex items-center gap-3">
                <h3 className="font-bold text-white text-sm tracking-wide uppercase">
                  Group {gNum}
                </h3>
                {showTopFinisher && (
                  <span className="text-xs text-yellow-300 font-medium">
                    ★ Top Finisher bonus eligible (one winner across Groups 1–3)
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-gray-300">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                        Golfer
                      </th>
                      <th className={TH}>DNP</th>
                      <th className={TH}>Qual<br />Rank</th>
                      <th className={TH}>Bracket</th>
                      <th className={TH}>Final<br />Place</th>
                      <th className={TH}>Top Qual<br />(-6)</th>
                      <th className={TH}>Courses<br />Won</th>
                      {showTopFinisher && <th className={TH}>Top Fin<br />(-5)</th>}
                      <th className={TH}>Main<br />Bracket</th>
                      <th className={TH}>Purple<br />(-5)</th>
                      <th className={TH}>Pink<br />(-3)</th>
                      <th className="text-center px-3 py-2 text-xs font-bold text-gray-700 uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {groupGolfers.map((g, i) => {
                      const e = entries[g.id];
                      const total = calcTotal(e);
                      const qRank = parseInt(e.qualifyingRank);
                      const bracketLabel = !isNaN(qRank) ? getBracket(qRank) : "—";
                      return (
                        <tr
                          key={g.id}
                          className={
                            i % 2 === 0
                              ? "bg-white hover:bg-blue-50 transition-colors"
                              : "bg-gray-50 hover:bg-blue-50 transition-colors"
                          }
                        >
                          <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                            {g.name}
                          </td>
                          {/* DNP */}
                          <td className="text-center px-2 py-2">
                            <input
                              type="checkbox"
                              checked={e.isDNP}
                              onChange={(ev) =>
                                update(g.id, "isDNP", ev.target.checked)
                              }
                              className="w-4 h-4 accent-red-500"
                            />
                          </td>
                          {/* Qual Rank */}
                          <td className="text-center px-2 py-2">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={e.qualifyingRank}
                              onChange={(ev) =>
                                update(g.id, "qualifyingRank", ev.target.value)
                              }
                              disabled={e.isDNP}
                              className={INPUT}
                            />
                          </td>
                          {/* Bracket (auto) */}
                          <td className="text-center px-2 py-2 text-xs text-gray-500">
                            {e.isDNP ? "—" : bracketLabel}
                          </td>
                          {/* Final Place */}
                          <td className="text-center px-2 py-2">
                            <input
                              type="number"
                              min="1"
                              max="999"
                              value={e.finalPlace}
                              onChange={(ev) =>
                                update(g.id, "finalPlace", ev.target.value)
                              }
                              disabled={e.isDNP}
                              className={INPUT}
                            />
                          </td>
                          {/* Top Overall Qualifier */}
                          <td className="text-center px-2 py-2">
                            <input
                              type="checkbox"
                              checked={e.topQualifier}
                              onChange={(ev) =>
                                update(g.id, "topQualifier", ev.target.checked)
                              }
                              disabled={e.isDNP}
                              className="w-4 h-4 disabled:opacity-40"
                            />
                          </td>
                          {/* Courses Won */}
                          <td className="text-center px-2 py-2">
                            <select
                              value={e.coursesWon}
                              onChange={(ev) =>
                                update(g.id, "coursesWon", ev.target.value)
                              }
                              disabled={e.isDNP}
                              className="text-sm border border-gray-300 rounded px-1 py-0.5 disabled:opacity-40 disabled:bg-gray-100"
                            >
                              {["0", "1", "2", "3", "4", "5"].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* Top Finisher (groups 1-3 only) */}
                          {showTopFinisher && (
                            <td className="text-center px-2 py-2">
                              <input
                                type="checkbox"
                                checked={e.topFinisher}
                                onChange={(ev) =>
                                  update(g.id, "topFinisher", ev.target.checked)
                                }
                                disabled={e.isDNP}
                                className="w-4 h-4 disabled:opacity-40"
                              />
                            </td>
                          )}
                          {/* Main Bracket */}
                          <td className="text-center px-2 py-2">
                            <select
                              value={e.mainBracket}
                              onChange={(ev) =>
                                update(g.id, "mainBracket", ev.target.value)
                              }
                              disabled={e.isDNP}
                              className="text-sm border border-gray-300 rounded px-1 py-0.5 disabled:opacity-40 disabled:bg-gray-100"
                            >
                              <option value="0">—</option>
                              <option value="-8">1st (-8)</option>
                              <option value="-6">2nd (-6)</option>
                              <option value="-4">3rd (-4)</option>
                              <option value="-3">4th (-3)</option>
                            </select>
                          </td>
                          {/* Purple Winner */}
                          <td className="text-center px-2 py-2">
                            <input
                              type="checkbox"
                              checked={e.purpleWinner}
                              onChange={(ev) =>
                                update(g.id, "purpleWinner", ev.target.checked)
                              }
                              disabled={e.isDNP}
                              className="w-4 h-4 disabled:opacity-40"
                            />
                          </td>
                          {/* Pink Winner */}
                          <td className="text-center px-2 py-2">
                            <input
                              type="checkbox"
                              checked={e.pinkWinner}
                              onChange={(ev) =>
                                update(g.id, "pinkWinner", ev.target.checked)
                              }
                              disabled={e.isDNP}
                              className="w-4 h-4 disabled:opacity-40"
                            />
                          </td>
                          {/* Total */}
                          <td className="text-center px-3 py-2 font-bold text-gray-900 text-base">
                            {e.isDNP ? (
                              <span className="text-red-500 text-xs font-semibold">DNP</span>
                            ) : total !== null ? (
                              total
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Scores"}
        </button>
      </div>
    </div>
  );
}
