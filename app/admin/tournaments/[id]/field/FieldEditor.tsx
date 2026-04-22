"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Golfer = { id: string; name: string; hdcp: number | null };
type Group = { id: string; groupNumber: number; golfers: Golfer[] };
type Tournament = { id: string; name: string; groups: Group[] };

type GolferRow = { id?: string; name: string; hdcp: string; pegtPlayerId?: number | null };

function normalizeName(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function isMatch(entered: string, players: string[]): boolean {
  if (!entered.trim()) return true;
  const n = normalizeName(entered);
  return players.some((p) => normalizeName(p) === n);
}

export default function FieldEditor({ tournament, locked = false, existingPicksCount = 0 }: { tournament: Tournament; locked?: boolean; existingPicksCount?: number }) {
  const router = useRouter();

  const initGroups = (): GolferRow[][] => {
    const result: GolferRow[][] = [];
    for (let g = 1; g <= 8; g++) {
      const existing = tournament.groups.find((gr) => gr.groupNumber === g);
      const rows: GolferRow[] = existing
        ? existing.golfers.map((gf) => ({ id: gf.id, name: gf.name, hdcp: gf.hdcp != null ? String(gf.hdcp) : "" }))
        : [];
      while (rows.length < 8) rows.push({ name: "", hdcp: "" });
      result.push(rows);
    }
    return result;
  };

  const [groups, setGroups] = useState<GolferRow[][]>(initGroups);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [validating, setValidating] = useState(false);
  const [players, setPlayers] = useState<string[] | null>(null);
  const [playerIds, setPlayerIds] = useState<Record<string, number> | null>(null);
  const [validateError, setValidateError] = useState("");

  // Per-golfer inline edit state: golferId → { name, hdcp, saving, error }
  const [inlineEdits, setInlineEdits] = useState<Record<string, { name: string; hdcp: string; saving: boolean; error: string }>>({});

  function updateGolfer(groupIdx: number, golferIdx: number, field: "name" | "hdcp", value: string) {
    setGroups((prev) => {
      const next = prev.map((g) => g.map((row) => ({ ...row })));
      next[groupIdx][golferIdx][field] = value;
      return next;
    });
  }

  function startInlineEdit(golfer: GolferRow) {
    if (!golfer.id) return;
    setInlineEdits((prev) => ({
      ...prev,
      [golfer.id!]: { name: golfer.name, hdcp: golfer.hdcp, saving: false, error: "" },
    }));
  }

  function cancelInlineEdit(golferId: string) {
    setInlineEdits((prev) => {
      const next = { ...prev };
      delete next[golferId];
      return next;
    });
  }

  async function saveInlineEdit(golferId: string) {
    const edit = inlineEdits[golferId];
    if (!edit || !edit.name.trim()) return;

    setInlineEdits((prev) => ({ ...prev, [golferId]: { ...prev[golferId], saving: true, error: "" } }));

    const pegtId = playerIds?.[edit.name.toLowerCase().trim()] ?? null;

    const res = await fetch(`/api/admin/tournaments/${tournament.id}/field`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ golferId, name: edit.name, hdcp: edit.hdcp, pegtPlayerId: pegtId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setInlineEdits((prev) => ({ ...prev, [golferId]: { ...prev[golferId], saving: false, error: data.error ?? "Failed to save." } }));
    } else {
      // Update local groups state with new name/hdcp
      setGroups((prev) =>
        prev.map((g) =>
          g.map((row) => (row.id === golferId ? { ...row, name: edit.name, hdcp: edit.hdcp } : row))
        )
      );
      cancelInlineEdit(golferId);
      router.refresh();
    }
  }

  async function handleValidate() {
    setValidating(true);
    setValidateError("");
    setPlayers(null);

    const res = await fetch("/api/admin/players");
    const data = await res.json();

    if (!res.ok) {
      setValidateError(data.error ?? "Could not load player list.");
    } else {
      setPlayers(data.players);
      setPlayerIds(data.playerIds ?? null);
    }
    setValidating(false);
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    setValidateError("");

    // Always resolve player IDs before saving so Card links are populated
    let resolvedPlayerIds = playerIds;
    if (!resolvedPlayerIds) {
      const vRes = await fetch("/api/admin/players");
      const vData = await vRes.json();
      if (!vRes.ok) {
        setMessage(vData.error ?? "Could not load player list.");
        setSaving(false);
        return;
      }
      setPlayers(vData.players);
      setPlayerIds(vData.playerIds ?? null);
      resolvedPlayerIds = vData.playerIds ?? null;
    }

    const groupsWithIds = resolvedPlayerIds
      ? groups.map((g) =>
          g.map((row) => ({
            ...row,
            pegtPlayerId: resolvedPlayerIds![row.name.toLowerCase().trim()] ?? null,
          }))
        )
      : groups;

    const res = await fetch(`/api/admin/tournaments/${tournament.id}/field`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups: groupsWithIds }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to save field.");
    } else {
      setMessage("Field saved successfully.");
      router.refresh();
    }
    setSaving(false);
  }

  const invalidCount = players
    ? groups.flat().filter((r) => r.name.trim() && !isMatch(r.name, players)).length
    : 0;

  const maxNameLen = useMemo(
    () => Math.max(...groups.flat().map((r) => r.name.length), 8),
    [groups]
  );
  const minCardWidth = maxNameLen * 9 + 132;

  return (
    <div>
      {locked && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          The field is locked and cannot be edited while the tournament is Picks Locked or Completed.
        </div>
      )}

      {existingPicksCount > 0 && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <strong>{existingPicksCount} pick{existingPicksCount !== 1 ? "s" : ""}</strong> have been submitted for this tournament.
          {" "}To update a golfer name, hover over the row and click ✏️ — this updates the name without affecting any picks.
        </div>
      )}

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={handleValidate}
          disabled={validating || locked}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          {validating ? "Checking..." : "Validate Names"}
        </button>
        <button
          onClick={handleSave}
          disabled={saving || locked || existingPicksCount > 0}
          title={existingPicksCount > 0 ? "Disabled — picks have been submitted. Use ✏️ to edit individual golfers." : undefined}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Field"}
        </button>
        {validateError && <p className="text-sm text-red-600">{validateError}</p>}
        {players && invalidCount === 0 && (
          <p className="text-sm text-green-600 font-medium">All names matched!</p>
        )}
        {players && invalidCount > 0 && (
          <p className="text-sm text-red-600 font-medium">{invalidCount} name{invalidCount > 1 ? "s" : ""} not found in PEGT roster</p>
        )}
        {message && (
          <p className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
        )}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` }}>
        {groups.map((golfers, gi) => (
          <div key={gi} className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-700 text-sm">Group {gi + 1}</h4>
              <span className="text-xs text-gray-400 w-20 text-center">HDCP</span>
            </div>
            <div className="space-y-2">
              {golfers.map((row, idx) => {
                const invalid = players !== null && row.name.trim() !== "" && !isMatch(row.name, players);
                const editing = row.id ? inlineEdits[row.id] : undefined;

                // Inline edit mode for this row
                if (editing) {
                  return (
                    <div key={row.id ?? idx} className="border border-blue-300 rounded-lg px-2 py-2 bg-blue-50 space-y-1.5">
                      <input
                        type="text"
                        value={editing.name}
                        onChange={(e) => setInlineEdits((prev) => ({ ...prev, [row.id!]: { ...prev[row.id!], name: e.target.value } }))}
                        className="w-full border border-blue-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Player name"
                        autoFocus
                      />
                      <div className="flex gap-1 items-center">
                        <input
                          type="number"
                          placeholder="HDCP"
                          step="0.01"
                          value={editing.hdcp}
                          onChange={(e) => setInlineEdits((prev) => ({ ...prev, [row.id!]: { ...prev[row.id!], hdcp: e.target.value } }))}
                          className="w-20 border border-blue-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => saveInlineEdit(row.id!)}
                          disabled={editing.saving}
                          className="flex-1 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {editing.saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => cancelInlineEdit(row.id!)}
                          className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-200 transition"
                        >
                          Cancel
                        </button>
                      </div>
                      {editing.error && <p className="text-xs text-red-600">{editing.error}</p>}
                    </div>
                  );
                }

                // Normal row
                return (
                  <div key={row.id ?? idx} className="flex gap-1 items-center group">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        placeholder={`Golfer ${idx + 1}`}
                        value={row.name}
                        onChange={(e) => updateGolfer(gi, idx, "name", e.target.value)}
                        disabled={locked}
                        className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${
                          invalid
                            ? "border-red-400 bg-red-50 focus:ring-red-400"
                            : "border-gray-200 focus:ring-green-500"
                        }`}
                      />
                      {invalid && (
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-red-500 text-xs" title="Name not found in PEGT player roster">
                          ✕
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={row.hdcp}
                      onChange={(e) => updateGolfer(gi, idx, "hdcp", e.target.value)}
                      disabled={locked}
                      className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    {/* Per-golfer edit button — only for saved golfers (have an id) */}
                    {row.id && row.name && !locked && (
                      <button
                        onClick={() => startInlineEdit(row)}
                        title="Edit this golfer without deleting picks"
                        className="opacity-0 group-hover:opacity-100 px-1.5 py-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition text-sm"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
