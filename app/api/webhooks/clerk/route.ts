import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

type ClerkUserEvent = {
  type: string;
  data: {
    id: string;
    user_id?: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
  };
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret === "whsec_placeholder") {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkUserEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = event;
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || "Unknown";

  if (type === "user.created") {
    if (!primaryEmail) {
      return NextResponse.json({ error: "No email on user" }, { status: 400 });
    }

    const existingByEmail = await prisma.user.findUnique({ where: { email: primaryEmail } });

    if (existingByEmail) {
      await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { clerkId: data.id, name },
      });
    } else {
      await prisma.user.create({
        data: { clerkId: data.id, name, email: primaryEmail },
      });
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(data.id, {
      publicMetadata: { role: existingByEmail?.role ?? "USER" },
    });
  }

  if (type === "user.updated") {
    if (primaryEmail) {
      await prisma.user.updateMany({
        where: { clerkId: data.id },
        data: { name, email: primaryEmail },
      });
    }
  }

  if (type === "session.created" && data.user_id) {
    await prisma.user.updateMany({
      where: { clerkId: data.user_id },
      data: { lastLoginAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
