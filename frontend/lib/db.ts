import { MongoClient, Db, Collection, ObjectId } from "mongodb";

const uri = process.env.MONGO_URI || "";
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  // Allow global `var` declarations in TypeScript
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!uri) {
  console.warn("[MongoDB] Warning: MONGO_URI environment variable is not defined.");
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export async function getDb(): Promise<Db> {
  const c = await clientPromise;
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
  userId: string; // string representation of user's _id
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

export default clientPromise;
