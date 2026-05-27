import Navbar from "@/components/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-slate-900 to-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">{children}</main>
    </div>
  );
}
