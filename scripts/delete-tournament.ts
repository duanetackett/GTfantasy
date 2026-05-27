import "dotenv/config";
import { prisma } from "../lib/prisma";

const name = process.argv[2];
const year = parseInt(process.argv[3]);

async function main() {
  if (!name || !year) {
    console.error("Usage: npx tsx scripts/delete-tournament.ts <name> <year>");
    process.exit(1);
  }

  const all = await prisma.tournament.findMany({
    where: { name, year },
    include: { _count: { select: { entries: true, groups: true } } },
  });

  if (all.length === 0) {
    console.log(`Tournament "${name}" (${year}) not found.`);
    return;
  }

  console.log(`Found ${all.length} record(s):`);
  for (const t of all) {
    console.log(`  id: ${t.id} | entries: ${t._count.entries} | groups: ${t._count.groups} | status: ${t.status}`);
  }

  for (const t of all) {
    console.log(`\nDeleting: ${t.id}`);
    const picks = await prisma.pick.deleteMany({ where: { entry: { tournamentId: t.id } } });
    console.log(`  Deleted picks: ${picks.count}`);
    const entries = await prisma.entry.deleteMany({ where: { tournamentId: t.id } });
    console.log(`  Deleted entries: ${entries.count}`);
    const golfers = await prisma.golfer.deleteMany({ where: { group: { tournamentId: t.id } } });
    console.log(`  Deleted golfers: ${golfers.count}`);
    const groups = await prisma.group.deleteMany({ where: { tournamentId: t.id } });
    console.log(`  Deleted groups: ${groups.count}`);
    await prisma.tournament.delete({ where: { id: t.id } });
    console.log(`  Tournament deleted.`);
  }

  console.log("\nAll clean — ready for a fresh seed.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
