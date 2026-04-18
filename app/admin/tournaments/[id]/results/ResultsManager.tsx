"use client";

import { useState } from "react";
import type { GolferScore } from "@/lib/scoring";

function CoursesWonCell({ score }: { score: GolferScore }) {
  const [open, setOpen] = useState(false);
  if (score.bonusCourseQualifier === 0) return <td className="text-center px-3 py-3" />;
  return (
    <td className="text-center px-3 py-3 text-blue-600 relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="font-medium underline decoration-dotted cursor-pointer"
      >
        {score.bonusCourseQualifier}
      </button>
      {open && (
        <div className="absolute z-10 left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-left min-w-[180px]">
          <p className="text-xs font-semibold text-gray-500 mb-1">Courses Won</p>
          <ul className="space-y-1">
            {(score.coursesWon ?? []).map((c) => (
              <li key={c} className="text-xs text-gray-800">{c}</li>
            ))}
          </ul>
        </div>
      )}
    </td>
  );
}

const COL_HEADER = "text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight whitespace-nowrap";
const COL_HEADER_WRAP = "text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight";

export default function ResultsManager({ tournamentId }: { tournamentId: string }) {
  const [scores, setScores] = useState<GolferScore[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleCalculate() {
    setLoading(true);
    setError("");
    setMessage("");
    setScores(null);

    const res = await fetch(`/api/admin/tournaments/${tournamentId}/scores?action=preview`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to calculate scores.");
    } else {
      setScores(data.scores);
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin/tournaments/${tournamentId}/scores?action=save`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to save scores.");
    } else {
      setMessage("Scores saved successfully. Entry totals have been updated.");
      setScores(data.scores);
    }
    setSaving(false);
  }

  const groups = scores
    ? Array.from(new Set(scores.map((s) => s.groupNumber))).sort((a, b) => a - b)
    : [];

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleCalculate}
          disabled={loading || saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? "Fetching from PEGT..." : "Calculate Scores"}
        </button>

        {scores && (
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Confirm & Save Scores"}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded p-3 mb-4">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 rounded p-3 mb-4">{message}</p>}

      {loading && (
        <p className="text-sm text-gray-500">Fetching data from PEGT website — this may take a few seconds...</p>
      )}

      {scores && (
        <div className="space-y-8">
          {groups.map((gNum) => {
            const groupScores = scores.filter((s) => s.groupNumber === gNum);
            return (
              <div key={gNum} className="rounded-xl border border-gray-200 shadow-md overflow-hidden">
                {/* Group header */}
                <div className="bg-gray-700 px-5 py-3">
                  <h3 className="font-bold text-white text-sm tracking-wide uppercase">Group {gNum}</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Golfer</th>
                        <th className={COL_HEADER}>Qualifying<br />Position</th>
                        <th className={COL_HEADER}>Bracket</th>
                        <th className={COL_HEADER}>Final<br />Place</th>
                        <th className={COL_HEADER_WRAP}>Top<br />Qualifier</th>
                        <th className={COL_HEADER_WRAP}>Courses Won<br />(-3 each)</th>
                        <th className={COL_HEADER_WRAP}>Top Finisher<br />Groups 1-3</th>
                        <th className={COL_HEADER_WRAP}>Main Bracket<br />1-4 Place</th>
                        <th className={COL_HEADER_WRAP}>Purple<br />Winner</th>
                        <th className={COL_HEADER_WRAP}>Pink<br />Winner</th>
                        <th className="text-center px-4 py-3 text-xs font-bold text-gray-700 uppercase tracking-wide">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {groupScores.map((s, i) => (
                        <tr
                          key={s.golferId}
                          className={i % 2 === 0 ? "bg-white hover:bg-blue-50 transition-colors" : "bg-gray-50 hover:bg-blue-50 transition-colors"}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                            {s.golferName}
                            {s.isDNP && (
                              <span className="ml-2 text-xs text-red-500 font-semibold">DNP</span>
                            )}
                          </td>
                          <td className="text-center px-3 py-3 text-gray-600">{s.qualifyingRank ?? "—"}</td>
                          <td className="text-center px-3 py-3 text-gray-600">{s.qualifyingBracket ?? "—"}</td>
                          <td className="text-center px-3 py-3 text-gray-600">{s.baseScore ?? "—"}</td>
                          <td className="text-center px-3 py-3 text-blue-600 font-medium">
                            {s.bonusOverallQualifier !== 0 ? s.bonusOverallQualifier : ""}
                          </td>
                          <CoursesWonCell score={s} />
                          <td className="text-center px-3 py-3 text-purple-600 font-medium">
                            {s.bonusTier !== 0 ? s.bonusTier : ""}
                          </td>
                          <td className="text-center px-3 py-3 text-green-600 font-medium">
                            {s.bonusMainBracket !== 0 ? s.bonusMainBracket : ""}
                          </td>
                          <td className="text-center px-3 py-3 text-purple-600 font-medium">
                            {s.bonusPurple !== 0 ? s.bonusPurple : ""}
                          </td>
                          <td className="text-center px-3 py-3 text-pink-600 font-medium">
                            {s.bonusPink !== 0 ? s.bonusPink : ""}
                          </td>
                          <td className="text-center px-4 py-3 font-bold text-gray-900 text-base">
                            {s.totalScore !== null ? s.totalScore : "DNP"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
