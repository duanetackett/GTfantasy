import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import PicksForm from "./PicksForm";

export default async function PicksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        orderBy: { groupNumber: "asc" },
        include: { golfers: { orderBy: { name: "asc" }, select: { id: true, name: true, hdcp: true, pegtPlayerId: true } } },
      },
    },
  });

  if (!tournament) notFound();

  if (tournament.status !== "PICKS_OPEN") {
    redirect("/dashboard");
  }

  // Load all entries for this user in this tournament, with their picks
  const entries = await prisma.entry.findMany({
    where: { userId: session.user.id, tournamentId: id },
    include: { picks: { select: { groupId: true, golferId: true, originalGolferName: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">{tournament.name}</h2>
      <p className="text-sm text-gray-300 mb-6">
        Pick one golfer from each group to form your team.
      </p>
      <PicksForm
        tournament={tournament}
        entries={entries}
        userId={session.user.id}
        userName={session.user.name ?? "Entry"}
      />
    </div>
  );
}
