"use client";

import { useSignIn, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const { signIn } = useSignIn();
  const { setActive } = useClerk();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    setError("");
    setLoading(true);

    const createResult = await signIn.create({ identifier: email });
    if (createResult.error) {
      setError(createResult.error.message ?? "Could not find that account.");
      setLoading(false);
      return;
    }

    const sendResult = await signIn.resetPasswordEmailCode.sendCode();
    if (sendResult.error) {
      setError(sendResult.error.message ?? "Failed to send reset code.");
      setLoading(false);
      return;
    }

    setStep("code");
    setLoading(false);
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!signIn) return;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);

    const verifyResult = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verifyResult.error) {
      setError(verifyResult.error.message ?? "Invalid or expired code.");
      setLoading(false);
      return;
    }

    const submitResult = await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (submitResult.error) {
      setError(submitResult.error.message ?? "Failed to set new password.");
      setLoading(false);
      return;
    }

    const finalizeResult = await signIn.finalize();
    if (finalizeResult.error) {
      setError(finalizeResult.error.message ?? "Failed to complete sign-in.");
      setLoading(false);
      return;
    }

    if (signIn.createdSessionId) {
      await setActive({ session: signIn.createdSessionId });
      router.push("/dashboard");
    }
  }

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
      <h1 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2 drop-shadow-lg">
        Golden Tee Fantasy<br />
        <span className="text-base sm:text-lg font-normal text-green-300">by Power Events</span>
      </h1>
      <h2 className="text-lg font-semibold text-green-300 mb-6">Reset Your Password</h2>

      <div className="bg-white/10 backdrop-blur rounded-2xl p-8 w-full max-w-sm shadow-xl">
        {step === "email" ? (
          <form onSubmit={sendCode} className="flex flex-col gap-4">
            <p className="text-white/80 text-sm text-center">
              Enter your email and we&apos;ll send you a reset code.
            </p>
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg px-4 py-2 bg-white/20 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors"
            >
              {loading ? "Sending..." : "Send Reset Code"}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            <p className="text-white/80 text-sm text-center">
              Check your email for the code and enter your new password below.
            </p>
            <input
              type="text"
              required
              placeholder="Reset code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-lg px-4 py-2 bg-white/20 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              type="password"
              required
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg px-4 py-2 bg-white/20 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              type="password"
              required
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-lg px-4 py-2 bg-white/20 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2 transition-colors"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setError(""); }}
              className="text-white/50 hover:text-white text-sm text-center transition-colors"
            >
              Back
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a href="/login" className="text-green-400 hover:text-green-300 text-sm transition-colors">
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
