import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export default async function ScoresPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      groups: {
        orderBy: { groupNumber: "asc" },
        include: {
          golfers: { orderBy: { name: "asc" } },
        },
      },
    },
  });

  if (!tournament) notFound();

  if (tournament.status === "UPCOMING" || tournament.status === "PICKS_OPEN") {
    redirect("/dashboard");
  }

  const scoresCalculated = tournament.groups.some((g) =>
    g.golfers.some((go) => go.finalScore !== null)
  );

  const COL_H = "text-center px-1 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight";

  return (
    <div>
      <p className="text-sm text-gray-300 mb-4">
        {scoresCalculated
          ? "Scores for all golfers by group."
          : "Scores will appear here after qualifying results are entered."}
      </p>

      <div className="space-y-3">
        {tournament.groups.map((group) => (
          <div key={group.id} className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-700 px-4 py-1.5">
              <h3 className="font-bold text-white text-xs tracking-wide uppercase">Group {group.groupNumber}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse table-fixed">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="text-left px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Golfer</th>
                    <th className="text-center px-2 py-1.5 text-xs font-bold text-gray-700 uppercase tracking-wide w-16">Final<br />Score</th>
                    <th className={`${COL_H} w-12`}>Qual</th>
                    <th className={`${COL_H} w-14`}>Bracket</th>
                    <th className={`${COL_H} w-12`}>Place</th>
                    <th className={`${COL_H} w-12`}>Top<br />Qual</th>
                    <th className={`${COL_H} w-14`}>Courses<br />Won</th>
                    <th className={`${COL_H} w-14`}>Top<br />Finish</th>
                    <th className={`${COL_H} w-14`}>Main<br />Bracket</th>
                    <th className={`${COL_H} w-12`}>Purple</th>
                    <th className={`${COL_H} w-12`}>Pink</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.golfers.map((golfer, i) => (
                    <tr key={golfer.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-1 font-medium text-gray-800 truncate">{golfer.name}</td>
                      <td className="text-center px-2 py-1 font-bold text-gray-900">
                        {golfer.finalScore !== null ? golfer.finalScore : "—"}
                      </td>
                      <td className="text-center px-1 py-1 text-gray-600">{golfer.qualifyingRank ?? "—"}</td>
                      <td className="text-center px-1 py-1 text-gray-600">{golfer.qualifyingBracket ?? "—"}</td>
                      <td className="text-center px-1 py-1 text-gray-600">{golfer.finalPosition ?? "—"}</td>
                      <td className="text-center px-1 py-1 text-blue-600 font-medium">
                        {golfer.bonusTopQualifier ? golfer.bonusTopQualifier : ""}
                      </td>
                      <td className="text-center px-1 py-1 text-blue-600 font-medium">
                        {golfer.bonusCoursesWon ? (
                          <span title={golfer.coursesWon.join(", ")} className="cursor-help underline decoration-dotted">
                            {golfer.bonusCoursesWon}
                          </span>
                        ) : ""}
                      </td>
                      <td className="text-center px-1 py-1 text-purple-600 font-medium">
                        {golfer.bonusTopFinisher ? golfer.bonusTopFinisher : ""}
                      </td>
                      <td className="text-center px-1 py-1 text-green-600 font-medium">
                        {golfer.bonusMainBracket ? golfer.bonusMainBracket : ""}
                      </td>
                      <td className="text-center px-1 py-1 text-purple-600 font-medium">
                        {golfer.bonusPurple ? golfer.bonusPurple : ""}
                      </td>
                      <td className="text-center px-1 py-1 text-pink-600 font-medium">
                        {golfer.bonusPink ? golfer.bonusPink : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
