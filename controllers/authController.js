const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
require('dotenv').config();

let loginAttempts = {}; // บันทึกความพยายามในการล็อคอิน

exports.register = async (req, res) => {
  const { email, username, password, securityQuestion, securityAnswer } = req.body;

  User.findByEmailOrUsernameExact(email, username, async (err, results) => {
    if (results.length > 0) {
      return res.status(400).send('อีเมลหรือชื่อผู้ใช้มีอยู่แล้ว กรุณาใช้อีเมลหรือชื่อผู้ใช้อื่น');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedSecurityAnswer = await bcrypt.hash(securityAnswer, 10);
    User.create({ email, username, password: hashedPassword, security_question: securityQuestion, security_answer: hashedSecurityAnswer }, (err) => {
      if (err) return res.status(500).send('การลงทะเบียนล้มเหลว กรุณาลองใหม่ภายหลัง');
      res.status(201).send('ลงทะเบียนผู้ใช้สำเร็จ');
    });
  });
};

exports.login = (req, res) => {
  const { emailOrUsername, password, rememberMe } = req.body;
  const key = emailOrUsername;

  // ตรวจสอบจำนวนความพยายามในการล็อคอิน
  if (loginAttempts[key] && loginAttempts[key] >= 5) {
    return res.status(403).send('มีการล็อคอินล้มเหลวหลายครั้งเกินไป กรุณาลองใหม่ภายหลัง');
  }

  User.findByEmailOrUsername(emailOrUsername, async (err, results) => {
    if (err || results.length === 0) {
      loginAttempts[key] = (loginAttempts[key] || 0) + 1;
      return res.status(401).send('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
    }
    const user = results[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      loginAttempts[key] = (loginAttempts[key] || 0) + 1;
      return res.status(401).send('ข้อมูลเข้าสู่ระบบไม่ถูกต้อง');
    }

    // รีเซ็ตจำนวนความพยายามในการล็อคอินเมื่อสำเร็จ
    loginAttempts[key] = 0;

    const tokenOptions = rememberMe ? {} : { expiresIn: '1h' };
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, tokenOptions);
    res.json({ token });
  });
};

exports.resetPassword = async (req, res) => {
  const { email, securityAnswer, newPassword } = req.body;
  User.findSecurityQuestion(email, async (err, results) => {
    if (err || results.length === 0) return res.status(404).send('ไม่พบผู้ใช้');
    const user = results[0];
    const validAnswer = await bcrypt.compare(securityAnswer, user.security_answer);
    if (!validAnswer) return res.status(401).send('คำตอบคำถามลับไม่ถูกต้อง');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    User.updatePassword(email, hashedPassword, (err) => {
      if (err) return res.status(500).send('การรีเซ็ตรหัสผ่านล้มเหลว');
      res.send('รีเซ็ตรหัสผ่านสำเร็จ');
    });
  });
};