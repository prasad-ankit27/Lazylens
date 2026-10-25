import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { getProjectsCollection } from "@/lib/db";
import { ObjectId } from "mongodb";

// GET /api/projects - Returns only projects belonging to the authenticated user
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const projects = await getProjectsCollection();
    const list = await projects
      .find({ userId: session.userId })
      .sort({ updatedAt: -1 })
      .toArray();

    const formatted = list.map((p) => ({
      id: p._id?.toString(),
      title: p.title,
      slidesCount: p.slidesCount || 1,
      thumbnail: p.thumbnail,
      presetId: p.presetId,
      presetName: p.presetName,
      slides: p.slides || [],
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "Recently",
    }));

    return NextResponse.json({ success: true, projects: formatted });
  } catch (err: any) {
    console.error("[Projects GET Error]", err);
    return NextResponse.json({ error: "Failed to fetch projects." }, { status: 500 });
  }
}

// POST /api/projects - Saves or updates a project for the authenticated user
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, slidesCount, thumbnail, presetId, presetName, slides } = body;

    const cleanTitle = (title || "Untitled Carousel").trim();
    const projects = await getProjectsCollection();
    const now = new Date();

    if (id && ObjectId.isValid(id)) {
      // Update existing project with strict user ownership verification
      const existing = await projects.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      }

      if (existing.userId !== session.userId) {
        return NextResponse.json({ error: "Forbidden. You do not own this project." }, { status: 403 });
      }

      await projects.updateOne(
        { _id: new ObjectId(id), userId: session.userId },
        {
          $set: {
            title: cleanTitle,
            slidesCount: slidesCount || existing.slidesCount,
            thumbnail: thumbnail || existing.thumbnail,
            presetId: presetId || existing.presetId,
            presetName: presetName || existing.presetName,
            slides: slides || existing.slides,
            updatedAt: now,
          },
        }
      );

      return NextResponse.json({ success: true, id, message: "Project updated successfully." });
    } else {
      // Create new project
      const insertResult = await projects.insertOne({
        userId: session.userId,
        title: cleanTitle,
        slidesCount: slidesCount || 1,
        thumbnail:
          thumbnail ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
        presetId: presetId || "grid_2x2",
        presetName: presetName || "Balanced Quad (2x2)",
        slides: slides || [],
        createdAt: now,
        updatedAt: now,
      });

      return NextResponse.json({
        success: true,
        id: insertResult.insertedId.toString(),
        message: "Project created successfully.",
      });
    }
  } catch (err: any) {
    console.error("[Projects POST Error]", err);
    return NextResponse.json({ error: "Failed to save project." }, { status: 500 });
  }
}

// DELETE /api/projects - Deletes a user's project
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID." }, { status: 400 });
    }

    const projects = await getProjectsCollection();
    const existing = await projects.findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    if (existing.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden. You do not own this project." }, { status: 403 });
    }

    await projects.deleteOne({ _id: new ObjectId(id), userId: session.userId });
    return NextResponse.json({ success: true, message: "Project deleted successfully." });
  } catch (err: any) {
    console.error("[Projects DELETE Error]", err);
    return NextResponse.json({ error: "Failed to delete project." }, { status: 500 });
  }
}
