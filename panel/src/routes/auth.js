const express = require("express");
const bcrypt = require("bcryptjs");
const config = require("../config");
const { generateToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

// Hash password on first load (avoid plaintext comparison)
let hashedPassword = null;

async function getHashedPassword() {
  if (!hashedPassword) {
    hashedPassword = await bcrypt.hash(config.auth.password, 10);
  }
  return hashedPassword;
}

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    // Check username
    if (username !== config.auth.username) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check password (compare with env var directly for simplicity)
    // In production, store hashed passwords
    if (password !== config.auth.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(username);

    // Set HTTP-only cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000 // 24h
    });

    res.json({ success: true, token });
  } catch (e) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

// Check auth status
router.get("/status", requireAuth, (req, res) => {
  res.json({ 
    authenticated: true, 
    username: req.user.username 
  });
});

// Warn if using default credentials
router.get("/check-defaults", (req, res) => {
  const usingDefaults = 
    config.auth.username === "admin" && 
    config.auth.password === "admin";
  
  res.json({ usingDefaults });
});

module.exports = router;
