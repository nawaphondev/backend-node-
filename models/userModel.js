const db = require('../config/db');

const User = {
  create: (userData, callback) => {
    const query = 'INSERT INTO users SET ?';
    db.query(query, userData, callback);
  },
  findByEmailOrUsername: (emailOrUsername, callback) => {
    const query = 'SELECT * FROM users WHERE email = ? OR username = ?';
    db.query(query, [emailOrUsername, emailOrUsername], callback);
  },
  findByEmailOrUsernameExact: (email, username, callback) => {
    const query = 'SELECT * FROM users WHERE email = ? OR username = ?';
    db.query(query, [email, username], callback);
  },
  updatePassword: (email, newPassword, callback) => {
    const query = 'UPDATE users SET password = ? WHERE email = ?';
    db.query(query, [newPassword, email], callback);
  },
  findSecurityQuestion: (email, callback) => {
    const query = 'SELECT security_question, security_answer FROM users WHERE email = ?';
    db.query(query, [email], callback);
  }
};

module.exports = User;