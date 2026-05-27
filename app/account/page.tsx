import { UserProfile } from "@clerk/nextjs";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">My Account</h1>
      <p className="text-sm text-gray-300 mb-6">Manage your profile, email, and password.</p>
      <UserProfile />
    </div>
  );
}
