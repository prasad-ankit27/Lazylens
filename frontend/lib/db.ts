import { MongoClient, Db, Collection, ObjectId } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export function getMongoClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    const errorMsg =
      "Missing MONGO_URI: The MONGO_URI environment variable is not defined on this service. Please set MONGO_URI in your Render service environment variables.";
    console.error(`[MongoDB Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  if (process.env.NODE_ENV === "development") {
    // In development mode, use a global variable to preserve connection across HMR reloads
    if (!global._mongoClientPromise) {
      const devClient = new MongoClient(uri);
      global._mongoClientPromise = devClient.connect();
    }
    return global._mongoClientPromise;
  }

  // In production mode, reuse clientPromise
  if (!clientPromise) {
    client = new MongoClient(uri);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb(): Promise<Db> {
  const c = await getMongoClientPromise();
  return c.db("lazylens");
}

export interface UserDocument {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  plan: "Free Plan" | "Pro Plan";
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectDocument {
  _id?: ObjectId;
  userId: string;
  title: string;
  slidesCount: number;
  thumbnail: string;
  presetId: string;
  presetName: string;
  slides: any[];
  createdAt: Date;
  updatedAt: Date;
}

let indexesInitialized = false;

export async function initIndexes() {
  if (indexesInitialized) return;
  try {
    const db = await getDb();
    const users = db.collection<UserDocument>("users");
    await users.createIndex({ email: 1 }, { unique: true });

    const projects = db.collection<ProjectDocument>("projects");
    await projects.createIndex({ userId: 1 });
    await projects.createIndex({ updatedAt: -1 });

    indexesInitialized = true;
  } catch (err) {
    console.warn("[MongoDB] Index initialization notice:", err);
  }
}

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  await initIndexes();
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export async function getProjectsCollection(): Promise<Collection<ProjectDocument>> {
  await initIndexes();
  const db = await getDb();
  return db.collection<ProjectDocument>("projects");
}

export { ObjectId };
export default getMongoClientPromise;
