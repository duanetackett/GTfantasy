import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import StatusForm from "./StatusForm";

export default async function StatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) notFound();

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-1">{tournament.name}</h2>
      <p className="text-sm text-gray-300 mb-6">Change tournament status</p>
      <StatusForm tournament={tournament} />
    </div>
  );
}
