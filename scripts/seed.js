import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import "dotenv/config";
import { connectDB, getDB } from "../config/db.js";

const cover = (isbn) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;

const owner = {
  userName: process.env.SEED_NAME || "BookNook Library",
  userEmail: process.env.SEED_EMAIL || "library@booknook.app",
};

const books = [
  { title: "The Midnight Library", author: "Matt Haig", category: "Fiction", isbn: "9780525559474", copies: 4, date: "2026-10-20", description: "Between life and death sits a library where every book is a different life Nora could have lived. A warm, hopeful story about regret and second chances." },
  { title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", isbn: "9780553380163", copies: 2, date: "2026-10-05", description: "A clear tour of black holes, the Big Bang and the nature of time, written for readers with no physics background." },
  { title: "Sapiens", author: "Yuval Noah Harari", category: "History", isbn: "9780062316097", copies: 3, date: "2026-10-08", description: "How a small ape became the ruler of the planet, told through farming, money, empires and belief." },
  { title: "The Little Prince", author: "Antoine de Saint-Exupéry", category: "Kids", isbn: "9780156012195", copies: 5, date: "2026-09-28", description: "A pilot meets a young prince from a tiny planet and learns what really matters in life." },
  { title: "Atomic Habits", author: "James Clear", category: "Others", isbn: "9780735211292", copies: 3, date: "2026-10-02", description: "A practical guide to building good habits and breaking bad ones through small daily changes." },
  { title: "Cosmos", author: "Carl Sagan", category: "Science", isbn: "9780345539434", copies: 1, date: "2026-09-20", description: "A journey through space and time that explains how humans came to understand the universe." },
  { title: "Dune", author: "Frank Herbert", category: "Fiction", isbn: "9780441013593", copies: 3, date: "2026-10-25", description: "On the desert planet Arrakis, a young heir is swept into a war over the most valuable substance in the universe." },
  { title: "1984", author: "George Orwell", category: "Fiction", isbn: "9780451524935", copies: 2, date: "2026-10-18", description: "A chilling story of a man who dares to think freely in a world watched by Big Brother." },
  { title: "The Selfish Gene", author: "Richard Dawkins", category: "Science", isbn: "9780198788607", copies: 2, date: "2026-10-14", description: "A classic that looks at evolution from the point of view of genes, not animals." },
  { title: "Guns, Germs, and Steel", author: "Jared Diamond", category: "History", isbn: "9780393317558", copies: 3, date: "2026-10-10", description: "Why some societies grew powerful while others did not, explained through geography, crops and disease." },
  { title: "Charlotte's Web", author: "E. B. White", category: "Kids", isbn: "9780064400558", copies: 4, date: "2026-10-22", description: "A clever spider saves her friend Wilbur the pig in this gentle story about friendship." },
  { title: "Deep Work", author: "Cal Newport", category: "Others", isbn: "9781455586691", copies: 2, date: "2026-10-28", description: "How to focus without distraction and produce your best work in a noisy world." },
];

async function seed() {
  await connectDB();
  const col = getDB().collection("books");

  // remove old seeded books so the script can be run again safely
  await col.deleteMany({ seed: true });

  const docs = books.map(({ isbn, date, ...b }) => ({
    ...b,
    image: cover(isbn),
    ...owner,
    createdAt: new Date(date),
    seed: true,
  }));

  const result = await col.insertMany(docs);
  console.log(`Seeded ${result.insertedCount} books`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});