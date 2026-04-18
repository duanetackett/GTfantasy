import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TournamentSelector from "./TournamentSelector";

export default async function DashboardPage() {
  const session = await auth();

  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }],
    select: { id: true, name: true, year: true, status: true },
  });

  return (
    <div className="flex flex-col items-center pt-10 pb-24">
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center leading-tight mb-4 drop-shadow-lg px-4">
        GOLDEN TEE FANTASY
      </h1>
      <a href="https://www.pegttour.com" target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pegt-logo.png"
          alt="PEGT Golden Tee Tour Logo"
          width={300}
          height={300}
          className="w-40 sm:w-64 mb-4 hover:opacity-80 transition-opacity cursor-pointer"
        />
      </a>

      <TournamentSelector tournaments={tournaments} />
    </div>
  );
}
