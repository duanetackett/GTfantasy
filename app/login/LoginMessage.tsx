"use client";

import { useSearchParams } from "next/navigation";

export default function LoginMessage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const registered = searchParams.get("registered") === "1";

  return (
    <>
      {registered && (
        <p className="text-sm text-green-700 bg-green-50 rounded p-2">Account created! Please log in.</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded p-2">Invalid email or password.</p>
      )}
    </>
  );
}
