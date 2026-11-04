import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyJWT } from "../middleware/verifyJWT.js";

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

// GET /books/:id  (protected)
router.get("/:id", verifyJWT, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }
  const book = await books().findOne({ _id: new ObjectId(req.params.id) });
  if (!book) return res.status(404).send({ message: "Book not found." });
  res.send(book);
});

// POST /books  (protected)
router.post("/", verifyJWT, async (req, res) => {
  const { title, author, category, image, description, copies } = req.body;

  if (!title || !author || !image || !description) {
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
    userName: req.user.name, // owner comes from the token, not from the body
    userEmail: req.user.email,
    createdAt: new Date(),
  };

  const result = await books().insertOne(book);
  res.status(201).send({ ...book, _id: result.insertedId });
});

// PATCH /books/:id  (protected, owner only)
router.patch("/:id", verifyJWT, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }
  const _id = new ObjectId(req.params.id);

  const book = await books().findOne({ _id });
  if (!book) return res.status(404).send({ message: "Book not found." });
  if (book.userEmail !== req.user.email) {
    return res.status(403).send({ message: "Forbidden: you can only edit your own books." });
  }

  const allowed = ["title", "author", "category", "image", "description", "copies"];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (updates.category && !categories.includes(updates.category)) {
    return res.status(400).send({ message: "Invalid category." });
  }
  if (updates.copies !== undefined) {
    updates.copies = Number(updates.copies);
    if (!Number.isInteger(updates.copies) || updates.copies < 0) {
      return res.status(400).send({ message: "Copies must be 0 or more." });
    }
  }

  const updated = await books().findOneAndUpdate(
    { _id },
    { $set: updates },
    { returnDocument: "after" }
  );
  res.send(updated);
});

// DELETE /books/:id  (protected, owner only)
router.delete("/:id", verifyJWT, async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid book id." });
  }
  const _id = new ObjectId(req.params.id);

  const book = await books().findOne({ _id });
  if (!book) return res.status(404).send({ message: "Book not found." });
  if (book.userEmail !== req.user.email) {
    return res.status(403).send({ message: "Forbidden: you can only delete your own books." });
  }

  await books().deleteOne({ _id });
  res.send({ message: "Book deleted." });
});

export default router;
