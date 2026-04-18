import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import PaymentsManager from "./PaymentsManager";

export default async function TournamentPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      year: true,
      entries: {
        orderBy: [{ user: { name: "asc" } }, { createdAt: "asc" }],
        select: {
          id: true,
          entryName: true,
          paidAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!tournament) notFound();

  const serialized = {
    ...tournament,
    entries: tournament.entries.map((e) => ({
      ...e,
      paidAt: e.paidAt ? e.paidAt.toISOString() : null,
    })),
  };

  return (
    <div>
      <div className="mb-4">
        <Link href={`/admin/tournaments/${id}/field`} className="text-sm text-gray-400 hover:text-gray-600 transition">
          ← {tournament.name} {tournament.year}
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Manage Payments</h1>
      <p className="text-sm text-gray-500 mb-6">{tournament.name} {tournament.year} — track cash entry payments.</p>
      <PaymentsManager tournament={serialized} />
    </div>
  );
}
