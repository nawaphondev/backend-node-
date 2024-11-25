const mysql = require('mysql');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('การเชื่อมต่อฐานข้อมูลล้มเหลว: ' + err.stack);
    return;
  }
  console.log('เชื่อมต่อฐานข้อมูล MySQL สำเร็จ');
});

module.exports = db;