export default function RulesPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-white">Rules &amp; How to Play</h1>

      {/* Donation & Payment */}
      <section className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-700 px-6 py-3">
          <h2 className="font-bold text-white tracking-wide uppercase text-sm">Donation &amp; Payment</h2>
        </div>
        <div className="px-6 py-5 text-sm text-gray-800 leading-relaxed space-y-4">
          <p>
            Donation is <strong>$40</strong>.
          </p>
          <p className="text-red-600 font-bold">
            Entries without payment at 11:00 tournament time on Saturday will be deleted.
          </p>
          <p className="font-semibold text-gray-700">If you are not attending in person, payment options are:</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
              <p className="font-semibold text-gray-800 mb-1">PayPal</p>
              <p className="text-green-700 font-medium">watchez@charter.net</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">
              <p className="font-semibold text-gray-800 mb-1">Venmo</p>
              <p className="text-green-700 font-medium">@Steven-Sobel-2</p>
              <p className="text-xs text-gray-500 mt-1">Last four digits of phone: 3217</p>
            </div>
          </div>
          <p className="text-red-600 font-bold text-base">
            ⚠ Do not mention anything about a pool. If you need to put something in say "Thanks"
          </p>
        </div>
      </section>

      {/* How to Pick */}
      <section className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-700 px-6 py-3">
          <h2 className="font-bold text-white tracking-wide uppercase text-sm">Making Your Picks</h2>
        </div>
        <div className="px-6 py-5 text-sm text-gray-800 leading-relaxed space-y-3">
          <p>
            Choose <strong>one golfer from each of the 8 groups</strong>. Each golfer is seeded by handicap, with the strongest players in Group 1.
          </p>
          <p>
            Each golfer's <strong>finish in bracket play is their base score</strong>. The lowest total score across all 8 golfers wins.
          </p>
          <div className="bg-gray-50 rounded-lg border border-gray-200 px-5 py-4 space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Examples</p>
            <p>If your golfer finishes <strong>9th–12th</strong>, their score is <strong>9</strong></p>
            <p>If your golfer finishes <strong>25th–32nd</strong>, their score is <strong>25</strong></p>
            <p>If your golfer <strong>wins the Purple Bracket</strong>, their score is <strong>33</strong> (not 1)</p>
          </div>
        </div>
      </section>

      {/* Bonus Points */}
      <section className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-700 px-6 py-3">
          <h2 className="font-bold text-white tracking-wide uppercase text-sm">Bonus Points</h2>
        </div>
        <div className="px-6 py-5 text-sm text-gray-800">
          <p className="mb-4 leading-relaxed">
            Bonus points are <strong>subtracted</strong> from a golfer's base score for special achievements — the bigger the bonus, the better!
          </p>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">If your golfer…</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide w-32">Bonus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className="bg-white">
                <td className="px-4 py-3">Wins a course in the qualifier</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−3 per course</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3">Is the overall top qualifier</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−6</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3">Wins the Main Bracket</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−8</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3">Finishes 2nd in the Main Bracket</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−6</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3">Finishes 3rd in the Main Bracket</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−4</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3">Finishes 4th in the Main Bracket</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−3</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3">Is the top finisher from Fantasy Groups 1, 2, or 3</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−5</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-4 py-3">Wins the Purple Bracket</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−5</td>
              </tr>
              <tr className="bg-white">
                <td className="px-4 py-3">Wins the Pink Bracket</td>
                <td className="px-4 py-3 text-center font-bold text-green-700">−3</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-center font-bold text-gray-800">LOWEST TOTAL WINS</p>
        </div>
      </section>

      {/* No-Shows */}
      <section className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gray-700 px-6 py-3">
          <h2 className="font-bold text-white tracking-wide uppercase text-sm">Golfer No-Shows</h2>
        </div>
        <div className="px-6 py-5 text-sm text-gray-800 leading-relaxed space-y-3">
          <p>
            If a golfer no-shows for the qualifier, you will have the option to pick another golfer before qualifying begins.
            If you picked a golfer that is either <strong>replaced or withdrawn</strong> (no replacement), the app will notify you
            on the dashboard that you need to check your picks.
          </p>
          <p>
            If the withdrawn golfer is <strong>replaced</strong>, you will get the new golfer if you don't pick a new one.
            If the golfer is <strong>not replaced</strong> and you don't pick a new one, your entry will be <strong>void and your money refunded</strong>.
          </p>
          <p>
            If your golfer <strong>no-shows for Sunday Match Play</strong>, they will score as last place in their respective bracket.
          </p>
        </div>
      </section>

    </div>
  );
}
