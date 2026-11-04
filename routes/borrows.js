import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyJWT } from "../middleware/verifyJWT.js";

const router = Router();
const books = () => getDB().collection("books");
const borrows = () => getDB().collection("borrows");

const BORROW_DAYS = 14;

router.use(verifyJWT);

// POST /borrows
router.post("/", async (req, res) => {
  const { bookId } = req.body;
  const { email: userEmail, name: userName } = req.user;

  if (!ObjectId.isValid(bookId)) {
    return res.status(400).send({ message: "A valid book id is required." });
  }

  // 1) No double borrow
  const existing = await borrows().findOne({ bookId, userEmail });
  if (existing) {
    return res.status(409).send({ message: "You have already borrowed this book." });
  }

  // 2) Take one copy (only if copies > 0)
  const book = await books().findOneAndUpdate(
    { _id: new ObjectId(bookId), copies: { $gt: 0 } },
    { $inc: { copies: -1 } },
    { returnDocument: "before" }
  );

  if (!book) {
    const exists = await books().findOne({ _id: new ObjectId(bookId) });
    return exists
      ? res.status(400).send({ message: "No copies of this book are available right now." })
      : res.status(404).send({ message: "Book not found." });
  }

  // 3) Save the borrow
  const borrowDate = new Date();
  const returnDate = new Date(borrowDate);
  returnDate.setDate(returnDate.getDate() + BORROW_DAYS);

  const borrow = {
    bookId,
    bookTitle: book.title,
    bookImage: book.image,
    userName,
    userEmail,
    borrowDate,
    returnDate,
  };

  try {
    const result = await borrows().insertOne(borrow);
    res.status(201).send({ ...borrow, _id: result.insertedId });
  } catch (err) {
    // give the copy back if saving failed
    await books().updateOne({ _id: new ObjectId(bookId) }, { $inc: { copies: 1 } });
    if (err.code === 11000) {
      return res.status(409).send({ message: "You have already borrowed this book." });
    }
    throw err;
  }
});

// GET /borrows  (only the logged in user's borrows)
router.get("/", async (req, res) => {
  const list = await borrows()
    .find({ userEmail: req.user.email })
    .sort({ borrowDate: -1 })
    .toArray();
  res.send(list);
});

// DELETE /borrows/:id  (return a book, owner only)
router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    return res.status(400).send({ message: "Invalid borrow id." });
  }
  const _id = new ObjectId(req.params.id);

  const borrow = await borrows().findOne({ _id });
  if (!borrow) return res.status(404).send({ message: "Borrow record not found." });
  if (borrow.userEmail !== req.user.email) {
    return res.status(403).send({ message: "Forbidden: this is not your borrow." });
  }

  await borrows().deleteOne({ _id });

  // give the copy back
  if (ObjectId.isValid(borrow.bookId)) {
    await books().updateOne({ _id: new ObjectId(borrow.bookId) }, { $inc: { copies: 1 } });
  }

  res.send({ message: "Book returned." });
});

export default router;