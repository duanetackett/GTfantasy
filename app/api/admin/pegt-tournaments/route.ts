import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

let cache: { years: YearGroup[] } | null = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

export type Tournament = { name: string; slug: string };
export type YearGroup = { year: number; tournaments: Tournament[] };

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (cache && Date.now() - cacheTime < CACHE_TTL) {
    return NextResponse.json(cache);
  }

  try {
    const res = await fetch("https://pegttour.com/tournaments", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const html = await res.text();
    const years = parse(html);

    cache = { years };
    cacheTime = Date.now();

    return NextResponse.json({ years });
  } catch {
    return NextResponse.json({ error: "Failed to fetch tournaments from PEGT." }, { status: 502 });
  }
}

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parse(html: string): YearGroup[] {
  const yearGroups: YearGroup[] = [];
  // Split on <h3> tags to get year sections
  const sections = html.split(/<h3>/i);

  for (const section of sections) {
    const yearMatch = section.match(/^(\d{4})/);
    if (!yearMatch) continue;
    const year = parseInt(yearMatch[1]);

    const tournaments: Tournament[] = [];
    // Find all <h4><a href="/tournaments/[year]/[slug]">NAME</a></h4>
    const linkRegex = /<h4>\s*<a[^>]+href="\/tournaments\/\d+\/([^"]+)"[^>]*>([^<]+)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(section)) !== null) {
      const slug = match[1];
      const name = toTitleCase(match[2].trim());
      tournaments.push({ name, slug });
    }

    if (tournaments.length > 0) {
      yearGroups.push({ year, tournaments });
    }
  }

  return yearGroups.sort((a, b) => b.year - a.year);
}
