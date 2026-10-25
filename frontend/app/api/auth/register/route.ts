import { NextResponse } from "next/server";
import { getUsersCollection, getProjectsCollection } from "@/lib/db";
import { hashPassword, createSessionToken, getCookieSettings, checkRateLimit } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const maxRegisterAttempts = process.env.NODE_ENV === "production" ? 15 : 50;
    const rateCheck = checkRateLimit(`register_${ip}`, maxRegisterAttempts, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please wait ${Math.ceil(rateCheck.remainingMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, password, confirmPassword } = body;

    // Validation
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPass = password || "";

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: "Please enter your full name (at least 2 characters)." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!cleanPass || cleanPass.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (cleanPass !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    // Check if user already exists
    const users = await getUsersCollection();
    const existing = await users.findOne({ email: cleanEmail });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in." },
        { status: 409 }
      );
    }

    // Hash password & insert
    const passwordHash = await hashPassword(cleanPass);
    const now = new Date();
    const insertResult = await users.insertOne({
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      plan: "Free Plan",
      createdAt: now,
      updatedAt: now,
    });

    const userId = insertResult.insertedId.toString();

    // Seed default starter project for the new user
    try {
      const projects = await getProjectsCollection();
      await projects.insertOne({
        userId,
        title: "My First Carousel",
        slidesCount: 3,
        thumbnail: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
        presetId: "grid_2x2",
        presetName: "Balanced Quad (2x2)",
        slides: [],
        createdAt: now,
        updatedAt: now,
      });
    } catch (seedErr) {
      console.warn("[Register] Notice seeding starter project:", seedErr);
    }

    // Create session token
    const token = await createSessionToken({
      userId,
      email: cleanEmail,
      name: cleanName,
      plan: "Free Plan",
    });

    const cookieConf = getCookieSettings();
    const res = NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          plan: "Free Plan",
        },
      },
      { status: 201 }
    );

    res.cookies.set({
      name: cookieConf.name,
      value: token,
      httpOnly: cookieConf.httpOnly,
      secure: cookieConf.secure,
      sameSite: cookieConf.sameSite,
      path: cookieConf.path,
      maxAge: cookieConf.maxAge,
    });

    return res;
  } catch (err: any) {
    console.error("[Register Error]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred during account registration. Please try again." },
      { status: 500 }
    );
  }
}
