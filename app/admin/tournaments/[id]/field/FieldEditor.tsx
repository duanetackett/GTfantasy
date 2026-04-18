"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type Golfer = { id: string; name: string; hdcp: number | null };
type Group = { id: string; groupNumber: number; golfers: Golfer[] };
type Tournament = { id: string; name: string; groups: Group[] };

type GolferRow = { name: string; hdcp: string };

function normalizeName(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function isMatch(entered: string, players: string[]): boolean {
  if (!entered.trim()) return true; // empty = not an error
  const n = normalizeName(entered);
  return players.some((p) => normalizeName(p) === n);
}

export default function FieldEditor({ tournament, locked = false }: { tournament: Tournament; locked?: boolean }) {
  const router = useRouter();

  const initGroups = (): GolferRow[][] => {
    const result: GolferRow[][] = [];
    for (let g = 1; g <= 8; g++) {
      const existing = tournament.groups.find((gr) => gr.groupNumber === g);
      const rows: GolferRow[] = existing
        ? existing.golfers.map((gf) => ({ name: gf.name, hdcp: gf.hdcp != null ? String(gf.hdcp) : "" }))
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
  const [validateError, setValidateError] = useState("");

  function updateGolfer(groupIdx: number, golferIdx: number, field: keyof GolferRow, value: string) {
    setGroups((prev) => {
      const next = prev.map((g) => g.map((row) => ({ ...row })));
      next[groupIdx][golferIdx][field] = value;
      return next;
    });
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
    }
    setValidating(false);
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const res = await fetch(`/api/admin/tournaments/${tournament.id}/field`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups }),
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

  // Compute min card width from the longest name so inputs never truncate.
  // text-sm uppercase chars ≈ 9px each; add HDCP (80px) + gap (4px) + input padding (16px) + card padding (32px).
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
          disabled={saving || locked}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
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
                return (
                  <div key={idx} className="flex gap-1 items-center">
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
