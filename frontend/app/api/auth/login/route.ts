import { NextResponse } from "next/server";
import { getUsersCollection } from "@/lib/db";
import { verifyPassword, createSessionToken, getCookieSettings, checkRateLimit } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const maxLoginAttempts = process.env.NODE_ENV === "production" ? 10 : 40;
    const rateCheck = checkRateLimit(`login_${ip}`, maxLoginAttempts, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${Math.ceil(rateCheck.remainingMs / 1000)} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPass = password || "";

    if (!cleanEmail || !cleanPass) {
      return NextResponse.json(
        { error: "Please provide both email and password." },
        { status: 400 }
      );
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: cleanEmail });

    // Protect against timing attacks / enumeration
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(cleanPass, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const userId = user._id.toString();
    const token = await createSessionToken({
      userId,
      email: user.email,
      name: user.name,
      plan: user.plan || "Free Plan",
    });

    const cookieConf = getCookieSettings();
    const res = NextResponse.json({
      success: true,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        plan: user.plan || "Free Plan",
      },
    });

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
    console.error("[Login Error]", err);
    const msg = err?.message || "";
    if (msg.includes("Missing MONGO_URI") || msg.includes("MONGO_URI") || msg.includes("Invalid scheme") || msg.includes("topology")) {
      return NextResponse.json(
        { error: "Database not connected. Please ensure MONGO_URI is added to your Render frontend environment variables." },
        { status: 500 }
      );
    }
    if (msg.includes("SSL alert number 80") || msg.includes("alert internal error") || msg.includes("tlsv1 alert")) {
      return NextResponse.json(
        {
          error:
            "MongoDB Atlas blocked the connection: Render's IP is not whitelisted. In MongoDB Atlas, go to Network Access -> Add IP Address -> 'Allow Access From Anywhere' (0.0.0.0/0).",
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: err?.message || "An unexpected error occurred during login. Please try again." },
      { status: 500 }
    );
  }
}
