import { config } from "dotenv";
config();
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const names = process.argv.slice(2); // e.g. "Wisconsin Open" "2024"
  if (names.length < 2) {
    console.error("Usage: npx tsx prisma/delete-tournaments.ts <name> <year>");
    process.exit(1);
  }
  const name = names[0];
  const year = parseInt(names[1]);

  const deleted = await prisma.tournament.deleteMany({
    where: { name, year },
  });
  console.log(`Deleted ${deleted.count} tournament(s): ${name} ${year}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
