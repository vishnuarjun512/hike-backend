import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose"; // Changed from sequelize import
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/posts.route.js";
import friendRoutes from "./routes/friend.route.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: true, // allows requests from any origin
    credentials: true, // allow cookies, authorization headers, etc.
  })
);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/friend", friendRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:");
    console.error("Error:", error.message);
    process.exit(1);
  }
};

app.get("/", (req, res) => {
  console.log("Someone hit the API");
  res.send("API is running...");
});

// Start server only after DB connection
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
  });
});
