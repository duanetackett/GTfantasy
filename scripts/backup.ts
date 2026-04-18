/**
 * Usage: npx tsx scripts/backup.ts
 * Creates a timestamped JSON backup of the entire database in scripts/backups/
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function backup() {
  console.log("Starting database backup...");

  const [users, tournaments, groups, golfers, entries, picks] = await Promise.all([
    prisma.user.findMany(),
    prisma.tournament.findMany(),
    prisma.group.findMany(),
    prisma.golfer.findMany(),
    prisma.entry.findMany(),
    prisma.pick.findMany(),
  ]);

  const data = {
    backedUpAt: new Date().toISOString(),
    users,
    tournaments,
    groups,
    golfers,
    entries,
    picks,
  };

  const backupsDir = path.join(__dirname, "backups");
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const filename = `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filepath = path.join(backupsDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

  console.log(`\nBackup complete!`);
  console.log(`  Users:       ${users.length}`);
  console.log(`  Tournaments: ${tournaments.length}`);
  console.log(`  Groups:      ${groups.length}`);
  console.log(`  Golfers:     ${golfers.length}`);
  console.log(`  Entries:     ${entries.length}`);
  console.log(`  Picks:       ${picks.length}`);
  console.log(`\nSaved to: ${filepath}`);

  await prisma.$disconnect();
}

backup().catch((e) => {
  console.error("Backup failed:", e);
  process.exit(1);
});
