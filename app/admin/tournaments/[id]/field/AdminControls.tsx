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
    <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex flex-wrap items-center gap-3">
        {/* Status dropdown */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
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

        <Link
          href={`/admin/tournaments/${tournament.id}/entries`}
          className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 transition"
        >
          View Entries
        </Link>

        <Link
          href={`/admin/tournaments/${tournament.id}/payments`}
          className="inline-block bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition"
        >
          Manage Payments
        </Link>

        <Link
          href={`/admin/tournaments/${tournament.id}/finances`}
          className="inline-block bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 transition"
        >
          Finances
        </Link>

        {tournament.pegttourSlug ? (
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
          >
            {calculating ? "Fetching from PEGT..." : "Calculate Results"}
          </button>
        ) : (
          <Link
            href={`/admin/tournaments/${tournament.id}/results`}
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Enter Results
          </Link>
        )}
      </div>

      {/* Timestamp below the button row */}
      {tournament.pegttourSlug && lastCalculated && (
        <p className="text-xs text-gray-400 mt-2">
          Last calculated: {new Date(lastCalculated).toLocaleString()}
        </p>
      )}

      {/* Feedback messages */}
      {(message || error) && (
        <div className="mt-2">
          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
