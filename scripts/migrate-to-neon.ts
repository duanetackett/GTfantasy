import { Client } from "pg";

const SOURCE = process.env.SOURCE_DATABASE_URL;
const TARGET = process.env.DATABASE_URL_UNPOOLED;

if (!SOURCE || !TARGET) {
  console.error("SOURCE_DATABASE_URL and DATABASE_URL_UNPOOLED must be set");
  process.exit(1);
}

const source = new Client({ connectionString: SOURCE });
const target = new Client({ connectionString: TARGET });

async function copyTable(table: string, columns: string[]) {
  const quotedCols = columns.map((c) => `"${c}"`).join(", ");
  const { rows } = await source.query(`SELECT ${quotedCols} FROM "${table}"`);
  if (rows.length === 0) {
    console.log(`  ${table}: 0 rows, skipping`);
    return;
  }
  const placeholders = rows
    .map(
      (_, i) =>
        `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(", ")})`
    )
    .join(", ");
  const values = rows.flatMap((row) => columns.map((col) => row[col]));
  await target.query(
    `INSERT INTO "${table}" (${quotedCols}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
    values
  );
  console.log(`  ${table}: ${rows.length} rows`);
}

async function main() {
  await source.connect();
  await target.connect();
  console.log("Connected to both databases.");

  await copyTable("User", [
    "id", "name", "email", "password", "role", "createdAt", "lastLoginAt",
  ]);
  await copyTable("Tournament", [
    "id", "name", "year", "status", "startDate", "pegttourSlug",
    "scoresLastCalculatedAt", "createdAt",
  ]);
  await copyTable("Group", ["id", "tournamentId", "groupNumber"]);
  await copyTable("Golfer", [
    "id", "groupId", "name", "hdcp", "pegtPlayerId", "qualifyingRank",
    "qualifyingBracket", "finalPosition", "bonusTopQualifier",
    "bonusCoursesWon", "coursesWon", "bonusTopFinisher", "bonusMainBracket",
    "bonusPurple", "bonusPink", "finalScore",
  ]);
  await copyTable("Entry", [
    "id", "userId", "tournamentId", "entryName", "totalPoints",
    "paidAt", "disqualified", "createdAt",
  ]);
  await copyTable("Pick", ["id", "entryId", "groupId", "golferId"]);

  await source.end();
  await target.end();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
