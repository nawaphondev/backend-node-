const express = require("express");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors()); // Allows all origins by default

// Prevent caching
app.use((req, res, next) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

// Parse incoming JSON requests
app.use(express.json());

// Register auth routes
app.use("/api/auth", authRoutes);

// Handle 404 errors
app.use((req, res, next) => {
  res.status(404).json({ error: "เส้นทางที่คุณเรียกไม่มีอยู่ในระบบ" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack); // Log error stack
  res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
