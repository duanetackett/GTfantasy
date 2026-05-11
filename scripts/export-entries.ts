/**
 * Usage: npx tsx scripts/export-entries.ts
 * Exports all entries across all tournaments to scripts/exports/entries-<timestamp>.csv
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import * as fs from "fs";
import * as path from "path";

function escape(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function exportEntries() {
  const entries = await prisma.entry.findMany({
    include: {
      user: { select: { name: true, email: true } },
      tournament: { select: { name: true, year: true } },
      picks: {
        include: {
          group: { select: { groupNumber: true } },
          golfer: { select: { name: true, finalScore: true } },
        },
      },
    },
    orderBy: [
      { tournament: { year: "asc" } },
      { tournament: { name: "asc" } },
      { entryName: "asc" },
    ],
  });

  const headers = [
    "Year",
    "Tournament",
    "Entry Name",
    "User Name",
    "User Email",
    "Paid",
    "Disqualified",
    "Total Points",
    "G1 Pick",
    "G1 Score",
    "G2 Pick",
    "G2 Score",
    "G3 Pick",
    "G3 Score",
    "G4 Pick",
    "G4 Score",
    "G5 Pick",
    "G5 Score",
    "G6 Pick",
    "G6 Score",
    "G7 Pick",
    "G7 Score",
    "G8 Pick",
    "G8 Score",
    "Created At",
  ];

  const rows = entries.map((entry) => {
    const picksByGroup: Record<number, { name: string; score: number | null }> = {};
    for (const pick of entry.picks) {
      picksByGroup[pick.group.groupNumber] = {
        name: pick.golfer.name,
        score: pick.golfer.finalScore ?? null,
      };
    }

    const groupCols: (string | number | null)[] = [];
    for (let g = 1; g <= 8; g++) {
      const p = picksByGroup[g];
      groupCols.push(p?.name ?? "");
      groupCols.push(p?.score ?? "");
    }

    return [
      entry.tournament.year,
      entry.tournament.name,
      entry.entryName,
      entry.user?.name ?? "",
      entry.user?.email ?? "",
      entry.paidAt ? "Yes" : "No",
      entry.disqualified ? "Yes" : "No",
      entry.totalPoints ?? "",
      ...groupCols,
      entry.createdAt.toISOString(),
    ];
  });

  const lines = [
    headers.join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];

  const outDir = path.join(__dirname, "exports");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(outDir, `entries-${timestamp}.csv`);
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");

  console.log(`Exported ${entries.length} entries → ${outPath}`);
}

exportEntries().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
