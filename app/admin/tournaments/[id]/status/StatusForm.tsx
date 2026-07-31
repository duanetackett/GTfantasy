"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["UPCOMING", "PICKS_OPEN", "PICKS_LOCKED", "COMPLETED"];

export default function StatusForm({ tournament }: { tournament: { id: string; status: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState(tournament.status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/admin/tournaments/${tournament.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to update status.");
    } else {
      setMessage("Status updated.");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <div className="bg-white rounded-xl shadow p-5 max-w-sm">
      {message && (
        <p className={`text-sm mb-3 ${message.includes("updated") ? "text-green-700" : "text-red-600"}`}>
          {message}
        </p>
      )}
      <label className="block text-sm text-gray-600 mb-2">Tournament Status</label>
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s.replace("_", " ")}</option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
      >
        {saving ? "Saving..." : "Update Status"}
      </button>
    </div>
  );
}
