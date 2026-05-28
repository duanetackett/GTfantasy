export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import NewTournamentForm from "./NewTournamentForm";

const KNOWN_TOURNAMENTS = [
  "Florida Open",
  "Wisconsin Open",
  "Missouri Open",
  "Music City Open",
  "Carolina Clash",
  "Texas Holiday Classic",
  "World Championship",
];

const CURRENT_YEAR = 2026;
const YEARS = Array.from({ length: CURRENT_YEAR - 2024 + 1 }, (_, i) => CURRENT_YEAR - i);

function statusLabel(status: string) {
  switch (status) {
    case "PICKS_OPEN":   return "Picks Open";
    case "PICKS_LOCKED": return "In Progress";
    case "COMPLETED":    return "Completed";
    default:             return "Upcoming";
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "PICKS_OPEN":   return "bg-green-100 text-green-700";
    case "PICKS_LOCKED": return "bg-amber-100 text-amber-700";
    case "COMPLETED":    return "bg-gray-100 text-gray-500";
    default:             return "bg-blue-100 text-blue-600";
  }
}

export default async function AdminPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }],
    select: { id: true, name: true, year: true, status: true },
  });

  const lookup = new Map(tournaments.map((t) => [`${t.name}|${t.year}`, t]));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Admin Functions</h1>

      <div className="flex items-center gap-4 mb-8">
        <details>
          <summary className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition select-none">
            + Create New Tournament
          </summary>
          <div className="mt-4">
            <NewTournamentForm />
          </div>
        </details>
        <Link href="/admin/users" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
          Manage Users
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {KNOWN_TOURNAMENTS.map((name) => (
          <div key={name} className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="bg-gray-700 px-5 py-3">
              <h3 className="font-bold text-white text-sm tracking-wide">{name}</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {YEARS.map((year) => {
                const t = lookup.get(`${name}|${year}`);

                if (!t) {
                  return (
                    <div key={year} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-gray-300">{year}</span>
                    </div>
                  );
                }

                return (
                  <div key={year} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                    <Link
                      href={`/admin/tournaments/${t.id}/field`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {year}
                    </Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge(t.status)}`}>
                      {statusLabel(t.status)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
