import { MongoClient } from "mongodb";

let db;

export async function connectDB() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || "booknook");

  // one user can borrow the same book only once at a time
  await db
    .collection("borrows")
    .createIndex({ bookId: 1, userEmail: 1 }, { unique: true });

  console.log("Connected to MongoDB");
  return db;
}

export function getDB() {
  if (!db) throw new Error("Database is not connected yet");
  return db;
}