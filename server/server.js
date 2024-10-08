const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    // origin: process.env.FRONTEND_URL,
    origin: ["http://localhost:63001", "http://127.0.0.1:63001"],
    credentials: true,
  },
});

// console.log("CORS whitelist: ", process.env.FRONTEND_URL);

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("MySQL connected...");
});

// Create User Table if not exists
db.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('submitter', 'resolver') NOT NULL
  )
`);

// Create Request Table if not exists
db.query(`
  CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status ENUM('pending', 'in progress', 'resolved') NOT NULL,
    submitter_id INT NOT NULL,
    FOREIGN KEY (submitter_id) REFERENCES users(id)
  )
`);

const JWT_SECRET = "your_jwt_secret"; // Replace with a secure secret

// Signup Endpoint
app.post("/signup", async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
  db.query(sql, [username, hashedPassword, role], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json({ message: "User registered successfully" });
  });
});

// Login Endpoint
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ?";
  db.query(sql, [username], async (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    if (result.length > 0) {
      const user = result[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
          expiresIn: "1h",
        });
        res.json({
          message: "Login successful",
          token,
          username: user.username,
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });
});

// Logout Endpoint
app.post("/logout", (req, res) => {
  // Since JWTs are stateless, we cannot invalidate a token directly.
  // Instead, we can remove the token from the client-side storage.
  res.json({ message: "Logout successful" });
});

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  if (!token) {
    return res.status(403).json({ error: "No token provided" });
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ error: "Failed to authenticate token: " + err });
    }
    req.user = decoded;
    next();
  });
};

// Fetch All Requests Endpoint
app.get("/requests", verifyToken, (req, res) => {
  const sql = "SELECT * FROM requests";
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    res.json({ requests: result });
  });
});

// Create Request Endpoint
app.post("/request", verifyToken, (req, res) => {
  const { title, status } = req.body;
  const submitter_id = req.user.id;
  const sql =
    "INSERT INTO requests (title, status, submitter_id) VALUES (?, ?, ?)";
  db.query(sql, [title, status, submitter_id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    io.emit("newRequest", { id: result.insertId, title, status, submitter_id });
    res.json({ message: "Request created successfully" });
  });
});

// Update Request Status Endpoint
app.put("/request/:id", verifyToken, (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  const sql = "UPDATE requests SET status = ? WHERE id = ?";
  db.query(sql, [status, id], (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
    io.emit("statusUpdate", { id, status });
    res.json({ message: "Request status updated successfully" });
  });
});

io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 63000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
