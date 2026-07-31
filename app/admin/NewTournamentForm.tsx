"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Tournament = { name: string; slug: string };
type YearGroup = { year: number; tournaments: Tournament[] };

export default function NewTournamentForm() {
  const router = useRouter();
  const [yearGroups, setYearGroups] = useState<YearGroup[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSlug, setSelectedSlug] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/pegt-tournaments")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setListError(data.error);
        } else {
          setYearGroups(data.years);
          if (data.years.length > 0) setSelectedYear(String(data.years[0].year));
        }
      })
      .catch(() => setListError("Could not load tournament list."))
      .finally(() => setLoadingList(false));
  }, []);

  const MANUAL_TOURNAMENTS: Tournament[] = [
    { name: "World Championship", slug: "__manual__world-championship" },
  ];

  const tournamentsForYear: Tournament[] = [
    ...MANUAL_TOURNAMENTS,
    ...(yearGroups.find((g) => g.year === parseInt(selectedYear))?.tournaments ?? []),
  ];

  const selectedTournament = tournamentsForYear.find((t) => t.slug === selectedSlug);

  function handleYearChange(year: string) {
    setSelectedYear(year);
    setSelectedSlug("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTournament || !startDate) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: selectedTournament.name,
        startDate,
        pegttourSlug: selectedTournament.slug.startsWith("__manual__")
          ? null
          : selectedTournament.slug,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create tournament.");
    } else {
      setSelectedSlug("");
      setStartDate("");
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5">
      <h3 className="font-medium text-gray-700 mb-4">Create New Tournament</h3>

      {listError && <p className="text-sm text-red-600 mb-3">{listError}</p>}
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Year</label>
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(e.target.value)}
            disabled={loadingList}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {loadingList && <option>Loading...</option>}
            {yearGroups.map((g) => (
              <option key={g.year} value={g.year}>{g.year}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Tournament</label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            required
            disabled={loadingList || tournamentsForYear.length === 0}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Select a tournament...</option>
            {tournamentsForYear.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">Start Date</label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedTournament || !startDate}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
