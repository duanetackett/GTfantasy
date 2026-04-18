import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import TournamentTabs from "./TournamentTabs";
import TournamentSwitcher from "@/components/TournamentSwitcher";

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const [tournament, allTournaments] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id },
      select: { id: true, name: true, year: true, status: true },
    }),
    prisma.tournament.findMany({
      orderBy: [{ year: "desc" }],
      select: { id: true, name: true, year: true, status: true },
    }),
  ]);

  const showTabs =
    tournament?.status === "PICKS_LOCKED" || tournament?.status === "COMPLETED";
  const showStats = tournament?.status === "COMPLETED";

  const tabs = tournament && showTabs
    ? [
        { label: "Leaderboard", href: `/tournaments/${id}/leaderboard` },
        { label: "Scoring Table", href: `/tournaments/${id}/scores` },
        ...(showStats ? [{ label: "Statistics", href: `/tournaments/${id}/stats` }] : []),
      ]
    : [];

  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-950 via-slate-900 to-gray-950">
        <Navbar />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {tournament && showTabs && (
            <div className="mb-2">
              <TournamentSwitcher tournaments={allTournaments} currentId={id} />
              <h2 className="text-xl font-semibold text-white mt-3 mb-4">
                {tournament.name} {tournament.year}
              </h2>
              <TournamentTabs tabs={tabs} />
            </div>
          )}
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
