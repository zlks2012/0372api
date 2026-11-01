const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_FILE = path.join(__dirname, "data.json");

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return {
      users: [],
      sessions: {},
      apiKeys: [],
      announcements: [
        { id: 1, title: "Welcome to 0372api.top", content: "AI API Gateway is ready.", created_at: new Date().toISOString() },
      ],
      groups: [
        { id: 1, name: "default", description: "Default model group", ratio: 1.0, models: ["gpt-4o", "claude-3-opus", "claude-3-sonnet"], status: "enabled" },
      ],
      channels: [],
      usageLogs: [],
      nextUserId: 1,
      nextKeyId: 1,
      nextChannelId: 1,
      settings: {},
      redeemCodes: [],
      promoCodes: [],
      plans: [],
    };
  }
}

function save(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(test));
}

function generateToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function generateApiKey() {
  return "sk-0372-" + crypto.randomBytes(24).toString("base64url");
}

function generateId() {
  return crypto.randomBytes(8).toString("hex");
}


// Rate limiting: track failed login attempts per IP/email
const loginAttempts = {};
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function isLockedOut(key) {
  const record = loginAttempts[key];
  if (!record) return false;
  if (record.count >= MAX_ATTEMPTS && Date.now() - record.lastAttempt < LOCKOUT_MS) return true;
  if (record.count >= MAX_ATTEMPTS && Date.now() - record.lastAttempt >= LOCKOUT_MS) {
    delete loginAttempts[key];
    return false;
  }
  return false;
}

function recordFailedAttempt(key) {
  if (!loginAttempts[key]) loginAttempts[key] = { count: 0, lastAttempt: 0 };
  loginAttempts[key].count++;
  loginAttempts[key].lastAttempt = Date.now();
}

function clearFailedAttempts(key) {
  delete loginAttempts[key];
}

// Session expiry: clean up sessions older than 24 hours
function cleanExpiredSessions(db) {
  const now = Date.now();
  const SESSION_TTL = 24 * 60 * 60 * 1000;
  let cleaned = false;
  for (const [token, session] of Object.entries(db.sessions)) {
    if (now - new Date(session.created_at).getTime() > SESSION_TTL) {
      delete db.sessions[token];
      cleaned = true;
    }
  }
  return cleaned;
}

module.exports = { load, save, hashPassword, verifyPassword, generateToken, generateApiKey, generateId, isLockedOut, recordFailedAttempt, clearFailedAttempts, cleanExpiredSessions };
