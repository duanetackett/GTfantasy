import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Cache the full player list for 24 hours
let cachedPlayers: string[] | null = null;
let cachedPlayerIds: Record<string, number> | null = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const TOTAL_PAGES = 35;

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (cachedPlayers && cachedPlayerIds && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json({ players: cachedPlayers, playerIds: cachedPlayerIds });
  }

  try {
    const pageNums = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

    const pages = await Promise.all(
      pageNums.map((page) =>
        fetch(`https://pegttour.com/players?page=${page}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
        }).then((r) => r.text())
      )
    );

    const allPlayers = new Set<string>();
    const idMap: Record<string, number> = {};
    for (const html of pages) {
      for (const { name, id } of parsePlayersWithIds(html)) {
        allPlayers.add(name);
        idMap[normalizeKey(name)] = id;
      }
    }

    cachedPlayers = Array.from(allPlayers).sort();
    cachedPlayerIds = idMap;
    cacheTime = Date.now();

    return NextResponse.json({ players: cachedPlayers, playerIds: cachedPlayerIds });
  } catch {
    return NextResponse.json({ error: "Error fetching player list." }, { status: 500 });
  }
}

function normalizeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&rsquo;|&lsquo;|&apos;|&#8217;|&#8216;|&#39;|&#039;|&#x2019;|&#x2018;/gi, "")
    .replace(/[''ʼ`']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePlayersWithIds(html: string): { name: string; id: number }[] {
  const results: { name: string; id: number }[] = [];
  const playerMap = new Map<string, string[]>();

  // Each player's first and last name are separate <a> tags linking to the same numeric ID:
  // <a href="/players/1161">Erik</a>  <a href="/players/1161">A</a>
  const linkRegex = /<a[^>]+href="\/players\/(\d+)"[^>]*>([^<]+)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const id = match[1];
    const text = match[2].trim();
    if (!text) continue;
    if (!playerMap.has(id)) playerMap.set(id, []);
    playerMap.get(id)!.push(text);
  }

  for (const [id, parts] of playerMap.entries()) {
    let name: string | null = null;
    if (parts.length >= 2) name = `${parts[0]} ${parts[1]}`;
    else if (parts.length === 1) name = parts[0];
    if (name) results.push({ name, id: parseInt(id) });
  }

  return results;
}
