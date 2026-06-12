"use client";

import { useState, useMemo } from "react";

type Entry = {
  id: string;
  entryName: string;
  tournament: { id: string; name: string; year: number };
};

type AssignedEntry = Entry & {
  user: { id: string; name: string };
};

type User = {
  id: string;
  name: string;
  email: string;
};

export default function AssignEntriesManager({
  initialEntries,
  initialAssignedEntries,
  users,
}: {
  initialEntries: Entry[];
  initialAssignedEntries: AssignedEntry[];
  users: User[];
}) {
  const [tab, setTab] = useState<"assign" | "unassign">("assign");

  // --- Assign state ---
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedUserId, setSelectedUserId] = useState("");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // --- Unassign state ---
  const [assignedEntries, setAssignedEntries] = useState<AssignedEntry[]>(initialAssignedEntries);
  const [unselectedIds, setUnselectedIds] = useState<Set<string>>(new Set());
  const [unfilter, setUnfilter] = useState("");
  const [unsaving, setUnsaving] = useState(false);
  const [unmessage, setUnmessage] = useState("");
  const [unerror, setUnerror] = useState("");

  // --- Assign logic ---
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
      // move from unassigned → assigned list
      const justAssigned = entries.filter((e) => assigned.has(e.id));
      const user = users.find((u) => u.id === selectedUserId)!;
      setAssignedEntries((prev) =>
        [...prev, ...justAssigned.map((e) => ({ ...e, user: { id: user.id, name: user.name } }))].sort((a, b) =>
          a.entryName.localeCompare(b.entryName, undefined, { sensitivity: "base" })
        )
      );
      setEntries((prev) => prev.filter((e) => !assigned.has(e.id)));
      setSelectedIds(new Set());
      setMessage(`${data.count} entr${data.count !== 1 ? "ies" : "y"} assigned to ${data.userName}.`);
    }
    setSaving(false);
  }

  // --- Unassign logic ---
  const unfilteredEntries = useMemo(() => {
    const q = unfilter.trim().toLowerCase();
    if (!q) return assignedEntries;
    return assignedEntries.filter(
      (e) =>
        e.entryName.toLowerCase().includes(q) ||
        e.tournament.name.toLowerCase().includes(q) ||
        e.user.name.toLowerCase().includes(q)
    );
  }, [assignedEntries, unfilter]);

  const allUnfilteredSelected =
    unfilteredEntries.length > 0 && unfilteredEntries.every((e) => unselectedIds.has(e.id));

  function toggleUnAll() {
    if (allUnfilteredSelected) {
      setUnselectedIds((prev) => {
        const next = new Set(prev);
        unfilteredEntries.forEach((e) => next.delete(e.id));
        return next;
      });
    } else {
      setUnselectedIds((prev) => {
        const next = new Set(prev);
        unfilteredEntries.forEach((e) => next.add(e.id));
        return next;
      });
    }
  }

  function toggleUnOne(id: string) {
    setUnselectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function unassign() {
    if (unselectedIds.size === 0) return;
    setUnsaving(true);
    setUnmessage("");
    setUnerror("");

    const res = await fetch("/api/admin/assign-entries", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryIds: Array.from(unselectedIds) }),
    });

    const data = await res.json();
    if (!res.ok) {
      setUnerror(data.error ?? "Failed to unassign entries.");
    } else {
      const removed = new Set(unselectedIds);
      // move from assigned → unassigned list
      const justUnassigned = assignedEntries.filter((e) => removed.has(e.id));
      setEntries((prev) =>
        [...prev, ...justUnassigned.map(({ user: _user, ...e }) => e)].sort((a, b) =>
          a.entryName.localeCompare(b.entryName, undefined, { sensitivity: "base" })
        )
      );
      setAssignedEntries((prev) => prev.filter((e) => !removed.has(e.id)));
      setUnselectedIds(new Set());
      setUnmessage(`${data.count} entr${data.count !== 1 ? "ies" : "y"} unassigned.`);
    }
    setUnsaving(false);
  }

  const selectedCount = selectedIds.size;
  const unselectedCount = unselectedIds.size;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setTab("assign")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            tab === "assign"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Assign ({entries.length} unassigned)
        </button>
        <button
          onClick={() => setTab("unassign")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            tab === "unassign"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          Unassign ({assignedEntries.length} assigned)
        </button>
      </div>

      {/* ── ASSIGN TAB ── */}
      {tab === "assign" && (
        <>
          {message && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 mb-4">{message}</p>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">{error}</p>
          )}

          {entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-10 text-center">
              <p className="text-gray-500 text-sm">All entries from completed tournaments are already assigned.</p>
            </div>
          ) : (
            <>
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
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button
                  onClick={assign}
                  disabled={saving || selectedCount === 0 || !selectedUserId}
                  className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {saving ? "Assigning..." : `Assign ${selectedCount > 0 ? selectedCount : ""} Selected`}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-y-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
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
        </>
      )}

      {/* ── UNASSIGN TAB ── */}
      {tab === "unassign" && (
        <>
          {unmessage && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3 mb-4">{unmessage}</p>
          )}
          {unerror && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3 mb-4">{unerror}</p>
          )}

          {assignedEntries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-10 text-center">
              <p className="text-gray-500 text-sm">No assigned entries from completed tournaments.</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="text"
                  placeholder="Filter by entry, tournament, or user..."
                  value={unfilter}
                  onChange={(e) => setUnfilter(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
                <button
                  onClick={unassign}
                  disabled={unsaving || unselectedCount === 0}
                  className="bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {unsaving ? "Unassigning..." : `Unassign ${unselectedCount > 0 ? unselectedCount : ""} Selected`}
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden overflow-y-auto max-h-[60vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-100 border-b-2 border-gray-300 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allUnfilteredSelected}
                          onChange={toggleUnAll}
                          className="rounded"
                          title="Select all visible"
                        />
                      </th>
                      <th className="text-left px-4 py-3">Entry Name</th>
                      <th className="text-left px-4 py-3">Tournament</th>
                      <th className="text-center px-4 py-3">Year</th>
                      <th className="text-left px-4 py-3">Assigned To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unfilteredEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                          No entries match your filter.
                        </td>
                      </tr>
                    ) : (
                      unfilteredEntries.map((entry, i) => (
                        <tr
                          key={entry.id}
                          className={`cursor-pointer transition ${
                            unselectedIds.has(entry.id)
                              ? "bg-red-50"
                              : i % 2 === 0
                              ? "bg-white hover:bg-gray-50"
                              : "bg-gray-50 hover:bg-gray-100"
                          }`}
                          onClick={() => toggleUnOne(entry.id)}
                        >
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={unselectedIds.has(entry.id)}
                              onChange={() => toggleUnOne(entry.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{entry.entryName}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.tournament.name}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{entry.tournament.year}</td>
                          <td className="px-4 py-3 text-gray-600">{entry.user.name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {unselectedCount > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  {unselectedCount} entr{unselectedCount !== 1 ? "ies" : "y"} selected
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
