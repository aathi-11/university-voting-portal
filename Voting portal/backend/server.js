/**
 * University Voters Portal - Backend (no MongoDB)
 * 23CSE313 Lab Evaluation: Authentication, Authorization, Encryption, Hashing, Encoding, Digital Signature
 * Registration/Login aligned with NIST SP 800-63-2 E-Authentication
 * Users and votes stored in separate JSON files (data with hashing only).
 */

// 1. Initialize environment variables immediately
require('dotenv').config(); 

const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { sendOTPEmail } = require("./emailService");
const {
  deriveVoteKey,
  encrypt,
  sign,
  verifySignature,
  encodeBase64,
  decodeBase64,
} = require("./cryptoHelpers");
const {
  checkPermission,
  getRoleFromJwtPayload,
  OBJECTS,
} = require("./accessControl");
const {
  loadUsers,
  saveUsers,
  loadVotes,
  saveVotes,
  saveAnnouncement,
} = require("./dataStore");

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// --- Load from files: users (passwordHash only), votes (signature + encryptedPayload) ---
const users = loadUsers();
let votes = loadVotes();
let announcement = null;

function findUserByRoll(roll) {
  return users.find((u) => u.roll === roll);
}

function aggregateVotesByCandidate() {
  const counts = {};
  votes.forEach((v) => {
    counts[v.candidate] = (counts[v.candidate] || 0) + 1;
  });
  return Object.entries(counts).map(([_id, count]) => ({ _id, count }));
}

// 2. Access secrets from process.env with fallbacks for development
const SECRET = process.env.JWT_SECRET || "VOTING_SECRET_KEY_CHANGE_IN_PROD";
const ADMIN_KEY = process.env.ADMIN_KEY || "ADMIN@2025";
const ENCRYPTION_SECRET = process.env.ENC_SECRET || "VOTE_ENCRYPTION_MASTER_KEY_32_BYTES!!";

const voteEncKey = deriveVoteKey(ENCRYPTION_SECRET);

// --- Middleware: JWT + Access Control ---
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.payload = jwt.verify(auth, SECRET);
    req.subject = getRoleFromJwtPayload(req.payload);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requirePermission(object) {
  return (req, res, next) => {
    if (!checkPermission(req.subject, object))
      return res.status(403).json({ error: "Forbidden: access denied by ACL" });
    next();
  };
}

// --- NIST-aligned Registration: hash + salt (bcrypt) ---
app.post("/register", async (req, res) => {
  const { roll, email, password } = req.body;
  if (!roll || !email || !password)
    return res.status(400).json({ error: "roll, email, password required" });
  if (findUserByRoll(roll)) return res.status(400).json({ error: "User already exists" });
  
  const passwordHash = await bcrypt.hash(password, 12);
  users.push({
    roll,
    email,
    passwordHash,
    role: "student",
    hasVoted: false,
    otp: null,
    otpExpiry: null,
  });
  saveUsers(users);
  res.json({ message: "Registered successfully" });
});

// --- Single-factor: password; MFA: OTP ---
app.post("/login", async (req, res) => {
  const { roll, password, adminKey } = req.body;
  const user = findUserByRoll(roll);
  
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  
  // Admin key check
  if (user.role === "admin" && adminKey !== ADMIN_KEY)
    return res.status(401).json({ error: "Invalid admin key" });
    
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minute expiry
  
  try {
    // Send OTP to user's email via Gmail
    await sendOTPEmail(user.email, otp, user.roll);
    saveUsers(users);
    res.json({ message: "OTP_SENT", roll });
  } catch (error) {
    console.error("[ERROR] OTP email failed:", error.message);
    res.status(500).json({ error: "Failed to send OTP. Please check Gmail configuration." });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { roll, otp } = req.body;
  const user = findUserByRoll(roll);
  
  if (!user || !user.otp)
    return res.status(401).json({ error: "OTP invalid or expired" });
  if (user.otpExpiry && new Date() > user.otpExpiry)
    return res.status(401).json({ error: "OTP expired" });
  if (user.otp !== otp) return res.status(401).json({ error: "OTP invalid" });
  
  const token = jwt.sign({ roll: user.roll, role: user.role }, SECRET, { expiresIn: "2h" });
  user.otp = null;
  user.otpExpiry = null;
  res.json({ token, role: user.role });
});

// --- Vote: ACL(VOTE), encryption, digital signature ---
app.post("/vote", requireAuth, requirePermission(OBJECTS.VOTE), async (req, res) => {
  const user = findUserByRoll(req.payload.roll);
  if (!user) return res.status(401).json({ error: "User not found" });
  if (user.hasVoted) return res.status(400).json({ error: "Already voted" });
  
  const candidate = req.body.candidate;
  if (!candidate) return res.status(400).json({ error: "candidate required" });

  const ballot = { voterRoll: user.roll, candidate, ts: Date.now() };
  const encryptedPayload = encrypt(JSON.stringify(ballot), voteEncKey);
  const signature = sign(ballot, SECRET);

  votes.push({
    voterRoll: user.roll,
    candidate,
    signature,
    encryptedPayload,
  });
  
  user.hasVoted = true;
  saveUsers(users);
  saveVotes(votes);
  res.json({ message: "Vote recorded" });
});

// --- Results: ACL(RESULTS), admin only ---
app.get("/results", requireAuth, requirePermission(OBJECTS.RESULTS), (req, res) => {
  res.json(aggregateVotesByCandidate());
});

// --- Announce results: ACL(ANNOUNCE), digital signature ---
app.post(
  "/announce-results",
  requireAuth,
  requirePermission(OBJECTS.ANNOUNCE),
  (req, res) => {
    const results = aggregateVotesByCandidate();
    const payload = { results, announcedAt: new Date().toISOString() };
    const signature = sign(payload, SECRET);
    
    announcement = {
      results: payload.results,
      announcedAt: payload.announcedAt,
      signature,
    };
    
    saveAnnouncement(announcement);
    res.json({ message: "Results announced", results });
  }
);

// --- Public: get announced results ---
app.get("/announced-results", (req, res) => {
  if (!announcement)
    return res.json({ announced: false, results: [] });
    
  const payload = { results: announcement.results, announcedAt: announcement.announcedAt };
  const valid = verifySignature(payload, announcement.signature, SECRET);
  
  res.json({
    announced: true,
    results: announcement.results,
    announcedAt: announcement.announcedAt,
    signatureValid: valid,
  });
});

// --- Encoding demo: Base64 (evaluation) ---
app.get("/api/encoded-token", requireAuth, (req, res) => {
  const token = req.headers.authorization;
  const encoded = encodeBase64(token || "");
  res.json({ encoded, decoded: decodeBase64(encoded) });
});

// --- Seed admin (no MongoDB - in-memory) ---
app.post("/seed-admin", async (req, res) => {
  if (users.some((u) => u.role === "admin"))
    return res.json({ message: "Admin already exists", roll: "admin1" });
    
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  const adminEmail = process.env.ADMIN_EMAIL || "admin@university.edu";
  
  users.push({
    roll: "admin1",
    email: adminEmail,
    passwordHash,
    role: "admin",
    hasVoted: false,
    otp: null,
    otpExpiry: null,
  });
  
  saveUsers(users);
  res.json({
    message: "Admin created",
    roll: "admin1",
    password: "Admin@123",
    adminKey: ADMIN_KEY,
    email: adminEmail,
  });
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`University Voters Portal API on http://localhost:${PORT} (data in backend/data/)`)
);