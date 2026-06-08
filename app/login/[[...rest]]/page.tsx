import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-slate-900 to-gray-950 flex flex-col items-center justify-center p-8">
      <a href="https://www.pegttour.com" target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pegt-logo.png"
          alt="PEGT Golden Tee Tour Logo"
          width={200}
          height={200}
          className="mb-6 hover:opacity-80 transition-opacity cursor-pointer"
        />
      </a>
      <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6 drop-shadow-lg">
        Golden Tee Fantasy<br />
        <span className="text-base sm:text-lg font-normal text-green-300">by Power Events</span>
      </h1>
      <SignIn fallbackRedirectUrl="/dashboard" />
      <p className="mt-4 text-white/50 text-sm">
        Forgot your password?{" "}
        <a href="/forgot-password" className="text-green-400 hover:text-green-300 transition-colors">
          Reset it here
        </a>
      </p>
    </div>
  );
}
