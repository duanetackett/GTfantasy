import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

type GolferRow = { group: number; golfer: string; score: string };

function LineupCard({ title, rows }: { title: string; rows: GolferRow[] }) {
  const allScored = rows.length > 0 && rows.every((r) => r.score !== "—");
  const total = allScored
    ? rows.reduce((sum, r) => sum + parseFloat(r.score), 0)
    : null;

  return (
    <div className="rounded-xl border border-gray-200 shadow-md overflow-hidden bg-white">
      <div className="bg-gray-700 px-5 py-3">
        <h3 className="font-bold text-white text-sm tracking-wide uppercase">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Grp</th>
            <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Golfer</th>
            <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="px-4 py-2 text-gray-500">{row.group}</td>
              <td className="px-4 py-2 text-gray-800 font-medium">{row.golfer}</td>
              <td className="px-4 py-2 text-right font-bold text-gray-900">{row.score}</td>
            </tr>
          ))}
          <tr className="bg-gray-50 border-t-2 border-gray-300">
            <td className="px-4 py-2 font-semibold text-gray-700" colSpan={2}>Total</td>
            <td className="px-4 py-2 text-right font-bold text-gray-900">
              {total !== null ? total : "—"}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function StatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        orderBy: { groupNumber: "asc" },
        include: {
          golfers: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!tournament) notFound();
  if (tournament.status !== "COMPLETED") redirect("/dashboard");

  const entries = await prisma.entry.findMany({
    where: { tournamentId: id },
    include: {
      picks: {
        include: { golfer: { select: { id: true, finalScore: true } } },
      },
    },
  });

  const totalEntries = entries.length;
  const incompleteEntries = entries.filter((e) =>
    e.picks.length < 8 || e.picks.some((p) => p.golfer.finalScore === null)
  ).length;

  // Pick counts per golfer id
  const pickCounts: Record<string, number> = {};
  for (const entry of entries) {
    for (const pick of entry.picks) {
      pickCounts[pick.golfer.id] = (pickCounts[pick.golfer.id] ?? 0) + 1;
    }
  }

  // Build lineup rows for each card
  const bestRows: GolferRow[] = [];
  const worstRows: GolferRow[] = [];
  const popularRows: GolferRow[] = [];

  for (const group of tournament.groups) {
    const scored = group.golfers.filter((g) => g.finalScore !== null);

    const best = scored.length
      ? scored.reduce((a, b) => (a.finalScore! < b.finalScore! ? a : b))
      : null;
    bestRows.push({
      group: group.groupNumber,
      golfer: best?.name ?? "—",
      score: best?.finalScore?.toString() ?? "—",
    });

    const worst = scored.length
      ? scored.reduce((a, b) => (a.finalScore! > b.finalScore! ? a : b))
      : null;
    worstRows.push({
      group: group.groupNumber,
      golfer: worst?.name ?? "—",
      score: worst?.finalScore?.toString() ?? "—",
    });

    const mostPicked = group.golfers.length
      ? group.golfers.reduce((a, b) =>
          (pickCounts[a.id] ?? 0) >= (pickCounts[b.id] ?? 0) ? a : b
        )
      : null;
    popularRows.push({
      group: group.groupNumber,
      golfer: mostPicked?.name ?? "—",
      score: mostPicked?.finalScore?.toString() ?? "—",
    });
  }

  return (
    <div>

      {/* Summary Table */}
      <div className="rounded-xl border border-gray-200 shadow-md overflow-hidden mb-6 max-w-sm bg-white">
        <div className="bg-gray-700 px-5 py-3">
          <h3 className="font-bold text-white text-sm tracking-wide uppercase">Tournament Summary</h3>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-200 bg-gray-50">
              <td className="px-5 py-3 font-medium text-gray-800">Total Entries</td>
              <td className="px-5 py-3 font-semibold text-gray-900 text-right">{totalEntries}</td>
            </tr>
            <tr>
              <td className="px-5 py-3 font-medium text-gray-800">Incomplete Entries</td>
              <td className="px-5 py-3 font-semibold text-gray-900 text-right">{incompleteEntries}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Pick Popularity */}
      <div className="rounded-xl border border-gray-200 shadow-md overflow-hidden mb-6 bg-white">
        <div className="bg-gray-700 px-5 py-3">
          <h3 className="font-bold text-white text-sm tracking-wide uppercase">Pick Popularity</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-200">
          {tournament.groups.map((group) => (
            <div key={group.id}>
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Group {group.groupNumber}
                </span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {group.golfers
                    .slice()
                    .sort((a, b) => (pickCounts[b.id] ?? 0) - (pickCounts[a.id] ?? 0))
                    .map((golfer, i) => {
                      const count = pickCounts[golfer.id] ?? 0;
                      const pct =
                        totalEntries > 0
                          ? Math.round((count / totalEntries) * 100)
                          : 0;
                      return (
                        <tr key={golfer.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="px-3 py-1.5 text-gray-800 text-xs">{golfer.name}</td>
                          <td className="px-3 py-1.5 text-right font-semibold text-gray-700 text-xs w-12">
                            {pct}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>

      {/* Best / Worst / Most Popular Lineups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <LineupCard title="Best Possible Lineup" rows={bestRows} />
        <LineupCard title="Maximum Possible Lineup" rows={worstRows} />
        <LineupCard title="Most Popular Lineup" rows={popularRows} />
      </div>
    </div>
  );
}
