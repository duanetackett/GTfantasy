import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TournamentSelector from "./TournamentSelector";
import MySummary from "./MySummary";

function getRank(entryId: string, allEntries: { id: string; totalPoints: number | null }[]): string {
  const scored = allEntries.filter((e) => e.totalPoints !== null);
  if (scored.length === 0) return "—";
  const sorted = [...scored].sort((a, b) => (a.totalPoints ?? 999) - (b.totalPoints ?? 999));
  const entry = sorted.find((e) => e.id === entryId);
  if (!entry) return "—";
  const rank = sorted.findIndex((e) => e.totalPoints === entry.totalPoints) + 1;
  const isTied = sorted.filter((e) => e.totalPoints === entry.totalPoints).length > 1;
  return isTied ? `T${rank}` : `${rank}`;
}

export default async function DashboardPage() {
  const session = await auth();

  const [tournaments, myEntries] = await Promise.all([
    prisma.tournament.findMany({
      orderBy: [{ year: "desc" }],
      select: { id: true, name: true, year: true, status: true },
    }),
    session?.user?.id
      ? prisma.entry.findMany({
          where: {
            userId: session.user.id,
            tournament: { status: "COMPLETED" },
            totalPoints: { not: null },
          },
          include: {
            tournament: { select: { id: true, name: true, year: true } },
          },
          orderBy: [{ tournament: { year: "desc" } }, { tournament: { name: "asc" } }],
        })
      : Promise.resolve([]),
  ]);

  const openTournament = tournaments.find((t) => t.status === "PICKS_OPEN");
  const hasReplacedPicks = openTournament && session?.user?.id
    ? (await prisma.pick.count({
        where: {
          entry: { userId: session.user.id, tournamentId: openTournament.id },
          OR: [
            { originalGolferName: { not: null } },
            { golfer: { withdrawn: true } },
          ],
        },
      })) > 0
    : false;

  // For rank calculation, fetch all entries per tournament the user participated in
  const tournamentIds = [...new Set(myEntries.map((e) => e.tournamentId))];
  const allEntriesByTournament = tournamentIds.length
    ? await prisma.entry.findMany({
        where: { tournamentId: { in: tournamentIds } },
        select: { id: true, tournamentId: true, totalPoints: true },
      })
    : [];

  const entriesByTournament = new Map<string, { id: string; totalPoints: number | null }[]>();
  for (const e of allEntriesByTournament) {
    const list = entriesByTournament.get(e.tournamentId) ?? [];
    list.push(e);
    entriesByTournament.set(e.tournamentId, list);
  }

  return (
    <div className="flex flex-col items-center pt-10 pb-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight mb-4 drop-shadow-lg px-4">
        GOLDEN TEE FANTASY
      </h1>
      <a href="https://www.pegttour.com" target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pegt-logo.png"
          alt="PEGT Golden Tee Tour Logo"
          width={300}
          height={300}
          className="w-40 sm:w-64 mb-4 hover:opacity-80 transition-opacity cursor-pointer"
        />
      </a>

      <TournamentSelector tournaments={tournaments} hasReplacedPicks={hasReplacedPicks} />

      <MySummary entries={myEntries.map((entry) => {
        const allForTourney = entriesByTournament.get(entry.tournamentId) ?? [];
        const rank = getRank(entry.id, allForTourney);
        const totalEntries = allForTourney.filter((e) => e.totalPoints !== null).length;
        return {
          id: entry.id,
          entryName: entry.entryName,
          totalPoints: entry.totalPoints,
          tournamentId: entry.tournamentId,
          tournament: entry.tournament,
          rank,
          totalEntries,
        };
      })} />
    </div>
  );
}
