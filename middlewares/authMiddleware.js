const jwt = require("jsonwebtoken");
require("dotenv").config();

exports.verifyToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(403).send("การเข้าถึงถูกปฏิเสธ");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send("โทเค็นไม่ถูกต้อง");
  }
};

exports.authenticate = (req, res, next) => {
  try {
    const bearerHeader = req.headers["authorization"];
    if (!bearerHeader || !bearerHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "คุณยังไม่ได้เข้าสู่ระบบ กรุณาเข้าสู่ระบบก่อน" });
    }

    const token = bearerHeader.split(" ")[1]; // ย้ายมาอยู่ในฟังก์ชัน
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res
            .status(401)
            .json({ error: "โทเค็นหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
        }
        return res
          .status(401)
          .json({ error: "โทเค็นไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่" });
      }
      req.user = decoded;
      next();
    });
  } catch (err) {
    console.error(
      `Unexpected error in authenticate middleware: ${err.message}`
    );
    res
      .status(500)
      .json({ error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
  }
};

exports.logout = (req, res) => {
  // การทำงานจริงอาจเป็นการล้างโทเค็นฝั่งไคลเอนต์
  res.status(200).json({ message: "คุณออกจากระบบสำเร็จ" });
};
