import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ResultsManager from "./ResultsManager";
import ManualScoringForm from "./ManualScoringForm";

const MANUAL_TOURNAMENTS = ["World Championship"];

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        orderBy: { groupNumber: "asc" },
        include: { golfers: { orderBy: { name: "asc" } } },
      },
    },
  });
  if (!tournament) notFound();

  const isManual = MANUAL_TOURNAMENTS.includes(tournament.name);

  const golfers = tournament.groups.flatMap((g) =>
    g.golfers.map((golfer) => ({
      id: golfer.id,
      name: golfer.name,
      groupNumber: g.groupNumber,
      qualifyingRank: golfer.qualifyingRank,
      finalPosition: golfer.finalPosition,
      bonusTopQualifier: golfer.bonusTopQualifier,
      bonusCoursesWon: golfer.bonusCoursesWon,
      bonusTopFinisher: golfer.bonusTopFinisher,
      bonusMainBracket: golfer.bonusMainBracket,
      bonusPurple: golfer.bonusPurple,
      bonusPink: golfer.bonusPink,
      finalScore: golfer.finalScore,
    }))
  );

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">{tournament.name}</h2>
      <p className="text-sm text-gray-300 mb-6">
        {isManual
          ? "Enter scores manually for each golfer"
          : "Calculate and save fantasy scores from PEGT results"}
      </p>

      {isManual ? (
        <ManualScoringForm tournamentId={id} golfers={golfers} />
      ) : !tournament.pegttourSlug ? (
        <p className="text-sm text-red-600 bg-red-50 rounded p-3">
          This tournament has no PEGT slug configured. Please recreate it using the tournament dropdown.
        </p>
      ) : (
        <ResultsManager tournamentId={id} />
      )}
    </div>
  );
}
