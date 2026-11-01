const http = require("http");
const fs = require("fs");
const path = require("path");
const { load, save, hashPassword, verifyPassword, generateToken, generateApiKey, generateId, isLockedOut, recordFailedAttempt, clearFailedAttempts, cleanExpiredSessions } = require("./db");
const { handleAdmin } = require("./admin");

const PORT = 3000;
const PUBLIC_SETTINGS = {
  code: 0,
  message: "success",
  data: {
    registration_enabled: true,
    email_verify_enabled: false,
    force_email_on_third_party_signup: false,
    registration_email_suffix_whitelist: ["@gmail.com", "@outlook.com", "@qq.com", "@163.com", "@foxmail.com"],
    registration_email_domain_quota_enabled: false,
    promo_code_enabled: false,
    password_reset_enabled: true,
    invitation_code_enabled: false,
    totp_enabled: false,
    passkey_enabled: false,
    login_agreement_enabled: false,
    turnstile_enabled: false,
    tencent_captcha_enabled: false,
    aliyun_captcha_enabled: false,
    site_name: "0372api",
    site_logo: "",
    site_subtitle: "AI API Gateway",
    api_base_url: "http://0372api.top",
    doc_url: "",
    contact_info: "",
    compact_home_enabled: false,
    purchase_subscription_enabled: true,
    payment_enabled: true,
    payment_balance_disabled: false,
    version: "1.0.0-0372api",
    server_timezone: "Asia/Shanghai",
    balance_low_notify_enabled: true,
    channel_monitor_enabled: true,
    available_channels_enabled: true,
    subscription_enabled: true,
    model_plaza_enabled: true,
    model_plaza_require_auth: false,
    plugin_management_enabled: false,
    affiliate_enabled: true,
    risk_control_enabled: false,
    backend_mode_enabled: false,
    custom_menu_items: [],
    table_default_page_size: 20,
    table_page_size_options: [10, 20, 50],
  },
};

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
    req.on("error", reject);
  });
}

function getAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const db = load();
  const session = db.sessions[token];
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.user_id);
  return user ? { user, token, db } : null;
}

function requireAuth(req) {
  const auth = getAuth(req);
  if (!auth) return null;
  return auth;
}

function requireAdmin(req) {
  const auth = requireAuth(req);
  if (!auth || auth.user.role !== "admin") return null;
  return auth;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
    });
    return res.end();
  }

  try {
    // === Public settings ===
    if (p === "/api/v1/settings/public" && method === "GET") return json(res, 200, PUBLIC_SETTINGS);

    // === Auth ===
    if (p === "/api/v1/auth/register" && method === "POST") {
      const body = await readBody(req);
      const db = load();
      if (!body.email || !body.password || body.password.length < 6)
        return json(res, 400, { code: 400, message: "Email and password (min 6 chars) required" });
      if (db.users.find((u) => u.email === body.email))
        return json(res, 409, { code: 409, message: "Email already registered", reason: "EMAIL_ALREADY_EXISTS" });
      const isFirst = db.users.length === 0;
      const user = {
        id: db.nextUserId++,
        email: body.email,
        username: body.email.split("@")[0],
        password_hash: hashPassword(body.password),
        role: isFirst ? "admin" : "user",
        balance: isFirst ? 1000 : 0,
        quota: 500000,
        used_quota: 0,
        group: "default",
        status: "active",
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
      const token = generateToken();
      db.sessions[token] = { user_id: user.id, created_at: new Date().toISOString() };
      save(db);
      return json(res, 200, {
        code: 0,
        message: "success",
        data: { access_token: token, token_type: "bearer", expires_in: 86400, user: { id: user.id, email: user.email, username: user.username, role: user.role, balance: user.balance } },
      });
    }

    if (p === "/api/v1/auth/login" && method === "POST") {
      const body = await readBody(req);
      const lockKey = (req.socket.remoteAddress || "unknown") + ":" + (body.email || "");
      if (isLockedOut(lockKey)) {
        return json(res, 429, { code: 429, message: "too many failed attempts. Try again in 15 minutes." });
      }
      const db = load();
      cleanExpiredSessions(db);
      const user = db.users.find((u) => u.email === body.email);
      if (!user || !verifyPassword(body.password || "", user.password_hash)) {
        recordFailedAttempt(lockKey);
        return json(res, 401, { code: 401, message: "invalid email or password", reason: "INVALID_CREDENTIALS" });
      }
      clearFailedAttempts(lockKey);
      const token = generateToken();
      db.sessions[token] = { user_id: user.id, created_at: new Date().toISOString() };
      save(db);
      return json(res, 200, {
        code: 0,
        message: "success",
        data: { access_token: token, token_type: "bearer", expires_in: 86400, user: { id: user.id, email: user.email, username: user.username, role: user.role, balance: user.balance } },
      });
    }

    if (p === "/api/v1/auth/me" && method === "GET") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      const { user } = auth;
      return json(res, 200, { code: 0, data: { id: user.id, email: user.email, username: user.username, role: user.role, balance: user.balance, quota: user.quota, used_quota: user.used_quota, group: user.group, status: user.status, created_at: user.created_at } });
    }

    if (p === "/api/v1/auth/logout" && method === "POST") {
      const auth = getAuth(req);
      if (auth) {
        delete auth.db.sessions[auth.token];
        save(auth.db);
      }
      return json(res, 200, { code: 0, message: "success" });
    }

    // === Setup status ===
    if (p === "/api/v1/setup/status" && method === "GET")
      return json(res, 200, { code: 0, data: { needs_setup: false, step: "completed" } });

    // === Announcements ===
    if (p === "/api/v1/announcements" && method === "GET") {
      const db = load();
      return json(res, 200, { code: 0, data: db.announcements });
    }

    // === Groups ===
    if (p === "/api/v1/groups/available" && method === "GET") {
      const db = load();
      return json(res, 200, { code: 0, data: db.groups.filter((g) => g.status === "enabled") });
    }

    if (p === "/api/v1/channels/available" && method === "GET") {
      const db = load();
      return json(res, 200, { code: 0, data: db.channels.filter((c) => c.status === "enabled") });
    }

    // === API Keys (user) ===
    if (p === "/api/v1/keys" && method === "GET") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      const keys = auth.db.apiKeys.filter((k) => k.user_id === auth.user.id);
      return json(res, 200, { code: 0, data: keys, total: keys.length });
    }

    if (p === "/api/v1/keys" && method === "POST") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      const body = await readBody(req);
      const key = {
        id: auth.db.nextKeyId++,
        user_id: auth.user.id,
        name: body.name || "unnamed",
        key: generateApiKey(),
        group: body.group || auth.user.group,
        status: "active",
        used_quota: 0,
        request_count: 0,
        created_at: new Date().toISOString(),
      };
      auth.db.apiKeys.push(key);
      save(auth.db);
      return json(res, 200, { code: 0, data: key });
    }

    if (p.startsWith("/api/v1/keys/") && method === "DELETE") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      const keyId = parseInt(p.split("/")[4]);
      const idx = auth.db.apiKeys.findIndex((k) => k.id === keyId && k.user_id === auth.user.id);
      if (idx < 0) return json(res, 404, { code: 404, message: "key not found" });
      auth.db.apiKeys.splice(idx, 1);
      save(auth.db);
      return json(res, 200, { code: 0, message: "deleted" });
    }

    if (p === "/api/v1/keys/usage-notice" && method === "GET")
      return json(res, 200, { code: 0, data: { notice: "" } });

    // === Usage ===
    if (p === "/api/v1/usage" && method === "GET") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      const logs = auth.db.usageLogs.filter((l) => l.user_id === auth.user.id);
      return json(res, 200, { code: 0, data: logs, total: logs.length, stats: { total_requests: logs.length, total_tokens: 0, total_cost: 0 } });
    }

    // === Subscriptions ===
    if (p === "/api/v1/subscriptions" && method === "GET") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      return json(res, 200, { code: 0, data: [] });
    }

    if (p === "/api/v1/user/network" && method === "GET") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      return json(res, 200, { code: 0, data: { ip: req.socket.remoteAddress, vpn: false, proxy: false } });
    }

    // === Admin routes ===
    if (p.startsWith("/api/v1/admin/")) {
      const auth = requireAuth(req);
      if (!auth || auth.user.role !== "admin") return json(res, 403, { code: 403, message: "forbidden" });
      return handleAdmin(req, res, p, method);
    }

    // === Redeem Code Usage ===
    if (p === "/api/v1/redeem" && method === "POST") {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      const body = await readBody(req);
      if (!body.code) return json(res, 400, { code: 400, message: "code required" });
      const db = load();
      if (!db.redeemCodes) db.redeemCodes = [];
      const rc = db.redeemCodes.find((r) => r.code === body.code && r.status === "unused");
      if (!rc) return json(res, 404, { code: 404, message: "invalid or already used code" });
      rc.status = "used";
      rc.used_by = auth.user.id;
      rc.used_at = new Date().toISOString();
      auth.user.balance += rc.amount;
      const userIdx = db.users.findIndex((u) => u.id === auth.user.id);
      if (userIdx >= 0) db.users[userIdx].balance = auth.user.balance;
      save(db);
      return json(res, 200, { code: 0, message: "success", data: { amount: rc.amount, new_balance: auth.user.balance } });
    }

    // === Placeholder for other authenticated endpoints (known routes) ===
    if (p.startsWith("/api/v1/") && !p.startsWith("/api/v1/settings") && !p.startsWith("/api/v1/auth") && !p.startsWith("/api/v1/setup")) {
      const auth = requireAuth(req);
      if (!auth) return json(res, 401, { code: 401, message: "unauthorized" });
      return json(res, 200, { code: 0, data: [], message: "success" });
    }

    return json(res, 404, { code: 404, message: "not found" });
  } catch (err) {
    console.error("Error:", err);
    return json(res, 500, { code: 500, message: "internal server error" });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`API server running on http://0.0.0.0:${PORT}`);
});
