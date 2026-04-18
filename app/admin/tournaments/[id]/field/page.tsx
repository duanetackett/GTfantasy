import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import FieldEditor from "./FieldEditor";
import AdminControls from "./AdminControls";

export default async function FieldPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-white transition">
          ← Admin Functions
        </Link>
        <h2 className="text-xl font-semibold text-white mt-2">
          {tournament.name} {tournament.year}
        </h2>
      </div>

      <AdminControls
        tournament={{
          id: tournament.id,
          status: tournament.status,
          pegttourSlug: tournament.pegttourSlug ?? null,
          scoresLastCalculatedAt: tournament.scoresLastCalculatedAt?.toISOString() ?? null,
        }}
      />

      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-300">Manage the field — 8 groups of 8 golfers</p>
        <Link href={`/admin/tournaments/${tournament.id}/payments`} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition">
          Manage Payments
        </Link>
      </div>
      <FieldEditor
        tournament={tournament}
        locked={tournament.status === "PICKS_LOCKED" || tournament.status === "COMPLETED"}
      />
    </div>
  );
}
