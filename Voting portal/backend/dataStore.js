/**
 * File-based storage: users and votes in separate JSON files.
 * Only hashed/secure data is stored (passwordHash, signature, encryptedPayload).
 * No plain passwords or plain ballot data in files.
 */
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const VOTES_FILE = path.join(DATA_DIR, "votes.json");
const ANNOUNCEMENT_FILE = path.join(DATA_DIR, "announcement.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadJSON(filePath, defaultValue) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

function saveJSON(filePath, data) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// --- Users: only persistent fields; password stored as hash (bcrypt), no OTP in file ---
function loadUsers() {
  const list = loadJSON(USERS_FILE, []);
  return list.map((u) => ({
    ...u,
    otp: null,
    otpExpiry: null,
  }));
}

function saveUsers(users) {
  const toSave = users.map(({ roll, email, passwordHash, role, hasVoted }) => ({
    roll,
    email,
    passwordHash,
    role,
    hasVoted,
  }));
  saveJSON(USERS_FILE, toSave);
}

// --- Votes: voterRoll, candidate, signature (hash), encryptedPayload (encrypted) ---
function loadVotes() {
  return loadJSON(VOTES_FILE, []);
}

function saveVotes(votes) {
  saveJSON(VOTES_FILE, votes);
}

// --- Announcement: results + signature ---
function loadAnnouncement() {
  return loadJSON(ANNOUNCEMENT_FILE, null);
}

function saveAnnouncement(announcement) {
  saveJSON(ANNOUNCEMENT_FILE, announcement);
}

module.exports = {
  loadUsers,
  saveUsers,
  loadVotes,
  saveVotes,
  loadAnnouncement,
  saveAnnouncement,
  DATA_DIR,
  USERS_FILE,
  VOTES_FILE,
  ANNOUNCEMENT_FILE,
};
