import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const router = Router();
const books = () => getDB().collection("books");

const categories = ["Fiction", "Science", "History", "Kids", "Others"];

// GET /books?category=Kids&email=a@b.com&limit=6  (public)
router.get("/", async (req, res) => {
  const { category, email, limit } = req.query;

  const filter = {};
  if (category && category !== "All") filter.category = category;
  if (email) filter.userEmail = email;

  let cursor = books().find(filter).sort({ createdAt: -1 });
  const n = Number(limit);
  if (n > 0) cursor = cursor.limit(n);

  res.send(await cursor.toArray());
});

// GET /books/:id
router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }
  const book = await books().findOne({ _id: new ObjectId(req.params.id) });
  if (!book) return res.status(404).send({ message: "Book not found." });
  res.send(book);
});

// POST /books
router.post("/", async (req, res) => {
  const { title, author, category, image, description, copies, userName, userEmail } = req.body;

  if (!title || !author || !image || !description || !userEmail) {
    return res.status(400).send({ message: "Please fill in all required fields." });
  }
  if (!categories.includes(category)) {
    return res.status(400).send({ message: "Invalid category." });
  }
  const totalCopies = Number(copies);
  if (!Number.isInteger(totalCopies) || totalCopies < 1) {
    return res.status(400).send({ message: "Total copies must be at least 1." });
  }

  const book = {
    title: title.trim(),
    author: author.trim(),
    category,
    image,
    description: description.trim(),
    copies: totalCopies,
    userName,
    userEmail,
    createdAt: new Date(),
  };

  const result = await books().insertOne(book);
  res.status(201).send({ ...book, _id: result.insertedId });
});

// PATCH /books/:id
router.patch("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }

  const allowed = ["title", "author", "category", "image", "description", "copies"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.copies !== undefined) updates.copies = Number(updates.copies);

  const result = await books().findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: updates },
    { returnDocument: "after" }
  );
  if (!result) return res.status(404).send({ message: "Book not found." });
  res.send(result);
});

// DELETE /books/:id
router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }
  const result = await books().deleteOne({ _id: new ObjectId(req.params.id) });
  if (result.deletedCount === 0) {
    return res.status(404).send({ message: "Book not found." });
  }
  res.send({ message: "Book deleted." });
});

export default router;