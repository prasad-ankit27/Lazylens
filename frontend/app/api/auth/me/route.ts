import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getUsersCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
    }

    // Verify user still exists in database
    let plan = session.plan || "Free Plan";
    let name = session.name;
    let email = session.email;

    try {
      const users = await getUsersCollection();
      const user = await users.findOne(
        { _id: new ObjectId(session.userId) },
        { projection: { passwordHash: 0 } }
      );
      if (user) {
        name = user.name;
        email = user.email;
        plan = user.plan || "Free Plan";
      }
    } catch {
      // Fallback to session token contents if DB is temporarily unreachable
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        name,
        email,
        plan,
      },
    });
  } catch (err: any) {
    console.error("[Auth Me Error]", err);
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
}
