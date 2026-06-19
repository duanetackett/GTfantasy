import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type EntryLike = {
  id: string;
  entryName: string;
  totalPoints: number | null;
  disqualified: boolean;
  user: { name: string } | null;
};

type PayoutRow = {
  medal: string;
  label: string;
  entries: EntryLike[];
  amount: number;
};

function calculatePayouts(entries: EntryLike[]): {
  rows: PayoutRow[];
  unaccounted: number;
} {
  const dqList = entries.filter((e) => e.disqualified).sort((a, b) => a.entryName.localeCompare(b.entryName));
  const scored = entries.filter((e) => !e.disqualified && e.totalPoints !== null);

  const prizePool = scored.length * 35;
  const percentages = [0.40, 0.30, 0.20, 0.10];
  const medals = ["🥇", "🥈", "🥉", "🏅"];
  const labels = ["1st Place", "2nd Place", "3rd Place", "4th Place"];

  if (scored.length === 0) {
    const rows: PayoutRow[] = [];
    if (dqList.length > 0) {
      rows.push({ medal: "", label: "", entries: dqList, amount: 40 });
    }
    return { rows, unaccounted: 0 };
  }

  const sorted = [...scored].sort((a, b) => (a.totalPoints ?? 999) - (b.totalPoints ?? 999));

  // Last place
  const worstScore = sorted[sorted.length - 1].totalPoints!;
  const lastPlaceList = sorted.filter((e) => e.totalPoints === worstScore);
  const lastPlacePayout = 40;
  const lastPlaceTotal = lastPlacePayout * lastPlaceList.length;

  // Remaining for top 4
  const remaining = prizePool - lastPlaceTotal;

  // Build score groups ascending
  const groups: EntryLike[][] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i].totalPoints;
    const group = sorted.filter((e) => e.totalPoints === score);
    groups.push(group);
    i += group.length;
  }

  const rows: PayoutRow[] = [];
  let pos = 0;
  let totalPaid = lastPlaceTotal;

  for (const group of groups) {
    if (pos >= 4) break;
    const slots = percentages.slice(pos, pos + group.length);
    const combined = slots.reduce((s, p) => s + p, 0);
    const perEntry = Math.round((combined * remaining) / group.length);
    const finalAmount = Math.max(perEntry, lastPlacePayout);

    // Handle tie label
    const isTie = group.length > 1;
    const medal = isTie ? medals[pos] + "🤝" : medals[pos];
    const label = isTie ? `T${pos + 1} (${group.length}-way tie)` : labels[pos];

    rows.push({ medal, label, entries: group, amount: finalAmount });
    totalPaid += finalAmount * group.length;
    pos += group.length;
  }

  // Last place row (only if not already in top 4)
  const lastPlaceAlreadyCovered = rows.some((r) =>
    r.entries.some((e) => lastPlaceList.some((l) => l.id === e.id))
  );
  if (!lastPlaceAlreadyCovered) {
    rows.push({ medal: "🚽", label: "Last Place", entries: lastPlaceList, amount: lastPlacePayout });
    // totalPaid already includes last place
  }

  // DQ refunds
  if (dqList.length > 0) {
    rows.push({ medal: "", label: "", entries: dqList, amount: 40 });
    totalPaid += 40 * dqList.length;
  }

  const unaccounted = prizePool - totalPaid + (40 * dqList.length);

  return { rows, unaccounted };
}

export default async function FinancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, name: true, year: true },
  });

  if (!tournament) notFound();

  const allEntries = await prisma.entry.findMany({
    where: { tournamentId: id },
    select: {
      id: true,
      entryName: true,
      totalPoints: true,
      disqualified: true,
      user: { select: { name: true } },
    },
    orderBy: [{ totalPoints: "asc" }, { createdAt: "asc" }],
  });

  const totalEntries = allEntries.length;
  const dqCount = allEntries.filter((e) => e.disqualified).length;
  const prizePool = (totalEntries - dqCount) * 35;
  const scoresAvailable = allEntries.some((e) => e.totalPoints !== null);

  const { rows } = scoresAvailable ? calculatePayouts(allEntries) : { rows: [] };

  return (
    <div>
      <div className="mb-4">
        <Link href={`/admin/tournaments/${id}/field`} className="text-sm text-gray-400 hover:text-white transition">
          ← {tournament.name} {tournament.year}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Finances — {tournament.name} {tournament.year}</h1>

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* Financial Summary */}
        <div className="rounded-xl border border-gray-200 shadow-md overflow-hidden bg-white">
          <div className="bg-gray-700 px-5 py-3">
            <h3 className="font-bold text-white text-sm tracking-wide uppercase">Financial Summary</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="px-5 py-3 font-medium text-gray-800">Entry Fee</td>
                <td className="px-5 py-3 font-semibold text-gray-900 text-right">$40</td>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">Entry Fee Towards Prize Pool</td>
                <td className="px-5 py-3 font-semibold text-gray-900 text-right">$35</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="px-5 py-3 font-medium text-gray-800">Number of Entries</td>
                <td className="px-5 py-3 font-semibold text-gray-900 text-right">{totalEntries}</td>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">Number of DQ Entries</td>
                <td className="px-5 py-3 font-semibold text-red-600 text-right">{dqCount}</td>
              </tr>
              <tr className="bg-green-50">
                <td className="px-5 py-3 font-bold text-gray-900">Prize Pool</td>
                <td className="px-5 py-3 font-bold text-green-700 text-right text-base">${prizePool.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Prize Winners */}
        <div className="rounded-xl border border-gray-200 shadow-md overflow-hidden bg-white">
          <div className="bg-gray-700 px-5 py-3">
            <h3 className="font-bold text-white text-sm tracking-wide uppercase">Prize Winners</h3>
          </div>
          {!scoresAvailable ? (
            <p className="px-5 py-4 text-sm text-gray-400">Scores have not been calculated yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Place</th>
                  <th className="text-left px-5 py-3">Entry</th>
                  <th className="text-right px-5 py-3">Score</th>
                  <th className="text-right px-5 py-3">Prize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) =>
                  row.entries.map((entry, j) => (
                    <tr key={entry.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      {j === 0 && (
                        <td className="px-5 py-3 align-top" rowSpan={row.entries.length}>
                          <div className="flex items-center gap-2">
                            {row.medal && <span className="text-2xl leading-none">{row.medal}</span>}
                            <span className="font-semibold text-gray-700 text-xs">{row.label}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-800">{entry.entryName}</div>
                        {entry.user?.name && (
                          <div className="text-xs text-gray-400">{entry.user.name}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">
                        {entry.totalPoints ?? "—"}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-green-700">
                        ${row.amount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
