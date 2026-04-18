import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import PaymentsManager from "./PaymentsManager";

export default async function PaymentsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/dashboard");

  const tournaments = await prisma.tournament.findMany({
    where: { status: { not: "UPCOMING" } },
    orderBy: [{ year: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      year: true,
      status: true,
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

  // Serialize dates for client component
  const serialized = tournaments.map((t) => ({
    ...t,
    entries: t.entries.map((e) => ({
      ...e,
      paidAt: e.paidAt ? e.paidAt.toISOString() : null,
    })),
  }));

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600 transition">
          ← Admin Functions
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Manage Payments</h1>
      <p className="text-sm text-gray-500 mb-6">Track cash entry payments by tournament.</p>
      <PaymentsManager tournaments={serialized} />
    </div>
  );
}
