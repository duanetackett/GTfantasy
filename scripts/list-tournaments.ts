import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const all = await prisma.tournament.findMany({
    orderBy: [{ name: "asc" }, { year: "desc" }],
    include: { _count: { select: { entries: true, groups: true } } },
  });
  for (const t of all) {
    console.log(`${t.id} | "${t.name}" ${t.year} | entries: ${t._count.entries} | groups: ${t._count.groups} | status: ${t.status}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
