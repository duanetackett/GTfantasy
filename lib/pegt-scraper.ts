const PEGT = "https://pegttour.com";
const HEADERS = { "User-Agent": "Mozilla/5.0" };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ResultEntry {
  normalizedName: string;
  position: number;
  bracket: "Main" | "Purple" | "Pink";
}

export interface QualifyingEntry {
  normalizedName: string;
  score: number;
  gsp: number;
  rank: number;
}

export interface CourseInfo {
  url: string;
  name: string;
}

// ─── Name normalization ───────────────────────────────────────────────────────

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&rsquo;|&lsquo;|&apos;|&#8217;|&#8216;|&#39;|&#039;|&#x2019;|&#x2018;/gi, "") // decode apostrophe HTML entities
    .replace(/[\u2018\u2019\u02BC\u0060\u0027]/g, "")  // strip all apostrophe Unicode variants
    .replace(/\s+/g, " ")
    .trim();
}

function parsePosition(place: string): number {
  // "9-12" → 9, "109+" → 109, "1" → 1
  return parseInt(place.replace(/[^0-9].*/, ""));
}

// ─── Fetch: Results ───────────────────────────────────────────────────────────

export async function fetchResults(year: number, slug: string): Promise<ResultEntry[]> {
  const res = await fetch(`${PEGT}/tournaments/${year}/${slug}/results`, { headers: HEADERS });
  const html = await res.text();
  return parseResults(html);
}

function parseResults(html: string): ResultEntry[] {
  const results: ResultEntry[] = [];
  const bracketMap: Record<string, "Main" | "Purple" | "Pink"> = {
    "main bracket": "Main",
    "purple bracket": "Purple",
    "pink bracket": "Pink",
  };
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let currentBracket: "Main" | "Purple" | "Pink" | null = null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    // Extract all cell text values from this row
    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((c) => c.length > 0);

    // Update current bracket if this row contains a bracket label
    const bracketCell = cells.find((c) => bracketMap[c.toLowerCase()]);
    if (bracketCell) currentBracket = bracketMap[bracketCell.toLowerCase()];

    // Extract player name from link within this row
    const nameMatch = rowHtml.match(/<a[^>]+href="\/players\/\d+"[^>]*>([^<]+)<\/a>/i);
    if (!nameMatch) continue;

    if (!currentBracket) continue;

    if (cells.length < 2) continue;

    // Place is a numeric cell (handles "1", "9-12", "109+")
    const placeCell = cells.find((c) => /^\d/.test(c));
    if (!placeCell) continue;

    results.push({
      normalizedName: normalizeName(nameMatch[1]),
      position: parsePosition(placeCell),
      bracket: currentBracket,
    });
  }

  return results;
}

// ─── Fetch: Leaderboard (overall qualifier) ───────────────────────────────────

export async function fetchLeaderboard(year: number, slug: string): Promise<QualifyingEntry[]> {
  const res = await fetch(`${PEGT}/tournaments/${year}/${slug}/leaderboard`, { headers: HEADERS });
  const html = await res.text();
  return parseRankedTable(html);
}

// ─── Fetch: Qualifier course list ─────────────────────────────────────────────

export async function fetchQualifierCourses(year: number, slug: string): Promise<CourseInfo[]> {
  const res = await fetch(`${PEGT}/tournaments/${year}/${slug}/qualifier`, { headers: HEADERS });
  const html = await res.text();
  return parseCourseList(html, year, slug);
}

function parseCourseList(html: string, year: number, slug: string): CourseInfo[] {
  const courses: CourseInfo[] = [];
  const re = new RegExp(
    `href=["'](/tournaments/${year}/${slug}/qualifier/(\\d+))["'][^>]*>([^<]+)<`,
    "gi"
  );
  let m;
  const seen = new Set<string>();
  while ((m = re.exec(html)) !== null) {
    const path = m[1];
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);
    courses.push({ url: `${PEGT}${path}`, name: m[3].trim() });
  }
  return courses;
}

// ─── Fetch: Pink bracket loser positions ─────────────────────────────────────
// Returns a map of normalized last name → position
// Parses position section labels directly from the page (e.g. "49th-64th" → 145)
// rather than relying on round indices, which vary by bracket size.

export async function fetchPinkBracketPositions(year: number, slug: string): Promise<Map<string, number>> {
  const res = await fetch(`${PEGT}/tournaments/${year}/${slug}/pink-bracket`, { headers: HEADERS });
  const html = await res.text();
  return parsePinkBracketLoserRounds(html);
}

function parsePinkBracketLoserRounds(html: string): Map<string, number> {
  const positionMap = new Map<string, number>();

  const loserStart = html.indexOf('id="elimination-bracket"');
  if (loserStart === -1) return positionMap;
  const loserHtml = html.slice(loserStart);

  // Position label text → starting overall position in the tournament
  const labelToPosition: Record<string, number> = {
    "49th-64th": 145,
    "33rd-48th": 129,
    "25th-32nd": 121,
    "17th-24th": 113,
    "13th-16th": 109,
  };

  // Find <h6> elements that contain plain text position labels (no child <a> tag).
  // Player name <h6>s always contain an <a href="/players/...">, so this safely
  // distinguishes section headers from player entries.
  const labelRegex = /<h6[^>]*>([^<]+)<\/h6>/gi;
  const sections: { index: number; position: number }[] = [];
  let m;

  while ((m = labelRegex.exec(loserHtml)) !== null) {
    const text = m[1].trim();
    const position = labelToPosition[text];
    if (position !== undefined) {
      sections.push({ index: m.index, position });
    }
  }

  // For each labelled section, find losers (match-row without is-winner) up to the next label
  for (let i = 0; i < sections.length; i++) {
    const start = sections[i].index;
    const end = i + 1 < sections.length ? sections[i + 1].index : loserHtml.length;
    const sectionHtml = loserHtml.slice(start, end);
    const position = sections[i].position;

    const loserRowRegex = /class="match-row "[\s\S]*?<a[^>]+href="\/players\/\d+"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = loserRowRegex.exec(sectionHtml)) !== null) {
      const key = extractAbbrevKey(match[1].trim());
      if (key) positionMap.set(key, position);
    }
  }

  return positionMap;
}

// ─── Fetch: Purple bracket loser positions ────────────────────────────────────
// Returns a map of normalized last name → position (81 = 0-2, 65 = 1-2)

export async function fetchPurpleBracketPositions(year: number, slug: string): Promise<Map<string, number>> {
  const res = await fetch(`${PEGT}/tournaments/${year}/${slug}/purple-bracket`, { headers: HEADERS });
  const html = await res.text();
  return parsePurpleBracketLoserRounds(html);
}

function extractAbbrevKey(abbrevName: string): string {
  // "R. Carter" → "r carter", "P. Same" → "p same", "K. SImpson" → "k simpson"
  // Keeps first initial to distinguish players sharing a last name (e.g. Don vs Rich Carter)
  return abbrevName.toLowerCase().replace(/\.\s*/g, " ").replace(/\s+/g, " ").trim();
}

function parsePurpleBracketLoserRounds(html: string): Map<string, number> {
  const positionMap = new Map<string, number>();

  const loserStart = html.indexOf('id="elimination-bracket"');
  if (loserStart === -1) return positionMap;
  const loserHtml = html.slice(loserStart);

  // Split loser bracket into rounds by finding each round container div
  const roundStarts: number[] = [];
  const roundRegex = /<div class="tournament-bracket__round/g;
  let m;
  while ((m = roundRegex.exec(loserHtml)) !== null) {
    roundStarts.push(m.index);
  }

  // Extract each round's HTML slice
  const rounds = roundStarts.map((start, i) => {
    const end = i + 1 < roundStarts.length ? roundStarts[i + 1] : loserHtml.length;
    return loserHtml.slice(start, end);
  });

  // Round 1 losers → 1-2 → position 65
  // Round 2 losers → 0-2 → position 81
  const roundPositions: Record<number, number> = { 0: 65, 1: 81 };

  for (const [roundIdx, position] of Object.entries(roundPositions)) {
    const roundHtml = rounds[Number(roundIdx)];
    if (!roundHtml) continue;

    // Find loser rows: class="match-row " (no is-winner)
    const loserRowRegex = /class="match-row "[\s\S]*?<a[^>]+href="\/players\/\d+"[^>]*>([^<]+)<\/a>/g;
    let match;
    while ((match = loserRowRegex.exec(roundHtml)) !== null) {
      const key = extractAbbrevKey(match[1].trim());
      if (key) positionMap.set(key, position);
    }
  }

  return positionMap;
}

// ─── Fetch: Single course qualifier ──────────────────────────────────────────

export async function fetchCourseQualifier(courseUrl: string): Promise<QualifyingEntry[]> {
  const res = await fetch(courseUrl, { headers: HEADERS });
  const html = await res.text();
  return parseRankedTable(html);
}

// ─── Shared ranked table parser (leaderboard + course qualifier) ──────────────
// Row: [rank?] | state-flag | country-flag | name-link | score(s) | [total] | gsp

function parseRankedTable(html: string): QualifyingEntry[] {
  const entries: QualifyingEntry[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rank = 1;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1];

    const nameMatch = rowHtml.match(/<a[^>]+href="\/players\/\d+"[^>]*>([^<]+)<\/a>/i);
    if (!nameMatch) continue;

    // Get all numeric cell values (exclude flag cells)
    const numericCells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      .filter((c) => /^-?\d+$/.test(c))
      .map(Number);

    if (numericCells.length < 2) continue;

    // Last value = GSP, second to last = total/score
    const gsp = numericCells[numericCells.length - 1];
    const score = numericCells[numericCells.length - 2];

    entries.push({
      normalizedName: normalizeName(nameMatch[1]),
      score,
      gsp,
      rank: rank++,
    });
  }

  return entries;
}
