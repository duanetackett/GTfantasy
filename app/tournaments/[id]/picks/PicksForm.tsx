"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Golfer = { id: string; name: string; hdcp: number | null; pegtPlayerId: number | null; withdrawn: boolean };
type Group = { id: string; groupNumber: number; golfers: Golfer[] };
type Tournament = { id: string; name: string; groups: Group[] };
type Pick = { groupId: string; golferId: string; originalGolferName?: string | null };
type Entry = { id: string; entryName: string; picks: Pick[] };

function toDisplayName(name: string): string {
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function picksToMap(picks: Pick[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of picks) map[p.groupId] = p.golferId;
  return map;
}

function replacementsMap(picks: Pick[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of picks) {
    if (p.originalGolferName) map[p.golferId] = p.originalGolferName;
  }
  return map;
}

export default function PicksForm({
  tournament,
  entries,
  userId,
  userName,
}: {
  tournament: Tournament;
  entries: Entry[];
  userId: string;
  userName: string;
}) {
  const router = useRouter();

  const [localEntries, setLocalEntries] = useState<Entry[]>(entries);
  const [activeIdx, setActiveIdx] = useState(0);
  const [pickMaps, setPickMaps] = useState<Record<string, string>[]>(
    entries.map((e) => picksToMap(e.picks))
  );
  const [replacedMaps] = useState<Record<string, string>[]>(
    entries.map((e) => replacementsMap(e.picks))
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const activeEntry = localEntries[activeIdx];
  const activePicks = pickMaps[activeIdx] ?? {};

  function setPick(groupId: string, golferId: string) {
    setPickMaps((prev) => {
      const next = [...prev];
      next[activeIdx] = { ...next[activeIdx], [groupId]: golferId };
      return next;
    });
    setError("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const picks = Object.entries(activePicks).map(([groupId, golferId]) => ({ groupId, golferId }));

    if (picks.length < tournament.groups.length) {
      setError("Please make a pick for every group.");
      setSaving(false);
      return;
    }

    const isNew = !activeEntry;
    const url = isNew
      ? `/api/tournaments/${tournament.id}/entries`
      : `/api/tournaments/${tournament.id}/picks/${activeEntry.id}`;

    const res = await fetch(url, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks, userId, userName }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save picks.");
    } else {
      if (isNew) {
        const newEntry: Entry = { id: data.id, entryName: data.entryName, picks };
        setLocalEntries((prev) => [...prev, newEntry]);
      }
      setShowConfirm(true);
    }
    setSaving(false);
  }

  async function handleAddEntry() {
    setShowConfirm(false);
    setError("");

    const res = await fetch(`/api/tournaments/${tournament.id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ picks: [], userId, userName }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create entry.");
      return;
    }

    const newEntry: Entry = { id: data.id, entryName: data.entryName, picks: [] };
    setLocalEntries((prev) => [...prev, newEntry]);
    setPickMaps((prev) => [...prev, {}]);
    setActiveIdx(localEntries.length);
  }

  async function handleDelete(idx: number) {
    const entry = localEntries[idx];
    if (!entry) return;
    if (!confirm(`Delete "${entry.entryName}"? This cannot be undone.`)) return;

    setDeleting(true);
    const res = await fetch(`/api/tournaments/${tournament.id}/entries/${entry.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      setError("Failed to delete entry.");
      setDeleting(false);
      return;
    }

    const newEntries = localEntries.filter((_, i) => i !== idx);
    const newPickMaps = pickMaps.filter((_, i) => i !== idx);
    setLocalEntries(newEntries);
    setPickMaps(newEntries.length === 0 ? [{}] : newPickMaps);
    setActiveIdx(newEntries.length === 0 ? 0 : Math.min(idx, newEntries.length - 1));
    setDeleting(false);
    setShowConfirm(false);
  }

  // Confirmation screen shown after saving
  if (showConfirm) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center">
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="text-4xl mb-4">✓</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Picks Saved!</h3>
          <p className="text-gray-500 text-sm mb-4">
            Your picks for <span className="font-medium">{activeEntry?.entryName ?? "your entry"}</span> have been saved.
          </p>
          <p className="text-red-600 font-bold mb-8">
            Please Pay Your Donation ASAP - Rules list how to pay
          </p>
          <p className="text-gray-700 font-medium mb-4">Would you like to create another entry?</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleAddEntry}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-medium"
            >
              Yes, Add Entry
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              No, I'm Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="pb-24 sm:pb-0">
      {/* Print-only: all entries */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold mb-6">{tournament.name} — My Picks</h1>
        {localEntries.map((entry, idx) => {
          const picks = pickMaps[idx] ?? {};
          return (
            <div key={entry.id} className="mb-8 break-inside-avoid">
              <h2 className="text-lg font-bold border-b-2 border-black pb-1 mb-3">{entry.entryName}</h2>
              <div className="grid grid-cols-4 gap-3">
                {tournament.groups.map((group) => {
                  const selectedGolfer = group.golfers.find((g) => g.id === picks[group.id]);
                  return (
                    <div key={group.id} className="border border-gray-300 rounded p-2">
                      <div className="text-xs font-bold text-gray-500 mb-1">Group {group.groupNumber}</div>
                      <div className="text-sm font-semibold">{selectedGolfer ? toDisplayName(selectedGolfer.name) : "—"}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Entry tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap print:hidden">
        {localEntries.map((entry, idx) => (
          <div key={entry.id} className="flex items-center">
            <button
              onClick={() => { setActiveIdx(idx); setError(""); setShowConfirm(false); }}
              className={`px-4 py-2 rounded-l-full text-sm font-medium transition ${
                activeIdx === idx
                  ? "bg-green-600 text-white"
                  : "bg-white/10 text-gray-200 hover:bg-white/20"
              }`}
            >
              {entry.entryName}
            </button>
            <button
              onClick={() => handleDelete(idx)}
              disabled={deleting}
              title="Delete entry"
              className={`px-2.5 py-2 rounded-r-full text-sm transition ${
                activeIdx === idx
                  ? "bg-green-700 text-white hover:bg-red-600"
                  : "bg-white/10 text-gray-300 hover:bg-red-500/30 hover:text-red-300"
              }`}
            >
              ✕
            </button>
          </div>
        ))}
        {localEntries.length > 0 && (
          <button
            onClick={handleAddEntry}
            className="px-4 py-2 rounded-full text-sm font-medium bg-white/10 border border-green-400 text-green-300 hover:bg-white/20 transition"
          >
            + Add Entry
          </button>
        )}
      </div>

      {/* Save bar — sticky on mobile, inline on desktop */}
      <div className="hidden sm:flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
          >
            {saving ? "Saving..." : "Save Picks"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <button
          onClick={handlePrint}
          className="bg-white/10 text-white border border-white/20 px-6 py-2 rounded-lg hover:bg-white/20 transition font-medium"
        >
          Print Picks
        </button>
      </div>

      {/* Replacement / withdrawal banner */}
      {(() => {
        const activeReplacements = replacedMaps[activeIdx] ?? {};
        const hasReplaced = Object.keys(activeReplacements).length > 0;
        const hasWithdrawn = tournament.groups.some((g) => {
          const selectedId = pickMaps[activeIdx]?.[g.id];
          return selectedId && g.golfers.find((gf) => gf.id === selectedId)?.withdrawn;
        });
        if (!hasReplaced && !hasWithdrawn) return null;
        return (
          <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-sm text-amber-800 print:hidden">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <p>
              <strong>One or more of your picks need attention</strong> due to a golfer withdrawal.
              Names shown in <span className="text-red-600 font-semibold">red</span> require a new selection — please review and update your picks.
            </p>
          </div>
        );
      })()}

      {/* Groups */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 print:hidden">
        {tournament.groups.map((group) => {
          const selectedId = activePicks[group.id];
          const activeReplacements = replacedMaps[activeIdx] ?? {};
          return (
            <div key={group.id} className="bg-white rounded-xl shadow p-3 text-gray-900">
              <h4 className="font-semibold text-gray-700 text-sm mb-2 border-b pb-1.5">Group {group.groupNumber}</h4>
              <div className="space-y-0.5">
                {group.golfers.map((golfer) => {
                  const isSelected = selectedId === golfer.id;
                  const isReplaced = isSelected && !!activeReplacements[golfer.id];
                  const isWithdrawn = isSelected && golfer.withdrawn;
                  const isAlert = isReplaced || isWithdrawn;
                  const originalName = activeReplacements[golfer.id];
                  return (
                  <label
                    key={golfer.id}
                    className={`flex items-center gap-2 px-2 py-2 sm:py-1 rounded-lg cursor-pointer transition ${
                      isSelected
                        ? isAlert
                          ? "bg-red-50 border border-red-400"
                          : "bg-green-50 border border-green-400"
                        : golfer.withdrawn
                        ? "border border-transparent opacity-40"
                        : "border border-transparent hover:bg-gray-50 print:hidden"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`group-${group.id}-entry-${activeIdx}`}
                      value={golfer.id}
                      checked={isSelected}
                      onChange={() => setPick(group.id, golfer.id)}
                      disabled={golfer.withdrawn && !isSelected}
                      className="accent-green-600 w-4 h-4 shrink-0 print:hidden"
                    />
                    <span
                      className={`text-base sm:text-sm font-semibold flex-1 ${isAlert ? "text-red-600" : golfer.withdrawn ? "line-through text-gray-400" : ""}`}
                      title={isReplaced ? `Originally: ${toDisplayName(originalName!)} — replaced due to withdrawal` : isWithdrawn ? "This golfer has withdrawn" : undefined}
                    >
                      {toDisplayName(golfer.name)}
                      {isReplaced && <span className="ml-1 text-xs font-normal text-red-400">(replaced)</span>}
                      {isWithdrawn && <span className="ml-1 text-xs font-normal text-red-400">(withdrawn)</span>}
                    </span>
                    <div className="flex items-center gap-2 pl-2 border-l border-gray-200 shrink-0 print:hidden">
                      {golfer.hdcp != null && (
                        <span className="text-xs font-bold text-gray-400 w-12 text-center tabular-nums">{golfer.hdcp.toFixed(2)}</span>
                      )}
                      {golfer.pegtPlayerId != null && (
                        <a
                          href={`https://www.pegttour.com/players/${golfer.pegtPlayerId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold text-blue-500 hover:text-blue-700 hover:underline"
                        >
                          Card
                        </a>
                      )}
                    </div>
                  </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sticky save bar — mobile only */}
      <div className="sm:hidden print:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-white/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-green-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-green-700 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Picks"}
        </button>
        {error && <p className="text-sm text-red-400 flex-1">{error}</p>}
      </div>
    </div>
  );
}
