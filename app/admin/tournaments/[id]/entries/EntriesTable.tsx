"use client";

import { useState } from "react";

type User = { id: string; name: string; email: string };
type Pick = { group: { groupNumber: number }; golfer: { name: string } };
type Entry = {
  id: string;
  entryName: string;
  paidAt: string | null;
  userId: string | null;
  user: { name: string; email: string } | null;
  picks: Pick[];
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(" ");
  const last = parts.pop() ?? "";
  const first = parts.join(" ");
  return { first, last };
}

export default function EntriesTable({
  initialEntries,
  groupNumbers,
  groupCount,
  users,
  tournamentId,
}: {
  initialEntries: Entry[];
  groupNumbers: number[];
  groupCount: number;
  users: User[];
  tournamentId: string;
}) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleDelete(entry: Entry) {
    if (!confirm(`Delete "${entry.entryName}"? This cannot be undone.`)) return;
    setDeletingId(entry.id);
    setMessage("");
    setError("");

    const res = await fetch(`/api/tournaments/${tournamentId}/entries/${entry.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      setMessage(`Deleted "${entry.entryName}".`);
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to delete entry.");
    }
    setDeletingId(null);
  }

  async function saveLink(entry: Entry) {
    setLoadingId(entry.id);
    setMessage("");
    setError("");

    const res = await fetch(`/api/tournaments/${tournamentId}/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId || null }),
    });

    if (res.ok) {
      const user = users.find((u) => u.id === selectedUserId) ?? null;
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, userId: selectedUserId || null, user: user ? { name: user.name, email: user.email } : null }
            : e
        )
      );
      setMessage(`Linked "${entry.entryName}" to ${user?.name ?? "no user"}.`);
      setLinkingId(null);
      setSelectedUserId("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to link entry.");
    }
    setLoadingId(null);
  }

  return (
    <div>
      {message && <p className="text-sm text-green-300 bg-green-900/40 border border-green-700/50 rounded-lg px-4 py-3 mb-4">{message}</p>}
      {error && <p className="text-sm text-red-300 bg-red-900/40 border border-red-700/50 rounded-lg px-4 py-3 mb-4">{error}</p>}

      <div className="overflow-x-auto rounded-xl shadow">
        <table className="w-full bg-white text-sm">
          <thead>
            <tr className="bg-gray-700 text-white uppercase tracking-wide">
              <th className="px-4 py-3 text-left whitespace-nowrap">Player</th>
              {groupNumbers.map((g) => (
                <th key={g} className="px-3 py-3 text-center whitespace-nowrap">Grp {g}</th>
              ))}
              <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
              <th className="px-3 py-3 text-center whitespace-nowrap">Paid</th>
              <th className="px-3 py-3 text-center whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {entries.map((entry) => {
              const pickMap = new Map(entry.picks.map((p) => [p.group.groupNumber, p.golfer.name]));
              const picksComplete = entry.picks.length === groupCount;
              const isLinking = linkingId === entry.id;

              return (
                <tr key={entry.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="font-medium text-gray-800">{entry.entryName}</div>
                    {isLinking ? (
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={selectedUserId}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">— Unlinked —</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveLink(entry)}
                          disabled={loadingId === entry.id}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => { setLinkingId(null); setSelectedUserId(""); }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {entry.user?.name ?? <span className="italic text-amber-500">Unlinked</span>}
                        </span>
                        <button
                          onClick={() => {
                            setLinkingId(entry.id);
                            setSelectedUserId(entry.userId ?? "");
                          }}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          {entry.user ? "Change" : "Link"}
                        </button>
                      </div>
                    )}
                  </td>
                  {groupNumbers.map((g) => {
                    const name = pickMap.get(g);
                    if (!name) return <td key={g} className="px-3 py-2 text-center text-gray-300">—</td>;
                    const { first, last } = splitName(name);
                    return (
                      <td key={g} className="px-3 py-2 text-center text-gray-700 leading-tight">
                        <div>{first}</div>
                        <div className="font-semibold">{last}</div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {picksComplete ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Complete</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{entry.picks.length}/{groupCount}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    {entry.paidAt ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Paid</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Unpaid</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(entry)}
                      disabled={deletingId === entry.id}
                      className="text-xs text-red-500 hover:text-red-700 hover:underline disabled:opacity-50"
                    >
                      {deletingId === entry.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
