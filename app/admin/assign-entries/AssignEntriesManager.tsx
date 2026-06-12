"use client";

import { useState, useMemo } from "react";

type Entry = {
  id: string;
  entryName: string;
  tournament: { id: string; name: string; year: number };
};

type User = {
  id: string;
  name: string;
  email: string;
};

export default function AssignEntriesManager({
  initialEntries,
  users,
}: {
  initialEntries: Entry[];
  users: User[];
}) {
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.entryName.toLowerCase().includes(q) ||
        e.tournament.name.toLowerCase().includes(q)
    );
  }, [entries, filter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function assign() {
    if (selectedIds.size === 0 || !selectedUserId) return;
    setSaving(true);
    setMessage("");
    setError("");

    const res = await fetch("/api/admin/assign-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryIds: Array.from(selectedIds), userId: selectedUserId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to assign entries.");
    } else {
      const assigned = new Set(selectedIds);
      setEntries((prev) => prev.filter((e) => !assigned.has(e.id)));
      setSelectedIds(new Set());
      setMessage(`${data.count} entr${data.count !== 1 ? "ies" : "y"} assigned to ${data.userName}.`);
    }
    setSaving(false);
  }

  const selectedCount = selectedIds.size;

  return (
    <div>
      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 mb-4">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">
          {error}
        </p>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-10 text-center">
          <p className="text-gray-500 text-sm">All entries from completed tournaments are already assigned.</p>
        </div>
      ) : (
        <>
          {/* Controls bar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <input
              type="text"
              placeholder="Filter by name or tournament..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[200px]"
            >
              <option value="">— Select a user —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <button
              onClick={assign}
              disabled={saving || selectedCount === 0 || !selectedUserId}
              className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap"
            >
              {saving
                ? "Assigning..."
                : `Assign ${selectedCount > 0 ? selectedCount : ""} Selected`}
            </button>
          </div>

          {/* Entry table */}
          <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="rounded"
                      title="Select all visible"
                    />
                  </th>
                  <th className="text-left px-4 py-3">Entry Name</th>
                  <th className="text-left px-4 py-3">Tournament</th>
                  <th className="text-center px-4 py-3">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">
                      No entries match your filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((entry, i) => (
                    <tr
                      key={entry.id}
                      className={`cursor-pointer transition ${
                        selectedIds.has(entry.id)
                          ? "bg-green-50"
                          : i % 2 === 0
                          ? "bg-white hover:bg-gray-50"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => toggleOne(entry.id)}
                    >
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleOne(entry.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{entry.entryName}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.tournament.name}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{entry.tournament.year}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedCount > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {selectedCount} entr{selectedCount !== 1 ? "ies" : "y"} selected
              {filtered.length < entries.length ? ` (${entries.length} total unassigned)` : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}
