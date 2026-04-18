import { config } from "dotenv";
config();
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find the Texas Holiday Classic 2024 tournament
  const tournament = await prisma.tournament.findFirst({
    where: { name: "Texas Holiday Classic", year: 2024 },
    include: {
      groups: {
        include: { golfers: true },
      },
    },
  });

  if (!tournament) {
    throw new Error("Texas Holiday Classic 2024 not found.");
  }

  // Find BRYCE AUBART across all groups in this tournament
  let bryceSGolfer = null;
  for (const group of tournament.groups) {
    const match = group.golfers.find(
      (g) => g.name.toUpperCase() === "BRYCE AUBART"
    );
    if (match) {
      bryceSGolfer = match;
      break;
    }
  }

  if (!bryceSGolfer) {
    throw new Error("Golfer BRYCE AUBART not found in Texas Holiday Classic 2024.");
  }

  console.log(`Found golfer: ${bryceSGolfer.name} (id: ${bryceSGolfer.id})`);
  console.log(`  Current finalPosition: ${bryceSGolfer.finalPosition}`);
  console.log(`  Current finalScore:    ${bryceSGolfer.finalScore}`);

  // Update the golfer
  await prisma.golfer.update({
    where: { id: bryceSGolfer.id },
    data: {
      finalPosition: 9,
      finalScore: 9,
    },
  });

  console.log("Updated BRYCE AUBART -> finalPosition: 9, finalScore: 9");

  // Recalculate totalPoints for all entries in this tournament that picked BRYCE AUBART
  const entries = await prisma.entry.findMany({
    where: { tournamentId: tournament.id },
    include: {
      picks: {
        include: { golfer: true },
      },
    },
  });

  let updatedCount = 0;
  for (const entry of entries) {
    const pickedBryce = entry.picks.some((p) => p.golferId === bryceSGolfer!.id);
    if (!pickedBryce) continue;

    const isDQ =
      entry.picks.length < 8 ||
      entry.picks.some((pick) => pick.golfer.finalScore === null);
    const total = isDQ
      ? null
      : entry.picks.reduce((sum, pick) => sum + (pick.golfer.finalScore ?? 0), 0);

    await prisma.entry.update({
      where: { id: entry.id },
      data: { totalPoints: total, disqualified: isDQ },
    });

    console.log(
      `  Updated entry "${entry.entryName}" -> totalPoints: ${total ?? "DQ"}`
    );
    updatedCount++;
  }

  console.log(`\nDone. Updated ${updatedCount} entr${updatedCount === 1 ? "y" : "ies"}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
