import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ResultsManager from "./ResultsManager";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) notFound();

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">{tournament.name}</h2>
      <p className="text-sm text-gray-300 mb-6">
        Calculate and save fantasy scores from PEGT results
      </p>

      {!tournament.pegttourSlug ? (
        <p className="text-sm text-red-600 bg-red-50 rounded p-3">
          This tournament has no PEGT slug configured. Please recreate it using the tournament dropdown.
        </p>
      ) : (
        <ResultsManager tournamentId={id} />
      )}
    </div>
  );
}
