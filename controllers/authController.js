const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userModel");
const formData = require("form-data");
const Mailgun = require("mailgun.js");
require("dotenv").config();

let loginAttempts = {}; // บันทึกความพยายามในการล็อคอิน
const lockoutDuration = 2 * 60 * 1000; // 2 นาที

exports.register = (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร" });
  }

  User.findByEmailOrUsernameExact(email, username, async (err, results) => {
    if (err) {
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการค้นหาผู้ใช้" });
    }
    if (results.length > 0) {
      return res.status(400).json({
        error: "อีเมลหรือชื่อผู้ใช้มีอยู่แล้ว กรุณาใช้อีเมลหรือชื่อผู้ใช้อื่น",
      });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      User.create(
        {
          email,
          username,
          password: hashedPassword,
        },
        (createErr) => {
          if (createErr) {
            return res
              .status(500)
              .json({ error: "การลงทะเบียนล้มเหลว กรุณาลองใหม่ภายหลัง" });
          }
          res.status(201).json({ message: "ลงทะเบียนผู้ใช้สำเร็จ" });
        }
      );
    } catch (err) {
      res
        .status(500)
        .json({ error: "การลงทะเบียนล้มเหลว กรุณาลองใหม่ภายหลัง" });
    }
  });
};

exports.login = (req, res) => {
  const { emailOrUsername, password, rememberMe } = req.body;

  // คำนวณอายุโทเค็นตาม rememberMe
  const tokenOptions = rememberMe ? { expiresIn: "7d" } : { expiresIn: "1h" };

  // ค้นหาผู้ใช้ในฐานข้อมูล
  User.findByEmailOrUsername(emailOrUsername, async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ error: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" });
    }

    const user = results[0];
    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" });
      }

      // สร้างโทเค็น
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        tokenOptions
      );
      res.json({ token });
    } catch (compareErr) {
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน" });
    }
  });
};

exports.resetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "กรุณากรอกอีเมล" });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้ที่มีอีเมลนี้" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 นาที

    await User.updateResetToken(user.id, hashedResetToken, resetTokenExpiry);

    const resetLink = `${req.protocol}://${req.get(
      "host"
    )}/reset-password?token=${resetToken}`;
    const message = `กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ:

${resetLink}

ลิงค์รีเซ็ตรหัสผ่านนี้จะใช้ได้เพียง 10 นาทีเท่านั้น`;

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY || "key-yourkeyhere" });

    mg.messages.create(process.env.MAILGUN_DOMAIN || 'sandbox-123.mailgun.org', {
      from: "Excited User <mailgun@sandboxe342a32e28154cb496ad46c9a3b7db20.mailgun.org>",
      to: [user.email],
      subject: "ได้รับคำขอเปลี่ยนรหัสผ่านแล้ว",
      text: message,
      html: `<h1>กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ:</h1><p>${resetLink}</p><p>ลิงค์รีเซ็ตรหัสผ่านนี้จะใช้ได้เพียง 10 นาทีเท่านั้น</p>`
    })
    .then(() => {
      res.status(200).json({ message: "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของผู้ใช้สำเร็จ" });
    })
    .catch((error) => {
      console.error("เกิดข้อผิดพลาดในการส่งอีเมล", error);
      res.status(500).json({ error: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง" });
    });
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน" });
  }
};

exports.requestResetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "กรุณากรอกอีเมล" });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้ที่มีอีเมลนี้" });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpiry = Date.now() + 10 * 60 * 1000; // 10 นาที

    await User.updateResetToken(user.id, hashedResetToken, resetTokenExpiry);

    const resetLink = `${req.protocol}://${req.get(
      "host"
    )}/reset-password/${resetToken}`;
    const message = `กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ:

${resetLink}

ลิงค์รีเซ็ตรหัสผ่านนี้จะใช้ได้เพียง 10 นาทีเท่านั้น`;

    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: "api", key: process.env.MAILGUN_API_KEY || "key-yourkeyhere" });

    mg.messages.create(process.env.MAILGUN_DOMAIN || 'sandbox-123.mailgun.org', {
      from: "Excited User <mailgun@sandboxe342a32e28154cb496ad46c9a3b7db20.mailgun.org>",
      to: [user.email],
      subject: "ได้รับคำขอเปลี่ยนรหัสผ่านแล้ว",
      text: message,
      html: `<h1>กรุณาคลิกลิงก์ด้านล่างเพื่อรีเซ็ตรหัสผ่านของคุณ:</h1><p>${resetLink}</p><p>ลิงค์รีเซ็ตรหัสผ่านนี้จะใช้ได้เพียง 10 นาทีเท่านั้น</p>`
    })
    .then(() => {
      res.status(200).json({ message: "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของผู้ใช้สำเร็จ" });
    })
    .catch((error) => {
      console.error("เกิดข้อผิดพลาดในการส่งอีเมล", error);
      res.status(500).json({ error: "ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง" });
    });
  } catch (err) {
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการร้องขอรีเซ็ตรหัสผ่าน" });
  }
};
