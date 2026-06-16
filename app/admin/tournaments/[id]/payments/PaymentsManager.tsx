"use client";

import { useState } from "react";

const ENTRY_FEE = 40;

type Entry = {
  id: string;
  entryName: string;
  paidAt: string | null;
  user: { name: string } | null;
};

type Tournament = {
  id: string;
  name: string;
  year: number;
  entries: Entry[];
};

type SortCol = "entry" | "status" | "paidAt";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-block transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
      {active && dir === "desc" ? "▼" : "▲"}
    </span>
  );
}

export default function PaymentsManager({ tournament }: { tournament: Tournament }) {
  const [entries, setEntries] = useState<Entry[]>(tournament.entries);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<SortCol>("entry");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const paidCount = entries.filter((e) => e.paidAt).length;
  const totalCount = entries.length;
  const collected = paidCount * ENTRY_FEE;
  const outstanding = (totalCount - paidCount) * ENTRY_FEE;

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    if (sortCol === "entry") {
      const aName = (a.user?.name ?? a.entryName).toLowerCase();
      const bName = (b.user?.name ?? b.entryName).toLowerCase();
      cmp = aName.localeCompare(bName);
    } else if (sortCol === "status") {
      cmp = (a.paidAt ? 1 : 0) - (b.paidAt ? 1 : 0);
    } else if (sortCol === "paidAt") {
      const aDate = a.paidAt ? new Date(a.paidAt).getTime() : 0;
      const bDate = b.paidAt ? new Date(b.paidAt).getTime() : 0;
      cmp = aDate - bDate;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  async function togglePaid(entry: Entry) {
    setLoadingId(entry.id);
    const newPaid = !entry.paidAt;
    const res = await fetch(`/api/admin/payments/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: newPaid }),
    });
    if (res.ok) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, paidAt: newPaid ? new Date().toISOString() : null }
            : e
        )
      );
    }
    setLoadingId(null);
  }

  if (totalCount === 0) {
    return <p className="text-sm text-gray-400">No entries yet for this tournament.</p>;
  }

  const thClass = "px-4 py-3 cursor-pointer select-none hover:bg-gray-200 transition-colors";

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Total Entries</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Collected</p>
          <p className="text-2xl font-bold text-green-700">${collected}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-amber-600">${outstanding}</p>
        </div>
      </div>

      {/* Entries table */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <th className={`text-left ${thClass}`} onClick={() => handleSort("entry")}>
                  Entry <SortIcon active={sortCol === "entry"} dir={sortDir} />
                </th>
                <th className="text-center px-4 py-3">Amount</th>
                <th className={`text-center ${thClass}`} onClick={() => handleSort("status")}>
                  Status <SortIcon active={sortCol === "status"} dir={sortDir} />
                </th>
                <th className={`text-center ${thClass}`} onClick={() => handleSort("paidAt")}>
                  Paid On <SortIcon active={sortCol === "paidAt"} dir={sortDir} />
                </th>
                <th className="text-center px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((entry, i) => (
                <tr key={entry.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{entry.entryName}</div>
                    <div className="text-xs text-gray-400">{entry.user?.name ?? <span className="italic">Unlinked</span>}</div>
                  </td>
                  <td className="text-center px-4 py-3 text-gray-700">${ENTRY_FEE}</td>
                  <td className="text-center px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      entry.paidAt
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {entry.paidAt ? "Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3 text-xs text-gray-400">
                    {entry.paidAt ? new Date(entry.paidAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="text-center px-4 py-3">
                    <button
                      onClick={() => togglePaid(entry)}
                      disabled={loadingId === entry.id}
                      className={`text-xs px-3 py-1 rounded-lg font-medium transition disabled:opacity-50 ${
                        entry.paidAt
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-green-600 text-white hover:bg-green-700"
                      }`}
                    >
                      {loadingId === entry.id ? "..." : entry.paidAt ? "Mark Unpaid" : "Mark Paid"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
