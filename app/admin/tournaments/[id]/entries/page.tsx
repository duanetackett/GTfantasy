import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import EntriesTable from "./EntriesTable";

export default async function EntriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const [tournament, users] = await Promise.all([
    prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: {
          orderBy: { groupNumber: "asc" },
          select: { id: true, groupNumber: true },
        },
        entries: {
          orderBy: [{ user: { name: "asc" } }, { createdAt: "asc" }],
          include: {
            user: { select: { name: true, email: true } },
            picks: {
              include: {
                group: { select: { groupNumber: true } },
                golfer: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  if (!tournament) notFound();

  const groupNumbers = tournament.groups.map((g) => g.groupNumber);
  const groupCount = tournament.groups.length;

  const entries = tournament.entries.map((e) => ({
    ...e,
    paidAt: e.paidAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <div className="mb-4">
        <Link href={`/admin/tournaments/${id}/field`} className="text-sm text-gray-400 hover:text-white transition">
          ← {tournament.name} {tournament.year}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-1">Submitted Entries</h1>
      <p className="text-sm text-gray-300 mb-6">
        {tournament.name} {tournament.year} — {tournament.entries.length} entr{tournament.entries.length !== 1 ? "ies" : "y"} submitted
      </p>

      {tournament.entries.length === 0 ? (
        <div className="bg-white/10 rounded-xl p-8 text-center">
          <p className="text-gray-300 text-sm">No entries submitted yet.</p>
        </div>
      ) : (
        <EntriesTable
          initialEntries={entries}
          groupNumbers={groupNumbers}
          groupCount={groupCount}
          users={users}
          tournamentId={id}
        />
      )}
    </div>
  );
}
