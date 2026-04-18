import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import LeaderboardTable from "./LeaderboardTable";

// ─── Payout calculation ────────────────────────────────────────────────────────
// Prize pool = qualifying entries × $35
// Last place = $40 flat (per tied entry)
// Remaining pool → 1st 40% / 2nd 30% / 3rd 20% / 4th 10% (ties split combined %)
// DQ entries → $40 refund

type EntryLike = { id: string; totalPoints: number | null; disqualified: boolean };

function calculatePayouts(entries: EntryLike[]): Record<string, number> {
  const payouts: Record<string, number> = {};

  // DQ entries get $40 refund
  for (const e of entries.filter((e) => e.disqualified)) {
    payouts[e.id] = 40;
  }

  const scored = entries.filter((e) => !e.disqualified && e.totalPoints !== null);
  if (scored.length === 0) return payouts;

  const prizePool = scored.length * 35;

  // Sort ascending (lower = better)
  const sorted = [...scored].sort((a, b) => (a.totalPoints ?? 999) - (b.totalPoints ?? 999));

  // Last place: worst score
  const worstScore = sorted[sorted.length - 1].totalPoints!;
  const lastPlaceEntries = sorted.filter((e) => e.totalPoints === worstScore);
  const lastPlacePayout = 40; // flat $40 each
  for (const e of lastPlaceEntries) {
    payouts[e.id] = lastPlacePayout;
  }

  // Remaining pool for places 1–4
  const remaining = prizePool - lastPlacePayout * lastPlaceEntries.length;
  const percentages = [0.40, 0.30, 0.20, 0.10];

  // Build ordered score groups (ascending)
  const groups: EntryLike[][] = [];
  let i = 0;
  while (i < sorted.length) {
    const score = sorted[i].totalPoints;
    const group = sorted.filter((e) => e.totalPoints === score);
    groups.push(group);
    i += group.length;
  }

  // Assign top-4 payouts, splitting combined % among tied entries
  let pos = 0;
  for (const group of groups) {
    if (pos >= 4) break;
    const slots = percentages.slice(pos, pos + group.length);
    const combined = slots.reduce((s, p) => s + p, 0);
    const perEntry = Math.round((combined * remaining) / group.length);
    for (const e of group) {
      // Give the higher of top-4 payout vs last place consolation
      payouts[e.id] = Math.max(payouts[e.id] ?? 0, perEntry);
    }
    pos += group.length;
  }

  return payouts;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: { orderBy: { groupNumber: "asc" } },
    },
  });

  if (!tournament) notFound();

  if (tournament.status === "UPCOMING" || tournament.status === "PICKS_OPEN") {
    redirect("/dashboard");
  }

  const entries = await prisma.entry.findMany({
    where: { tournamentId: id },
    include: {
      user: { select: { id: true, name: true } },
      picks: {
        include: {
          golfer: { select: { id: true, name: true, qualifyingRank: true, qualifyingBracket: true, finalScore: true, finalPosition: true } },
          group: { select: { groupNumber: true } },
        },
      },
    },
    orderBy: [{ totalPoints: "asc" }, { createdAt: "asc" }],
  });

  const activeEntries = entries.filter((e) => !e.disqualified);
  const dqEntries    = entries.filter((e) => e.disqualified);
  const myEntries    = entries.filter((e) => e.user?.id === session.user.id);
  const scoresCalculated = tournament.status === "COMPLETED" && entries.some((e) => e.totalPoints !== null);

  const payouts = scoresCalculated ? calculatePayouts(entries) : {};

  return (
    <div>
      <p className="text-sm text-gray-300 mb-6">
        {tournament.status === "COMPLETED"
          ? "Final results"
          : "Picks are locked — scores will be updated after qualifying and again after the tournament."}
      </p>

      {myEntries.length > 0 && (
        <div className="mb-8">
          <h3 className="text-base font-semibold text-green-400 mb-3">Your Entries</h3>
          <LeaderboardTable
            entries={myEntries.filter((e) => !e.disqualified)}
            allEntries={activeEntries}
            groups={tournament.groups}
            scoresCalculated={scoresCalculated}
            payouts={payouts}
            highlight
          />
          {myEntries.some((e) => e.disqualified) && (
            <LeaderboardTable
              entries={myEntries.filter((e) => e.disqualified)}
              allEntries={activeEntries}
              groups={tournament.groups}
              scoresCalculated={scoresCalculated}
              payouts={payouts}
              highlight
              disqualified
            />
          )}
        </div>
      )}

      <h3 className="text-base font-semibold text-gray-200 mb-3">Full Leaderboard</h3>
      <LeaderboardTable
        entries={activeEntries}
        allEntries={activeEntries}
        groups={tournament.groups}
        scoresCalculated={scoresCalculated}
        payouts={payouts}
        currentUserId={session.user.id}
      />

      {dqEntries.length > 0 && (
        <div className="mt-8">
          <h3 className="text-base font-semibold text-red-400 mb-1">Disqualified Entries</h3>
          <p className="text-xs text-gray-400 mb-3">These entries picked a golfer who did not play. Entry fee is refunded.</p>
          <LeaderboardTable
            entries={dqEntries}
            allEntries={activeEntries}
            groups={tournament.groups}
            scoresCalculated={scoresCalculated}
            payouts={payouts}
            currentUserId={session.user.id}
            disqualified
          />
        </div>
      )}
    </div>
  );
}
