import { config } from "dotenv";
config();
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface TournamentMeta {
  name: string;
  year: number;
  startDate: string; // ISO date string, e.g. "2024-01-15"
  pegttourSlug: string; // e.g. "florida" from pegttour.com/tournaments/2024/florida/results
}

function parseCSV(filePath: string): string[][] {
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split(/\r?\n/)
    .map((line) =>
      line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
    )
    .filter((row) => row.some((cell) => cell.length > 0));
}

async function seedTournament(dir: string): Promise<void> {
  const metaPath = path.join(dir, "meta.json");
  const groupsPath = path.join(dir, "groups.csv");
  const picksPath = path.join(dir, "picks.csv");

  if (
    !fs.existsSync(metaPath) ||
    !fs.existsSync(groupsPath) ||
    !fs.existsSync(picksPath)
  ) {
    console.warn(
      `Skipping ${path.basename(dir)} — missing meta.json, groups.csv, or picks.csv`
    );
    return;
  }

  const meta: TournamentMeta = JSON.parse(
    fs.readFileSync(metaPath, "utf-8")
  );

  // Skip if tournament already exists
  const existing = await prisma.tournament.findFirst({
    where: { name: meta.name, year: meta.year },
  });
  if (existing) {
    console.log(`Skipping ${meta.name} (${meta.year}) — already in database`);
    return;
  }

  console.log(`\nSeeding: ${meta.name} (${meta.year})`);

  const tournament = await prisma.tournament.create({
    data: {
      name: meta.name,
      year: meta.year,
      startDate: new Date(meta.startDate),
      pegttourSlug: meta.pegttourSlug,
      status: "COMPLETED",
    },
  });

  // ── Parse groups CSV ──────────────────────────────────────────────────────
  // Format: col0 = "Group N" (or blank), col1 = golfer name, col2 = hdcp
  const groupsData = parseCSV(groupsPath);
  const groupGolfers = new Map<
    number,
    { name: string; hdcp: number | null }[]
  >();
  let currentGroup = 0;

  for (const row of groupsData) {
    const [col0, col1, col2] = row;

    if (/^Group\s+\d+/i.test(col0)) {
      currentGroup = parseInt(col0.replace(/^Group\s+/i, ""));
    }

    const name = col1?.trim();
    if (
      !name ||
      name.toLowerCase() === "name" ||
      name.toUpperCase() === "BLANK SPOT" ||
      currentGroup === 0
    )
      continue;

    if (!groupGolfers.has(currentGroup)) groupGolfers.set(currentGroup, []);
    groupGolfers
      .get(currentGroup)!
      .push({ name, hdcp: col2 ? parseFloat(col2) : null });
  }

  // ── Create groups + golfers, build name lookup ────────────────────────────
  const golferLookup = new Map<
    string,
    { golferId: string; groupId: string }
  >();

  for (const [groupNumber, golfers] of groupGolfers.entries()) {
    const group = await prisma.group.create({
      data: { tournamentId: tournament.id, groupNumber },
    });

    for (const g of golfers) {
      const golfer = await prisma.golfer.create({
        data: { groupId: group.id, name: g.name, hdcp: g.hdcp },
      });
      golferLookup.set(g.name.toLowerCase().trim(), {
        golferId: golfer.id,
        groupId: group.id,
      });
    }
  }

  // ── Parse picks CSV ───────────────────────────────────────────────────────
  // Format: col0 = entry name, col1-8 = golfer name picked for group 1-8
  const picksData = parseCSV(picksPath);
  let entriesSeeded = 0;
  let pickWarnings = 0;

  for (const row of picksData.slice(1)) {
    const entryName = row[0]?.trim();
    if (!entryName || entryName.toLowerCase() === "entrant name") continue;

    const entry = await prisma.entry.create({
      data: { tournamentId: tournament.id, entryName },
    });

    for (let col = 1; col <= 8; col++) {
      const pickedName = row[col]?.trim();
      if (!pickedName) continue;

      const match = golferLookup.get(pickedName.toLowerCase().trim());
      if (!match) {
        console.warn(
          `  ⚠ [${entryName}] Group ${col}: golfer not found — "${pickedName}"`
        );
        pickWarnings++;
        continue;
      }

      await prisma.pick.create({
        data: {
          entryId: entry.id,
          groupId: match.groupId,
          golferId: match.golferId,
        },
      });
    }

    entriesSeeded++;
  }

  console.log(
    `  ✓ ${entriesSeeded} entries, ${golferLookup.size} golfers seeded${pickWarnings > 0 ? `, ${pickWarnings} pick warnings` : ""}`
  );
}

async function main() {
  const dataDir = path.join(__dirname, "seed-data");

  if (!fs.existsSync(dataDir)) {
    console.error(`No seed-data directory found at: ${dataDir}`);
    console.error(
      "Create prisma/seed-data/ and add a folder per tournament."
    );
    process.exit(1);
  }

  const filter = process.argv.slice(2);

  let dirs = fs
    .readdirSync(dataDir)
    .filter((f) => fs.statSync(path.join(dataDir, f)).isDirectory())
    .sort();

  if (filter.length > 0) {
    dirs = dirs.filter((d) => filter.includes(d));
    if (dirs.length === 0) {
      console.error(`No matching folders found for: ${filter.join(", ")}`);
      process.exit(1);
    }
  }

  if (dirs.length === 0) {
    console.log("No tournament folders found in prisma/seed-data/");
    return;
  }

  for (const dir of dirs) {
    await seedTournament(path.join(dataDir, dir));
  }

  console.log("\nAll done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
