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

module.exports = { load, save, hashPassword, verifyPassword, generateToken, generateApiKey, generateId };
