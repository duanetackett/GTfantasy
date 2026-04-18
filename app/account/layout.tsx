import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gradient-to-br from-green-950 via-slate-900 to-gray-950">
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-8">{children}</main>
      </div>
    </SessionProvider>
  );
}
