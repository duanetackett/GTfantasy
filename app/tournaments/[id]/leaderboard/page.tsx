import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import LeaderboardTable from "./LeaderboardTable";

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
  const scoresCalculated = entries.some((e) => e.totalPoints !== null);

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
            highlight
          />
          {myEntries.some((e) => e.disqualified) && (
            <LeaderboardTable
              entries={myEntries.filter((e) => e.disqualified)}
              allEntries={activeEntries}
              groups={tournament.groups}
              scoresCalculated={scoresCalculated}
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
            currentUserId={session.user.id}
            disqualified
          />
        </div>
      )}
    </div>
  );
}
