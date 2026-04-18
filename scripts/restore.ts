/**
 * Usage: npx tsx scripts/restore.ts scripts/backups/backup-<timestamp>.json
 * Wipes the entire database and restores from the specified backup file.
 *
 * WARNING: This is destructive. All current data will be replaced.
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function restore() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/restore.ts <backup-file>");
    console.error("Example: npx tsx scripts/restore.ts scripts/backups/backup-2026-04-18T12-00-00-000Z.json");
    process.exit(1);
  }

  const filepath = path.resolve(file);
  if (!fs.existsSync(filepath)) {
    console.error(`File not found: ${filepath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filepath, "utf-8"));

  console.log(`Restoring from: ${filepath}`);
  console.log(`Backup created: ${data.backedUpAt}`);
  console.log("\nThis will WIPE all current data and replace it with the backup.");
  console.log("Press Ctrl+C within 5 seconds to cancel...\n");

  await new Promise((r) => setTimeout(r, 5000));

  console.log("Wiping current data...");

  // Delete in reverse dependency order
  await prisma.pick.deleteMany();
  await prisma.entry.deleteMany();
  await prisma.golfer.deleteMany();
  await prisma.group.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.user.deleteMany();

  console.log("Restoring data...");

  // Restore in dependency order
  if (data.users?.length) {
    await prisma.user.createMany({ data: data.users });
    console.log(`  Restored ${data.users.length} users`);
  }
  if (data.tournaments?.length) {
    await prisma.tournament.createMany({ data: data.tournaments });
    console.log(`  Restored ${data.tournaments.length} tournaments`);
  }
  if (data.groups?.length) {
    await prisma.group.createMany({ data: data.groups });
    console.log(`  Restored ${data.groups.length} groups`);
  }
  if (data.golfers?.length) {
    await prisma.golfer.createMany({ data: data.golfers });
    console.log(`  Restored ${data.golfers.length} golfers`);
  }
  if (data.entries?.length) {
    await prisma.entry.createMany({ data: data.entries });
    console.log(`  Restored ${data.entries.length} entries`);
  }
  if (data.picks?.length) {
    await prisma.pick.createMany({ data: data.picks });
    console.log(`  Restored ${data.picks.length} picks`);
  }

  console.log("\nRestore complete! Database is back to the backup state.");

  await prisma.$disconnect();
}

restore().catch((e) => {
  console.error("Restore failed:", e);
  process.exit(1);
});
