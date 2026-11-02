import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);


import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import bookRoutes from "./routes/books.js";

import borrowRoutes from "./routes/borrows.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("BookNook API is running...");
});

app.use("/books", bookRoutes);

app.use("/borrows", borrowRoutes);          

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send({ message: "Something went wrong on the server." });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });

