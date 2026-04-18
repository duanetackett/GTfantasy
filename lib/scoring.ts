import { prisma } from "@/lib/prisma";
import {
  fetchResults,
  fetchLeaderboard,
  fetchQualifierCourses,
  fetchCourseQualifier,
  fetchPurpleBracketPositions,
  fetchPinkBracketPositions,
  normalizeName,
  type ResultEntry,
  type QualifyingEntry,
} from "@/lib/pegt-scraper";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GolferScore {
  golferId: string;
  golferName: string;
  groupNumber: number;
  isDNP: boolean;
  qualifyingRank: number | null;
  qualifyingBracket: "Main" | "Purple" | "Pink" | "Copper" | null;
  baseScore: number | null;
  bonusOverallQualifier: number;   // -6 or 0
  bonusCourseQualifier: number;    // -3 per course (can stack)
  coursesWon: string[];            // names of courses this golfer topped
  bonusTier: number;               // -5 or 0 (best in group 1/2/3)
  bonusMainBracket: number;        // -8/-6/-4/-3 for Main Bracket 1st-4th
  bonusPurple: number;             // -5 or 0
  bonusPink: number;               // -3 or 0
  totalScore: number | null;       // null = DNP
}

function getQualifyingBracket(rank: number): "Main" | "Purple" | "Pink" | "Copper" {
  if (rank <= 32) return "Main";
  if (rank <= 96) return "Purple";
  if (rank <= 160) return "Pink";
  return "Copper";
}

// ─── Main calculation ─────────────────────────────────────────────────────────

export async function calculateScores(tournamentId: string): Promise<GolferScore[]> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      groups: {
        orderBy: { groupNumber: "asc" },
        include: { golfers: true },
      },
    },
  });

  if (!tournament?.pegttourSlug) {
    throw new Error("Tournament has no PEGT slug configured.");
  }

  const year = tournament.year;
  const slug = tournament.pegttourSlug;

  // ── Scrape all needed data in parallel ──
  const [results, leaderboard, courses, purpleBracketPositions, pinkBracketPositions] = await Promise.all([
    fetchResults(year, slug),
    fetchLeaderboard(year, slug),
    fetchQualifierCourses(year, slug),
    fetchPurpleBracketPositions(year, slug),
    fetchPinkBracketPositions(year, slug),
  ]);

  const courseQualifiers = await Promise.all(
    courses.map((c) => fetchCourseQualifier(c.url))
  );

  // ── Build lookup maps ──
  const resultMap = new Map<string, ResultEntry>();
  for (const r of results) resultMap.set(r.normalizedName, r);

  const leaderboardMap = new Map<string, QualifyingEntry>();
  for (const q of leaderboard) leaderboardMap.set(q.normalizedName, q);

  // Top overall qualifier: rank 1 on leaderboard (already sorted by score asc, gsp desc)
  const topOverallQualifier = leaderboard[0]?.normalizedName ?? null;

  // Top qualifier per course: map normalizedName → course names won
  const courseWinsMap = new Map<string, string[]>();
  courseQualifiers.forEach((cq, i) => {
    const topName = cq[0]?.normalizedName;
    if (topName) {
      if (!courseWinsMap.has(topName)) courseWinsMap.set(topName, []);
      courseWinsMap.get(topName)!.push(courses[i].name);
    }
  });

  // ── Score each golfer ──
  const scores: GolferScore[] = [];

  for (const group of tournament.groups) {
    for (const golfer of group.golfers) {
      const norm = normalizeName(golfer.name);
      const result = resultMap.get(norm);
      const isDNP = !result;

      const lbEntry = leaderboardMap.get(norm);
      const qualifyingRank = lbEntry?.rank ?? null;

      // For purple bracket players at position 65, resolve true position
      // via the purple bracket page (0-2 → 81, 1-2 → 65)
      // Key format: "first_initial last_name" (e.g. "r carter") to handle shared last names
      let baseScore = result?.position ?? null;
      if (result && result.bracket === "Purple" && result.position === 65) {
        const parts = norm.split(" ");
        const key = parts.length >= 2 ? `${parts[0][0]} ${parts[parts.length - 1]}` : norm;
        const resolvedPosition = purpleBracketPositions.get(key);
        if (resolvedPosition !== undefined) baseScore = resolvedPosition;
      }

      // For pink bracket players at position 109 (the "109+" bucket on the results page),
      // resolve true position via the pink bracket page
      if (result && result.bracket === "Pink" && result.position === 109) {
        const parts = norm.split(" ");
        const key = parts.length >= 2 ? `${parts[0][0]} ${parts[parts.length - 1]}` : norm;
        const resolvedPosition = pinkBracketPositions.get(key);
        if (resolvedPosition !== undefined) baseScore = resolvedPosition;
      }

      const score: GolferScore = {
        golferId: golfer.id,
        golferName: golfer.name,
        groupNumber: group.groupNumber,
        isDNP,
        qualifyingRank,
        qualifyingBracket: qualifyingRank !== null ? getQualifyingBracket(qualifyingRank) : null,
        baseScore,
        bonusOverallQualifier: 0,
        bonusCourseQualifier: 0,
        coursesWon: [],
        bonusTier: 0,
        bonusMainBracket: 0,
        bonusPurple: 0,
        bonusPink: 0,
        totalScore: null,
      };

      if (!isDNP && result) {
        // Overall qualifier bonus (-6)
        if (norm === topOverallQualifier) {
          score.bonusOverallQualifier = -6;
        }

        // Course qualifier bonus (-3 per course)
        const wonCourses = courseWinsMap.get(norm) ?? [];
        if (wonCourses.length > 0) {
          score.coursesWon = wonCourses;
          score.bonusCourseQualifier = -3 * wonCourses.length;
        }

        // Main bracket top 4 bonus
        if (result.bracket === "Main") {
          const mainBonuses: Record<number, number> = { 1: -8, 2: -6, 3: -4, 4: -3 };
          score.bonusMainBracket = mainBonuses[result.position] ?? 0;
        }

        // Purple bracket winner bonus (-5): player at position 33
        if (result.position === 33 && result.bracket === "Purple") {
          score.bonusPurple = -5;
        }

        // Pink bracket winner bonus (-3): player at position 97
        if (result.position === 97 && result.bracket === "Pink") {
          score.bonusPink = -3;
        }
      }

      scores.push(score);
    }
  }

  // ── Tier bonuses: best finisher in groups 1-3 ──
  for (let groupNum = 1; groupNum <= 3; groupNum++) {
    const groupScores = scores.filter(
      (s) => s.groupNumber === groupNum && !s.isDNP && s.baseScore !== null
    );
    if (groupScores.length === 0) continue;

    // Sort by baseScore asc, tiebreak by qualifying rank asc (lower = better)
    groupScores.sort((a, b) => {
      const scoreDiff = (a.baseScore ?? 999) - (b.baseScore ?? 999);
      if (scoreDiff !== 0) return scoreDiff;
      const rankA = leaderboardMap.get(normalizeName(a.golferName))?.rank ?? 9999;
      const rankB = leaderboardMap.get(normalizeName(b.golferName))?.rank ?? 9999;
      return rankA - rankB;
    });

    groupScores[0].bonusTier = -5;
  }

  // ── Calculate total scores ──
  for (const s of scores) {
    if (!s.isDNP) {
      s.totalScore =
        (s.baseScore ?? 0) +
        s.bonusOverallQualifier +
        s.bonusCourseQualifier +
        s.bonusTier +
        s.bonusMainBracket +
        s.bonusPurple +
        s.bonusPink;
    }
  }

  return scores;
}

// ─── Save scores to DB ────────────────────────────────────────────────────────

export async function saveScores(tournamentId: string, scores: GolferScore[]): Promise<void> {
  // Update each golfer's finalPosition and finalScore
  await Promise.all(
    scores.map((s) =>
      prisma.golfer.update({
        where: { id: s.golferId },
        data: {
          qualifyingRank: s.qualifyingRank,
          qualifyingBracket: s.qualifyingBracket,
          finalPosition: s.baseScore,
          bonusTopQualifier: s.bonusOverallQualifier,
          bonusCoursesWon: s.bonusCourseQualifier,
          coursesWon: s.coursesWon,
          bonusTopFinisher: s.bonusTier,
          bonusMainBracket: s.bonusMainBracket,
          bonusPurple: s.bonusPurple,
          bonusPink: s.bonusPink,
          finalScore: s.totalScore,
        },
      })
    )
  );

  // Recalculate entry totalPoints
  const entries = await prisma.entry.findMany({
    where: { tournamentId },
    include: {
      picks: {
        include: { golfer: true },
      },
    },
  });

  await Promise.all(
    entries.map((entry) => {
      const isDQ = entry.picks.length < 8 || entry.picks.some((pick) => pick.golfer.finalScore === null);
      const total = isDQ
        ? null
        : entry.picks.reduce((sum, pick) => sum + (pick.golfer.finalScore ?? 0), 0);
      return prisma.entry.update({
        where: { id: entry.id },
        data: { totalPoints: total, disqualified: isDQ },
      });
    })
  );
}
