import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-950 via-slate-900 to-gray-950">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 mb-6 text-sm border-b border-white/10 pb-3">
            <Link href="/admin" className="text-green-400 font-medium hover:text-green-300 transition">
              Tournaments
            </Link>
            <Link href="/admin/users" className="text-green-400 font-medium hover:text-green-300 transition">
              Users
            </Link>
            <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
              ← Back to Dashboard
            </Link>
          </div>
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
