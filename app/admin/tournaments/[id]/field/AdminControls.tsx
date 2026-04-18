"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUSES = ["UPCOMING", "PICKS_OPEN", "PICKS_LOCKED", "COMPLETED"];

export default function AdminControls({
  tournament,
}: {
  tournament: { id: string; status: string; pegttourSlug: string | null; scoresLastCalculatedAt: string | null };
}) {
  const router = useRouter();
  const [status, setStatus] = useState(tournament.status);
  const [statusSaving, setStatusSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [lastCalculated, setLastCalculated] = useState<string | null>(tournament.scoresLastCalculatedAt);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleStatusSave() {
    setStatusSaving(true);
    setMessage("");
    setError("");
    const res = await fetch(`/api/admin/tournaments/${tournament.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update status.");
    } else {
      setMessage("Status updated.");
      router.refresh();
    }
    setStatusSaving(false);
  }

  async function handleCalculate() {
    setCalculating(true);
    setMessage("");
    setError("");
    const res = await fetch(
      `/api/admin/tournaments/${tournament.id}/scores?action=save`,
      { method: "POST" }
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to calculate scores.");
    } else {
      const now = new Date().toISOString();
      setLastCalculated(now);
      setMessage("Scores calculated and saved successfully.");
    }
    setCalculating(false);
  }

  return (
    <div className="flex flex-wrap items-end gap-6 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {/* Status dropdown */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Status
        </label>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            onClick={handleStatusSave}
            disabled={statusSaving}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
          >
            {statusSaving ? "Saving..." : "Update"}
          </button>
        </div>
      </div>

      {/* View Entries */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
          Entries
        </label>
        <Link
          href={`/admin/tournaments/${tournament.id}/entries`}
          className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition"
        >
          View Entries
        </Link>
      </div>

      {/* Calculate Results button */}
      {tournament.pegttourSlug && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Results
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {calculating ? "Fetching from PEGT..." : "Calculate Results"}
            </button>
            {lastCalculated && (
              <span className="text-xs text-gray-400">
                Last run: {new Date(lastCalculated).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Feedback messages */}
      {(message || error) && (
        <div className="w-full">
          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
