import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const result = await prisma.tournament.delete({
    where: { id: "cmnjodmvo000030og9s9i2c4y" },
  });
  console.log(`Deleted tournament: ${result.name} (${result.year})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
