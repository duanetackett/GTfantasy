import Navbar from "@/components/Navbar";

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-slate-900 to-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">{children}</main>
    </div>
  );
}
