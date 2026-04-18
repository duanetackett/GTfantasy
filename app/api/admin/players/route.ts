import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Cache the full player list for 24 hours
let cachedPlayers: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const TOTAL_PAGES = 35;

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (cachedPlayers && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json({ players: cachedPlayers });
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
    for (const html of pages) {
      for (const name of parsePlayers(html)) {
        allPlayers.add(name);
      }
    }

    cachedPlayers = Array.from(allPlayers).sort();
    cacheTime = Date.now();

    return NextResponse.json({ players: cachedPlayers });
  } catch {
    return NextResponse.json({ error: "Error fetching player list." }, { status: 500 });
  }
}

function parsePlayers(html: string): string[] {
  const names: string[] = [];
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

  for (const parts of playerMap.values()) {
    if (parts.length >= 2) {
      names.push(`${parts[0]} ${parts[1]}`);
    } else if (parts.length === 1) {
      names.push(parts[0]);
    }
  }

  return names;
}
