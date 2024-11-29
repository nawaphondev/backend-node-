const express = require("express");
const {
  register,
  login,
  resetPassword,
  requestResetPassword,
} = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");
const db = require('../config/db');
const router = express.Router();

// เส้นทางที่ไม่ต้องล็อกอิน
router.post("/register", register);
router.post("/login", login);
router.post("/request-reset-password", requestResetPassword);
router.patch("/reset-password/:token", resetPassword);

// เส้นทางที่ต้องล็อกอิน // ใช้งาน Middleware ในเส้นทาง
router.get('/dashboard', authenticate, (req, res) => {
  const userId = req.user.id;

  const query = 'SELECT username FROM users WHERE id = ?';
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(`Error in /dashboard route: ${err.message}`);
      return res
        .status(500)
        .json({ error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลแดชบอร์ด' });
    }

    if (results.length > 0) {
      const username = results[0].username;
      res.status(200).json({ message: `ยินดีต้อนรับคุณ ${username}!` });
    } else {
      res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
    }
  });
});

// เพิ่มเส้นทางสำหรับ logout
router.post("/logout", authenticate, (req, res) => {
  res.status(200).json({ message: "คุณออกจากระบบสำเร็จ" });
});

module.exports = router;
