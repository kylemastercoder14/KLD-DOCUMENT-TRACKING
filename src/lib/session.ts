import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "./prisma";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function getServerSession() {
  const sessionCookie = (await cookies()).get(
    "kld-document-tracking-auth-session"
  );
  if (!sessionCookie?.value) return null;

  try {
    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
    const userId = payload.id as string;
    if (!userId) return null;

    // Query user directly from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user;
  } catch (err) {
    console.error("Server session error:", err);
    return null;
  }
}
